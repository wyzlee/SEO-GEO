import { NextResponse } from 'next/server'
import { and, eq, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { audits, auditPhases, findings } from '@/lib/db/schema'
import { authenticateAuto, AuthError } from '@/lib/auth/server'
import { logger } from '@/lib/observability/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  let ctx
  try {
    ctx = await authenticateAuto(request)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    throw error
  }

  const auditRows = await db
    .select()
    .from(audits)
    .where(and(eq(audits.id, id), eq(audits.organizationId, ctx.organizationId)))
    .limit(1)

  if (!auditRows.length) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const [phaseRows, findingRows] = await Promise.all([
    db
      .select()
      .from(auditPhases)
      .where(eq(auditPhases.auditId, id))
      .orderBy(auditPhases.phaseOrder),
    db
      .select()
      .from(findings)
      .where(eq(findings.auditId, id))
      .orderBy(desc(findings.pointsLost)),
  ])

  return NextResponse.json({
    audit: auditRows[0],
    phases: phaseRows.map((phase) => ({
      ...phase,
      findings: findingRows.filter((f) => f.phaseKey === phase.phaseKey),
    })),
  })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  let ctx
  try {
    ctx = await authenticateAuto(request)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    throw error
  }

  // Suppression scopée à l'org. Le schéma déclare ON DELETE CASCADE sur
  // audit_phases / findings / reports → un seul DELETE suffit.
  const deleted = await db
    .delete(audits)
    .where(and(eq(audits.id, id), eq(audits.organizationId, ctx.organizationId)))
    .returning({ id: audits.id })

  if (!deleted.length) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  logger.info('audit.deleted', {
    audit_id: id,
    org_id: ctx.organizationId,
    user_id: ctx.user.id,
  })

  return NextResponse.json({ id: deleted[0].id, deleted: true })
}
