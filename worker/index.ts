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
import { audits } from '@/lib/db/schema'
import { processAudit } from '@/lib/audit/process'
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

async function ping(): Promise<void> {
  await db.execute(sql`select 1`)
}

interface PendingAudit {
  id: string
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

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

async function loop(): Promise<void> {
  let idleMs = POLL_MS
  while (!shuttingDown) {
    try {
      const pending = await findNextQueuedAudit()
      if (!pending) {
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
      if (currentAuditId) {
        log.warn('worker.shutdown.forced', { audit_id: currentAuditId })
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
