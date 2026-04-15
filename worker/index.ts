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
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { processAudit } from '@/lib/audit/process'

const POLL_MS = Number.parseInt(process.env.WORKER_POLL_MS ?? '2000', 10)
const IDLE_BACKOFF_MAX_MS = 10_000

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
      console.log(`[worker] claimed audit ${claimed.id}`)
      try {
        await processAudit(claimed.id)
        console.log(`[worker] completed audit ${claimed.id}`)
      } catch (error) {
        // processAudit catches its own errors and marks audit failed ;
        // this branch covers only unexpected throws.
        console.error(`[worker] unexpected error on audit ${claimed.id}`, error)
      } finally {
        currentAuditId = null
      }
    } catch (error) {
      console.error('[worker] loop error', error)
      await sleep(POLL_MS)
    }
  }
}

function installSignalHandlers(): void {
  const handle = (signal: string) => {
    console.log(`[worker] received ${signal}, draining…`)
    shuttingDown = true
    // Allow 30 s for the current audit to finish before forcing exit.
    setTimeout(() => {
      if (currentAuditId) {
        console.warn(`[worker] forcing exit while running ${currentAuditId}`)
      }
      process.exit(0)
    }, 30_000).unref()
  }
  process.on('SIGINT', () => handle('SIGINT'))
  process.on('SIGTERM', () => handle('SIGTERM'))
}

async function main(): Promise<void> {
  console.log('[worker] starting SEO-GEO worker')
  try {
    await ping()
    console.log('[worker] database connection OK')
  } catch (error) {
    console.error('[worker] database unreachable', error)
    process.exit(1)
  }
  installSignalHandlers()
  await loop()
  console.log('[worker] drained, bye')
}

main().catch((error) => {
  console.error('[worker] fatal', error)
  process.exit(1)
})
