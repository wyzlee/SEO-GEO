/**
 * SEO-GEO worker — production-ready claim loop.
 *
 * Responsibility : poll `audits` table for status='queued', claim one
 * atomically via UPDATE … WHERE id IN (SELECT … FOR UPDATE SKIP LOCKED),
 * run the 11-phase pipeline via processAudit(), retry on error.
 *
 * Design notes :
 *  - Single statement for the claim → works over Neon HTTP driver
 *    (no persistent session required).
 *  - Backoff + jitter on empty poll to avoid hammering the DB.
 *  - Graceful shutdown on SIGINT/SIGTERM : finish the current audit
 *    (if any) before exiting.
 */
// Charge .env.local en dev (no-op en prod où les vars viennent de Docker).
import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'
loadEnv({ path: resolve(process.cwd(), '.env.local') })

import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { processAudit } from '@/lib/audit/process'
import { createLogger } from '@/lib/observability/logger'

const POLL_MS = Number.parseInt(process.env.WORKER_POLL_MS ?? '2000', 10)
const IDLE_BACKOFF_MAX_MS = 10_000

const log = createLogger({ component: 'worker', pid: process.pid })

let shuttingDown = false
let currentAuditId: string | null = null

async function ping(): Promise<void> {
  await db.execute(sql`select 1`)
}

interface ClaimedAudit {
  id: string
}

async function claimNextAudit(): Promise<ClaimedAudit | null> {
  // Atomic claim : pick the oldest queued audit and flip it to running in
  // a single statement. SKIP LOCKED lets multiple workers coexist.
  const rows = await db.execute<{ id: string }>(sql`
    UPDATE audits
    SET status = 'running', started_at = now()
    WHERE id = (
      SELECT id FROM audits
      WHERE status = 'queued'
      ORDER BY queued_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id
  `)
  // Neon HTTP driver returns `{ rows: [] }` or an array depending on mode.
  const list: Array<{ id: string }> = Array.isArray(rows)
    ? (rows as Array<{ id: string }>)
    : ((rows as { rows?: Array<{ id: string }> }).rows ?? [])
  const first = list[0]
  return first ? { id: first.id } : null
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

async function loop(): Promise<void> {
  let idleMs = POLL_MS
  while (!shuttingDown) {
    try {
      const claimed = await claimNextAudit()
      if (!claimed) {
        await sleep(idleMs)
        idleMs = Math.min(IDLE_BACKOFF_MAX_MS, Math.floor(idleMs * 1.5))
        continue
      }
      idleMs = POLL_MS
      currentAuditId = claimed.id
      log.info('worker.audit.claimed', { audit_id: claimed.id })
      const startedAt = Date.now()
      try {
        await processAudit(claimed.id)
        log.info('worker.audit.completed', {
          audit_id: claimed.id,
          duration_ms: Date.now() - startedAt,
        })
      } catch (error) {
        // processAudit catches its own errors and marks audit failed ;
        // this branch covers only unexpected throws.
        log.error('worker.audit.unexpected_error', {
          audit_id: claimed.id,
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
