/**
 * POST /api/audits/[id]/briefs — Générer les content briefs post-audit
 * GET  /api/audits/[id]/briefs — Lister les briefs existants
 *
 * Idempotent : si des briefs existent déjà pour cet audit, POST retourne les
 * briefs existants sans re-appeler Claude (409 avec les données).
 * Auth : authenticateAuto (scoped à l'org).
 */
import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { audits, contentBriefs, findings } from '@/lib/db/schema'
import { authenticateAuto, AuthError } from '@/lib/auth/server'
import { generateContentBriefs } from '@/lib/audit/briefs'
import { logger } from '@/lib/observability/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: auditId } = await params

  let ctx
  try {
    ctx = await authenticateAuto(request)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    throw error
  }

  // Vérifier que ANTHROPIC_API_KEY est configurée
  if (!process.env.ANTHROPIC_API_KEY) {
    logger.warn('briefs.api_key.missing', { audit_id: auditId, org_id: ctx.organizationId })
    return NextResponse.json(
      { error: 'Génération de briefs temporairement indisponible. Clé API manquante.' },
      { status: 503 },
    )
  }

  // Vérifier que l'audit existe et appartient à l'org
  const auditRows = await db
    .select({
      id: audits.id,
      status: audits.status,
      targetUrl: audits.targetUrl,
      inputType: audits.inputType,
    })
    .from(audits)
    .where(and(eq(audits.id, auditId), eq(audits.organizationId, ctx.organizationId)))
    .limit(1)

  if (!auditRows.length) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const audit = auditRows[0]

  if (audit.status !== 'completed') {
    return NextResponse.json(
      { error: 'L\'audit doit être terminé (status: completed) pour générer des briefs.' },
      { status: 409 },
    )
  }

  // Les briefs nécessitent une URL cible pour contextualiser le contenu
  if (!audit.targetUrl) {
    return NextResponse.json(
      { error: 'La génération de briefs est disponible uniquement pour les audits de type URL.' },
      { status: 400 },
    )
  }

  // Idempotence : vérifier si des briefs existent déjà
  const existingBriefs = await db
    .select()
    .from(contentBriefs)
    .where(and(eq(contentBriefs.auditId, auditId), eq(contentBriefs.organizationId, ctx.organizationId)))

  if (existingBriefs.length > 0) {
    logger.info('briefs.already_generated', {
      audit_id: auditId,
      org_id: ctx.organizationId,
      brief_count: existingBriefs.length,
    })
    return NextResponse.json(
      { briefs: existingBriefs, alreadyGenerated: true },
      { status: 200 },
    )
  }

  // Charger les findings de l'audit (phases topical + freshness en priorité)
  const findingRows = await db
    .select({
      phaseKey: findings.phaseKey,
      title: findings.title,
      description: findings.description,
      recommendation: findings.recommendation,
      pointsLost: findings.pointsLost,
    })
    .from(findings)
    .where(eq(findings.auditId, auditId))

  const targetUrl = audit.targetUrl

  logger.info('briefs.generation.requested', {
    audit_id: auditId,
    org_id: ctx.organizationId,
    finding_count: findingRows.length,
    target_url: targetUrl,
  })

  let generatedBriefs
  try {
    generatedBriefs = await generateContentBriefs({
      auditId,
      organizationId: ctx.organizationId,
      findings: findingRows,
      targetUrl,
    })
  } catch (err) {
    logger.error('briefs.generation.error', {
      audit_id: auditId,
      org_id: ctx.organizationId,
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json(
      { error: 'Génération de briefs temporairement indisponible. Réessayez dans quelques instants.' },
      { status: 503 },
    )
  }

  return NextResponse.json({ briefs: generatedBriefs }, { status: 201 })
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: auditId } = await params

  let ctx
  try {
    ctx = await authenticateAuto(request)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    throw error
  }

  // Vérifier que l'audit appartient à l'org (éviter leak d'existence)
  const auditRows = await db
    .select({ id: audits.id })
    .from(audits)
    .where(and(eq(audits.id, auditId), eq(audits.organizationId, ctx.organizationId)))
    .limit(1)

  if (!auditRows.length) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const briefs = await db
    .select()
    .from(contentBriefs)
    .where(and(eq(contentBriefs.auditId, auditId), eq(contentBriefs.organizationId, ctx.organizationId)))

  return NextResponse.json({ briefs })
}
