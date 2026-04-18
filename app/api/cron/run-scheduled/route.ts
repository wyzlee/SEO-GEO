import { NextResponse, after } from 'next/server'
import { and, asc, desc, eq, inArray, lte } from 'drizzle-orm'
import { db } from '@/lib/db'
import { audits, organizations, scheduledAudits } from '@/lib/db/schema'
import { processAudit } from '@/lib/audit/process'
import { computeNextRunAt } from '@/lib/audit/schedule'
import { logger } from '@/lib/observability/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Matched to audit route: after() keeps the function alive through processing
export const maxDuration = 800

async function findPreviousAuditId(
  organizationId: string,
  targetUrl: string,
): Promise<string | null> {
  const rows = await db
    .select({ id: audits.id })
    .from(audits)
    .where(
      and(
        eq(audits.organizationId, organizationId),
        eq(audits.status, 'completed'),
        eq(audits.targetUrl, targetUrl),
      ),
    )
    .orderBy(desc(audits.finishedAt))
    .limit(1)
  return rows[0]?.id ?? null
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  const xVercelCron = request.headers.get('x-vercel-cron')

  const isAuthorized =
    (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
    xVercelCron !== null ||
    !cronSecret

  if (!isAuthorized) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const now = new Date()

  const due = await db
    .select()
    .from(scheduledAudits)
    .where(
      and(
        lte(scheduledAudits.nextRunAt, now),
        eq(scheduledAudits.isActive, true),
      ),
    )
    .orderBy(asc(scheduledAudits.nextRunAt))
    .limit(20)

  if (!due.length) {
    return NextResponse.json({ processed: 0, auditIds: [] })
  }

  // Load org plans in one query to clamp mode server-side (mirrors audits POST logic).
  const orgIds = [...new Set(due.map((s) => s.organizationId))]
  const orgRows = await db
    .select({ id: organizations.id, plan: organizations.plan })
    .from(organizations)
    .where(inArray(organizations.id, orgIds))
  const planByOrg = new Map(orgRows.map((r) => [r.id, r.plan]))

  const auditIds: string[] = []

  for (const scheduled of due) {
    try {
      // scheduled.mode may be 'full' but the org may have downgraded since
      // scheduling. We intentionally do NOT enforce monthly quota here:
      // recurring audits were explicitly scheduled and are bounded by LIMIT 20.
      const orgPlan = planByOrg.get(scheduled.organizationId) ?? 'discovery'
      const resolvedMode =
        orgPlan === 'studio' || orgPlan === 'agency'
          ? scheduled.mode
          : 'standard'

      const previousAuditId = await findPreviousAuditId(
        scheduled.organizationId,
        scheduled.targetUrl,
      )

      const [inserted] = await db
        .insert(audits)
        .values({
          organizationId: scheduled.organizationId,
          createdBy: scheduled.createdBy,
          inputType: 'url',
          targetUrl: scheduled.targetUrl,
          mode: resolvedMode,
          status: 'queued',
          previousAuditId,
        })
        .returning({ id: audits.id })

      const auditId = inserted.id
      auditIds.push(auditId)

      const nextRunAt = computeNextRunAt(
        scheduled.frequency as 'daily' | 'weekly' | 'monthly',
        now,
      )

      await db
        .update(scheduledAudits)
        .set({ lastRunAt: now, nextRunAt, updatedAt: now })
        .where(eq(scheduledAudits.id, scheduled.id))

      after(async () => {
        try {
          await processAudit(auditId)
        } catch (error) {
          logger.error('cron.run_scheduled.after_error', {
            audit_id: auditId,
            scheduled_id: scheduled.id,
            error,
          })
        }
      })
    } catch (error) {
      logger.error('cron.run_scheduled.item_error', {
        scheduled_id: scheduled.id,
        error,
      })
    }
  }

  logger.info('cron.run_scheduled', { processed: auditIds.length, auditIds })

  return NextResponse.json({ processed: auditIds.length, auditIds })
}
