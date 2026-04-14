/**
 * SEO-GEO worker — Sprint 01 stub.
 * Real claim/run loop lands in Sprint 03 alongside the audit engine
 * (see .claude/docs/audit-engine.md).
 *
 * Responsibility: poll the `audits` table for status='queued', claim with
 * `SELECT ... FOR UPDATE SKIP LOCKED`, run the 11 phases, mark completed/failed.
 */
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'

const POLL_MS = 2000

async function ping(): Promise<void> {
  await db.execute(sql`select 1`)
}

async function claimNextAudit(): Promise<{ id: string } | null> {
  // Sprint 03 will implement the real FOR UPDATE SKIP LOCKED claim.
  return null
}

async function runAudit(_auditId: string): Promise<void> {
  // Sprint 03 will orchestrate the 11 phases.
}

async function loop() {
  while (true) {
    try {
      const claimed = await claimNextAudit()
      if (!claimed) {
        await new Promise((r) => setTimeout(r, POLL_MS))
        continue
      }
      await runAudit(claimed.id)
    } catch (error) {
      console.error('[worker] loop error', error)
      await new Promise((r) => setTimeout(r, POLL_MS))
    }
  }
}

async function main() {
  console.log('[worker] starting SEO-GEO worker (stub)')
  try {
    await ping()
    console.log('[worker] database connection OK')
  } catch (error) {
    console.error('[worker] database unreachable', error)
    process.exit(1)
  }
  await loop()
}

main().catch((error) => {
  console.error('[worker] fatal', error)
  process.exit(1)
})
