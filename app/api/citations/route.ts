/**
 * POST /api/citations — Lancer une vérification de citation LLM
 * GET  /api/citations — Lister les checks de l'organisation
 *
 * Rate limit : 5 checks/heure/org (LLM calls sont coûteux).
 * Auth : authenticateAuto (Bearer + cookie Stack Auth).
 */
import { NextResponse } from 'next/server'
import { and, desc, eq, ilike } from 'drizzle-orm'
import { db } from '@/lib/db'
import { citationChecks } from '@/lib/db/schema'
import { authenticateAuto, AuthError } from '@/lib/auth/server'
import { rateLimit } from '@/lib/security/rate-limit'
import { checkCitation } from '@/lib/integrations/citation-monitor'
import { createCitationSchema, listCitationsQuerySchema } from '@/lib/types/citations'
import { logger } from '@/lib/observability/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Rate limits
const HOURLY_LIMIT_ORG = { name: 'citations.post.hourly_org', max: 5, windowMs: 3_600_000 }
const BURST_LIMIT_USER = { name: 'citations.post.burst_user', max: 1, windowMs: 10_000 }

export async function POST(request: Request) {
  let ctx
  try {
    ctx = await authenticateAuto(request)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    throw error
  }

  // Rate limit anti-double-click par user (1/10s)
  const burstCheck = await rateLimit(BURST_LIMIT_USER, `u:${ctx.user.id}`)
  if (!burstCheck.allowed) {
    return NextResponse.json(
      { error: 'Trop de requêtes. Réessayez dans quelques secondes.', retryAfterSeconds: burstCheck.retryAfterSeconds },
      { status: 429, headers: { 'Retry-After': String(burstCheck.retryAfterSeconds) } },
    )
  }

  // Rate limit principal par org (5/heure)
  const orgHourly = await rateLimit(HOURLY_LIMIT_ORG, `o:${ctx.organizationId}`)
  if (!orgHourly.allowed) {
    return NextResponse.json(
      {
        error: 'Limite de vérifications de citations atteinte (5/heure). Réessayez plus tard.',
        retryAfterSeconds: orgHourly.retryAfterSeconds,
      },
      { status: 429, headers: { 'Retry-After': String(orgHourly.retryAfterSeconds) } },
    )
  }

  // Vérifier que les clés API nécessaires sont disponibles
  const toolsAvailable: Record<string, boolean> = {
    perplexity: !!process.env.PERPLEXITY_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 })
  }

  const parsed = createCitationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation échouée', issues: parsed.error.issues }, { status: 400 })
  }

  const { domain, queries, tools } = parsed.data

  // Filtrer les outils sans clé API configurée
  const enabledTools = tools.filter((t) => toolsAvailable[t])
  if (enabledTools.length === 0) {
    return NextResponse.json(
      { error: 'Aucun outil LLM disponible. Vérifiez la configuration des clés API (PERPLEXITY_API_KEY, OPENAI_API_KEY).' },
      { status: 503 },
    )
  }

  // Construire toutes les combinaisons query × tool
  type CheckJob = { query: string; tool: 'perplexity' | 'openai' }
  const jobs: CheckJob[] = []
  for (const query of queries) {
    for (const tool of enabledTools as Array<'perplexity' | 'openai'>) {
      jobs.push({ query, tool })
    }
  }

  // Lancer en parallèle (Promise.allSettled pour ne pas bloquer sur un échec)
  const settled = await Promise.allSettled(
    jobs.map(async (job) => {
      const result = await checkCitation({ domain, query: job.query, tool: job.tool })

      const [inserted] = await db
        .insert(citationChecks)
        .values({
          organizationId: ctx.organizationId,
          domain,
          query: job.query,
          tool: job.tool,
          isCited: result.isCited,
          competitorDomainsCited: result.competitorDomainsCited,
          rawResponse: result.rawResponse,
        })
        .returning()

      return inserted
    }),
  )

  const results: typeof citationChecks.$inferSelect[] = []
  const errors: string[] = []

  for (let i = 0; i < settled.length; i++) {
    const s = settled[i]
    if (s.status === 'fulfilled') {
      results.push(s.value)
    } else {
      const job = jobs[i]
      logger.error('citation.check.failed', {
        org_id: ctx.organizationId,
        tool: job.tool,
        query_length: job.query.length,
        error: s.reason instanceof Error ? s.reason.message : String(s.reason),
      })
      errors.push(`${job.tool} — ${s.reason instanceof Error ? s.reason.message : 'Erreur inconnue'}`)
    }
  }

  // 201 = tout réussi, 207 = résultats partiels, 502 = tous échoués
  const status = results.length === 0 ? 502 : errors.length === 0 ? 201 : 207
  return NextResponse.json(
    {
      results,
      ...(errors.length > 0 ? { errors } : {}),
    },
    { status },
  )
}

export async function GET(request: Request) {
  let ctx
  try {
    ctx = await authenticateAuto(request)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    throw error
  }

  const url = new URL(request.url)
  const queryParams = Object.fromEntries(url.searchParams.entries())
  const parsed = listCitationsQuerySchema.safeParse(queryParams)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Paramètres invalides', issues: parsed.error.issues }, { status: 400 })
  }

  const { domain, page, limit } = parsed.data
  const offset = (page - 1) * limit

  const conditions = [eq(citationChecks.organizationId, ctx.organizationId)]
  if (domain) {
    conditions.push(ilike(citationChecks.domain, domain))
  }

  const rows = await db
    .select()
    .from(citationChecks)
    .where(and(...conditions))
    .orderBy(desc(citationChecks.checkedAt))
    .limit(limit)
    .offset(offset)

  return NextResponse.json({ checks: rows, page, limit })
}
