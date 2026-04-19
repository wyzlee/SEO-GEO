import { NextResponse } from 'next/server'
import { authenticateAuto, AuthError } from '@/lib/auth/server'
import { getBenchmarkResults } from '@/lib/audit/benchmark'
import { logger } from '@/lib/observability/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let ctx
  try {
    ctx = await authenticateAuto(request)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    throw error
  }

  const { id: benchmarkId } = await params

  if (!benchmarkId || typeof benchmarkId !== 'string') {
    return NextResponse.json({ error: 'Identifiant de benchmark manquant' }, { status: 400 })
  }

  let results
  try {
    results = await getBenchmarkResults(benchmarkId, ctx.organizationId)
  } catch (error) {
    logger.error('benchmarks.get.read_failed', {
      benchmark_id: benchmarkId,
      org_id: ctx.organizationId,
      error,
    })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }

  // 404 opaque : ne pas révéler l'existence du benchmark à une org tierce
  if (!results) {
    return NextResponse.json({ error: 'Benchmark introuvable' }, { status: 404 })
  }

  return NextResponse.json(results)
}
