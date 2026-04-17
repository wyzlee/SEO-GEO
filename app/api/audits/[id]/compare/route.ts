import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { audits, auditPhases, findings } from '@/lib/db/schema'
import { authenticateAuto, AuthError } from '@/lib/auth/server'
import { compareAudits } from '@/lib/audit/compare'
import type { ReportFinding } from '@/lib/report/render'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/audits/:id/compare
 * Retourne le diff (score, phases, findings) entre l'audit `id` et son
 * prédécesseur (`previousAuditId` auto-lié à la création). 404 si l'audit
 * cible n'existe pas dans l'org. 409 si pas de prédécesseur.
 */
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

  const [current] = await db
    .select({
      id: audits.id,
      scoreTotal: audits.scoreTotal,
      finishedAt: audits.finishedAt,
      targetUrl: audits.targetUrl,
      previousAuditId: audits.previousAuditId,
      status: audits.status,
    })
    .from(audits)
    .where(and(eq(audits.id, id), eq(audits.organizationId, ctx.organizationId)))
    .limit(1)

  if (!current) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (!current.previousAuditId) {
    return NextResponse.json(
      {
        error:
          'Aucun audit précédent pour cette cible — impossible de calculer une évolution.',
      },
      { status: 409 },
    )
  }

  const [previous] = await db
    .select({
      id: audits.id,
      scoreTotal: audits.scoreTotal,
      finishedAt: audits.finishedAt,
      targetUrl: audits.targetUrl,
    })
    .from(audits)
    .where(
      and(
        eq(audits.id, current.previousAuditId),
        eq(audits.organizationId, ctx.organizationId),
      ),
    )
    .limit(1)

  if (!previous) {
    return NextResponse.json(
      { error: 'Audit précédent introuvable ou hors organisation.' },
      { status: 404 },
    )
  }

  const [currentPhasesRows, previousPhasesRows, currentFindingsRows, previousFindingsRows] =
    await Promise.all([
      db.select().from(auditPhases).where(eq(auditPhases.auditId, current.id)),
      db.select().from(auditPhases).where(eq(auditPhases.auditId, previous.id)),
      db.select().from(findings).where(eq(findings.auditId, current.id)),
      db.select().from(findings).where(eq(findings.auditId, previous.id)),
    ])

  const toReportFinding = (
    f: (typeof currentFindingsRows)[number],
  ): ReportFinding => ({
    phaseKey: f.phaseKey,
    severity: f.severity as ReportFinding['severity'],
    category: f.category,
    title: f.title,
    description: f.description,
    recommendation: f.recommendation,
    pointsLost: f.pointsLost,
    effort: f.effort as ReportFinding['effort'],
    locationUrl: f.locationUrl,
  })

  const result = compareAudits({
    current,
    previous,
    currentPhases: currentPhasesRows,
    previousPhases: previousPhasesRows,
    currentFindings: currentFindingsRows.map(toReportFinding),
    previousFindings: previousFindingsRows.map(toReportFinding),
  })

  return NextResponse.json({
    current: { id: current.id, finishedAt: current.finishedAt },
    previous: { id: previous.id, finishedAt: previous.finishedAt },
    result,
  })
}
