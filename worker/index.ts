/**
 * SEO-GEO worker — claim loop.
 *
 * Responsibility : poll `audits` table for status='queued', forward each
 * candidate to processAudit() which handles the atomic claim via
 * markAuditRunning(). The claim is centralized in persist.ts so the
 * worker and the API `after()` handler use the exact same primitive
 * (UPDATE WHERE status='queued' RETURNING id) — pas de double-exécution
 * possible : un seul appelant gagne le UPDATE, l'autre voit `claimed=false`
 * et abandonne proprement.
 *
 * Design notes :
 *  - Pas de FOR UPDATE / SKIP LOCKED : non supporté par le HTTP driver
 *    Neon (sessions implicites). Le UPDATE conditionnel suffit pour
 *    notre charge V1.
 *  - Backoff + jitter on empty poll to avoid hammering the DB.
 *  - Graceful shutdown on SIGINT/SIGTERM : finish the current audit
 *    (if any) before exiting.
 */
// Charge .env.local en dev (no-op en prod où les vars viennent de Docker).
import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'
loadEnv({ path: resolve(process.cwd(), '.env.local') })

import { eq, sql, asc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { audits, benchmarks } from '@/lib/db/schema'
import { processAudit } from '@/lib/audit/process'
import {
  markBenchmarkRunning,
  fanOutBenchmarkAudits,
  tryCompleteBenchmark,
  failBenchmark,
} from '@/lib/audit/benchmark'
import { createLogger } from '@/lib/observability/logger'
import { assertEnvOrThrow } from '@/lib/env'

// Fail-fast si les variables critiques manquent (DATABASE_URL etc.).
// En dev : warn seulement.
assertEnvOrThrow()

const POLL_MS = Number.parseInt(process.env.WORKER_POLL_MS ?? '2000', 10)
const IDLE_BACKOFF_MAX_MS = 10_000

const log = createLogger({ component: 'worker', pid: process.pid })

let shuttingDown = false
let currentAuditId: string | null = null
let currentBenchmarkId: string | null = null

async function ping(): Promise<void> {
  await db.execute(sql`select 1`)
}

interface PendingAudit {
  id: string
}

interface PendingBenchmark {
  id: string
  organizationId: string
  createdBy: string
}

/**
 * Trouve le prochain audit `queued` à traiter. Le claim atomique se fait
 * ensuite côté processAudit → markAuditRunning, qui sera no-op si un autre
 * processus (ex. API after()) a déjà claim l'audit entre-temps.
 */
async function findNextQueuedAudit(): Promise<PendingAudit | null> {
  const rows = await db
    .select({ id: audits.id })
    .from(audits)
    .where(eq(audits.status, 'queued'))
    .orderBy(asc(audits.queuedAt))
    .limit(1)
  return rows[0] ?? null
}

/**
 * Trouve le prochain benchmark `queued` à traiter (fan-out des audits).
 */
async function findNextQueuedBenchmark(): Promise<PendingBenchmark | null> {
  const rows = await db
    .select({
      id: benchmarks.id,
      organizationId: benchmarks.organizationId,
      createdBy: benchmarks.createdBy,
    })
    .from(benchmarks)
    .where(eq(benchmarks.status, 'queued'))
    .orderBy(asc(benchmarks.createdAt))
    .limit(1)
  return rows[0] ?? null
}

/**
 * Trouve les benchmarks `running` pour vérifier s'ils sont terminés.
 */
async function findRunningBenchmarks(): Promise<Array<{ id: string }>> {
  return db
    .select({ id: benchmarks.id })
    .from(benchmarks)
    .where(eq(benchmarks.status, 'running'))
    .limit(20)
}

/**
 * Traite un benchmark queued : claim atomique → fan-out des audits.
 * Les audits créés rejoignent la queue normale et seront traités au prochain
 * cycle de poll. La transition completed se fait dans tickRunningBenchmarks.
 */
async function processBenchmark(pending: PendingBenchmark): Promise<void> {
  const claimed = await markBenchmarkRunning(pending.id)
  if (!claimed) {
    log.info('worker.benchmark.already_claimed', { benchmark_id: pending.id })
    return
  }

  log.info('worker.benchmark.fan_out.start', { benchmark_id: pending.id })
  try {
    const auditIds = await fanOutBenchmarkAudits(
      pending.id,
      pending.organizationId,
      pending.createdBy,
    )
    log.info('worker.benchmark.fan_out.done', {
      benchmark_id: pending.id,
      audit_count: auditIds.length,
    })
  } catch (error) {
    log.error('worker.benchmark.fan_out.failed', {
      benchmark_id: pending.id,
      error,
    })
    const reason = error instanceof Error ? error.message : String(error)
    await failBenchmark(pending.id, reason)
  }
}

/**
 * Vérifie chaque benchmark `running` et le marque completed/failed si tous
 * ses audits sont terminaux. Appelé à chaque tour de boucle.
 */
async function tickRunningBenchmarks(): Promise<void> {
  const running = await findRunningBenchmarks()
  for (const b of running) {
    try {
      const done = await tryCompleteBenchmark(b.id)
      if (done) {
        log.info('worker.benchmark.completed', { benchmark_id: b.id })
      }
    } catch (error) {
      log.error('worker.benchmark.tick.error', { benchmark_id: b.id, error })
    }
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

async function loop(): Promise<void> {
  let idleMs = POLL_MS
  while (!shuttingDown) {
    try {
      // --- Benchmarks queued : fan-out des audits ---
      const pendingBenchmark = await findNextQueuedBenchmark()
      if (pendingBenchmark) {
        idleMs = POLL_MS
        currentBenchmarkId = pendingBenchmark.id
        log.info('worker.benchmark.picked', { benchmark_id: pendingBenchmark.id })
        try {
          await processBenchmark(pendingBenchmark)
        } catch (error) {
          log.error('worker.benchmark.unexpected_error', {
            benchmark_id: pendingBenchmark.id,
            error,
          })
        } finally {
          currentBenchmarkId = null
        }
        // On ne skip pas le poll des audits dans ce même tour
      }

      // --- Audits queued ---
      const pending = await findNextQueuedAudit()
      if (!pending) {
        // --- Benchmarks running : vérification de complétion ---
        await tickRunningBenchmarks()

        await sleep(idleMs)
        idleMs = Math.min(IDLE_BACKOFF_MAX_MS, Math.floor(idleMs * 1.5))
        continue
      }
      idleMs = POLL_MS
      currentAuditId = pending.id
      log.info('worker.audit.picked', { audit_id: pending.id })
      const startedAt = Date.now()
      try {
        // processAudit fait le claim atomique (markAuditRunning) ; si l'API
        // after() handler a déjà claim, processAudit return early et le
        // duration_ms ci-dessous reflète juste le no-op (~quelques ms).
        await processAudit(pending.id)
        log.info('worker.audit.processed', {
          audit_id: pending.id,
          duration_ms: Date.now() - startedAt,
        })
      } catch (error) {
        // processAudit catches its own errors and marks audit failed ;
        // this branch covers only unexpected throws.
        log.error('worker.audit.unexpected_error', {
          audit_id: pending.id,
          error,
        })
      } finally {
        currentAuditId = null
      }

      // Tick de complétion des benchmarks après chaque audit traité
      await tickRunningBenchmarks()
    } catch (error) {
      log.error('worker.loop.error', { error })
      await sleep(POLL_MS)
    }
  }
}

function installSignalHandlers(): void {
  const handle = (signal: string) => {
    log.info('worker.signal.received', { signal })
    shuttingDown = true
    // Allow 30 s for the current audit to finish before forcing exit.
    setTimeout(() => {
      if (currentAuditId || currentBenchmarkId) {
        log.warn('worker.shutdown.forced', {
          audit_id: currentAuditId,
          benchmark_id: currentBenchmarkId,
        })
      }
      process.exit(0)
    }, 30_000).unref()
  }
  process.on('SIGINT', () => handle('SIGINT'))
  process.on('SIGTERM', () => handle('SIGTERM'))
}

async function main(): Promise<void> {
  log.info('worker.start', { poll_ms: POLL_MS })
  try {
    await ping()
    log.info('worker.db.ok')
  } catch (error) {
    log.error('worker.db.unreachable', { error })
    process.exit(1)
  }
  installSignalHandlers()
  await loop()
  log.info('worker.drained')
}

main().catch((error) => {
  log.error('worker.fatal', { error })
  process.exit(1)
})
