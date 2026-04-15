import { NextResponse } from 'next/server'
import { and, desc, eq } from 'drizzle-orm'
import crypto from 'node:crypto'
import { db } from '@/lib/db'
import { audits, auditPhases, findings, reports } from '@/lib/db/schema'
import { authenticateAuto, AuthError } from '@/lib/auth/server'
import { generateReport } from '@/lib/report/generate'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function randomSlug(): string {
  return crypto.randomBytes(18).toString('base64url')
}

async function loadAudit(auditId: string, orgId: string) {
  const auditRows = await db
    .select()
    .from(audits)
    .where(and(eq(audits.id, auditId), eq(audits.organizationId, orgId)))
    .limit(1)
  if (!auditRows.length) return null
  const audit = auditRows[0]

  const [phaseRows, findingRows] = await Promise.all([
    db
      .select()
      .from(auditPhases)
      .where(eq(auditPhases.auditId, auditId))
      .orderBy(auditPhases.phaseOrder),
    db
      .select()
      .from(findings)
      .where(eq(findings.auditId, auditId)),
  ])
  return { audit, phases: phaseRows, findings: findingRows }
}

export async function POST(
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

  const data = await loadAudit(id, ctx.organizationId)
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (data.audit.status !== 'completed') {
    return NextResponse.json(
      { error: 'Audit pas encore terminé' },
      { status: 409 },
    )
  }

  const rendered = generateReport({
    audit: {
      id: data.audit.id,
      targetUrl: data.audit.targetUrl,
      clientName: data.audit.clientName,
      consultantName: data.audit.consultantName,
      scoreTotal: data.audit.scoreTotal,
      scoreBreakdown:
        (data.audit.scoreBreakdown as Record<string, number> | null) ?? null,
      finishedAt: data.audit.finishedAt,
    },
    phases: data.phases.map((p) => ({
      phaseKey: p.phaseKey,
      score: p.score,
      scoreMax: p.scoreMax,
      status: p.status,
      summary: p.summary,
    })),
    findings: data.findings.map((f) => ({
      phaseKey: f.phaseKey,
      severity: f.severity as 'critical' | 'high' | 'medium' | 'low' | 'info',
      category: f.category,
      title: f.title,
      description: f.description,
      recommendation: f.recommendation,
      pointsLost: f.pointsLost,
      effort: f.effort as 'quick' | 'medium' | 'heavy' | null,
      locationUrl: f.locationUrl,
    })),
  })

  const slug = randomSlug()
  const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000)

  const [inserted] = await db
    .insert(reports)
    .values({
      auditId: id,
      format: 'web',
      language: 'fr',
      templateVersion: rendered.templateVersion,
      contentMd: rendered.markdown,
      contentHtml: rendered.html,
      shareSlug: slug,
      shareExpiresAt: expiresAt,
    })
    .returning({ id: reports.id, shareSlug: reports.shareSlug })

  return NextResponse.json(
    {
      id: inserted.id,
      shareSlug: inserted.shareSlug,
      shareUrl: `/r/${inserted.shareSlug}`,
      expiresAt,
    },
    { status: 201 },
  )
}

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

  // Confirm audit ownership first
  const auditRows = await db
    .select({ id: audits.id })
    .from(audits)
    .where(and(eq(audits.id, id), eq(audits.organizationId, ctx.organizationId)))
    .limit(1)
  if (!auditRows.length) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const rows = await db
    .select()
    .from(reports)
    .where(eq(reports.auditId, id))
    .orderBy(desc(reports.generatedAt))

  return NextResponse.json({ reports: rows })
}
