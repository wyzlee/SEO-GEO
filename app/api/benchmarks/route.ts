import { NextResponse } from 'next/server'
import { desc, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { benchmarks } from '@/lib/db/schema'
import { authenticateAuto, AuthError } from '@/lib/auth/server'
import { assertSafeUrl, UnsafeUrlError } from '@/lib/security/url-guard'
import { rateLimit } from '@/lib/security/rate-limit'
import { logger } from '@/lib/observability/logger'
import { createBenchmark } from '@/lib/audit/benchmark'
import { createBenchmarkSchema, listBenchmarksQuerySchema } from '@/lib/types/benchmarks'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BURST_LIMIT = { name: 'benchmarks.post.burst', max: 2, windowMs: 60_000 }

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

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  const parsed = createBenchmarkSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation échouée', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  // Vérification SSRF sur chaque URL fournie
  for (const item of parsed.data.urls) {
    try {
      assertSafeUrl(item.url)
    } catch (error) {
      if (error instanceof UnsafeUrlError) {
        return NextResponse.json(
          { error: `URL non sécurisée (${item.label}) : ${error.message}`, reason: error.reason },
          { status: 400 },
        )
      }
      throw error
    }
  }

  // Rate limit par utilisateur (burst)
  const userBurst = await rateLimit(BURST_LIMIT, `u:${ctx.user.id}`)
  if (!userBurst.allowed) {
    return NextResponse.json(
      {
        error: 'Trop de requêtes. Réessayez dans un instant.',
        retryAfterSeconds: userBurst.retryAfterSeconds,
      },
      {
        status: 429,
        headers: { 'Retry-After': String(userBurst.retryAfterSeconds) },
      },
    )
  }

  let benchmarkId: string
  try {
    benchmarkId = await createBenchmark({
      organizationId: ctx.organizationId,
      createdBy: ctx.user.id,
      name: parsed.data.name,
      mode: parsed.data.mode,
      urls: parsed.data.urls,
    })
  } catch (error) {
    logger.error('benchmarks.post.create_failed', {
      org_id: ctx.organizationId,
      error,
    })
    return NextResponse.json({ error: 'Erreur interne lors de la création' }, { status: 500 })
  }

  logger.info('benchmarks.post.created', {
    benchmark_id: benchmarkId,
    org_id: ctx.organizationId,
    url_count: parsed.data.urls.length,
  })

  return NextResponse.json({ benchmarkId, status: 'queued' }, { status: 202 })
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

  const { searchParams } = new URL(request.url)
  const queryParsed = listBenchmarksQuerySchema.safeParse({
    page: searchParams.get('page') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
  })

  if (!queryParsed.success) {
    return NextResponse.json(
      { error: 'Paramètres de pagination invalides', issues: queryParsed.error.issues },
      { status: 400 },
    )
  }

  const { page, limit } = queryParsed.data
  const offset = (page - 1) * limit

  const rows = await db
    .select()
    .from(benchmarks)
    .where(eq(benchmarks.organizationId, ctx.organizationId))
    .orderBy(desc(benchmarks.createdAt))
    .limit(limit)
    .offset(offset)

  // Compter le total pour la pagination
  const [countRow] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(benchmarks)
    .where(eq(benchmarks.organizationId, ctx.organizationId))

  return NextResponse.json({
    benchmarks: rows,
    pagination: {
      page,
      limit,
      total: countRow?.total ?? 0,
    },
  })
}
