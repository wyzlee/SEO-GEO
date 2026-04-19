import { NextResponse } from 'next/server'
import { and, eq, desc } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { audits, auditPhases, findings } from '@/lib/db/schema'
import { authenticateAuto, AuthError } from '@/lib/auth/server'
import { logger } from '@/lib/observability/logger'

const patchAuditBody = z.object({
  clientName: z.string().max(200).nullable().optional(),
  consultantName: z.string().max(200).nullable().optional(),
})

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

export async function PATCH(
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

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = patchAuditBody.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid body' }, { status: 422 })
  }

  const updates: Record<string, unknown> = {}
  if ('clientName' in parsed.data) updates.clientName = parsed.data.clientName
  if ('consultantName' in parsed.data) updates.consultantName = parsed.data.consultantName

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const updated = await db
    .update(audits)
    .set(updates)
    .where(and(eq(audits.id, id), eq(audits.organizationId, ctx.organizationId)))
    .returning()

  if (!updated.length) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  logger.info('audit.updated', { audit_id: id, org_id: ctx.organizationId, fields: Object.keys(updates) })

  return NextResponse.json({ audit: updated[0] })
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
