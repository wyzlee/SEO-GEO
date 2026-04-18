import { NextResponse } from 'next/server'
import { and, eq, lt } from 'drizzle-orm'
import { db } from '@/lib/db'
import { audits } from '@/lib/db/schema'
import { logger } from '@/lib/observability/logger'
import { verifyBearerSecret } from '@/lib/security/constant-time'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Audits bloqués en `running` depuis plus de 12 min sont requeués.
// La route audit a maxDuration=800s (~13 min) ; 12 min garantit qu'on
// ne requeue pas un audit encore en cours.
const STUCK_THRESHOLD_MS = 12 * 60 * 1000

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!verifyBearerSecret(authHeader, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const stuckBefore = new Date(Date.now() - STUCK_THRESHOLD_MS)

  const requeued = await db
    .update(audits)
    .set({ status: 'queued', startedAt: null, errorMessage: null })
    .where(and(eq(audits.status, 'running'), lt(audits.startedAt, stuckBefore)))
    .returning({ id: audits.id })

  if (requeued.length > 0) {
    logger.info('cron.requeue_stuck', {
      count: requeued.length,
      ids: requeued.map((r) => r.id),
    })
  }

  return NextResponse.json({ requeued: requeued.length })
}
