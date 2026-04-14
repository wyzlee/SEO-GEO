import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

interface Check {
  name: string
  status: 'ok' | 'failed'
  latencyMs?: number
  message?: string
}

export async function GET() {
  const checks: Check[] = []
  let overall: 'healthy' | 'unhealthy' = 'healthy'

  const dbStart = Date.now()
  try {
    await db.execute(sql`select 1`)
    checks.push({
      name: 'database',
      status: 'ok',
      latencyMs: Date.now() - dbStart,
    })
  } catch (error) {
    overall = 'unhealthy'
    checks.push({
      name: 'database',
      status: 'failed',
      latencyMs: Date.now() - dbStart,
      message: error instanceof Error ? error.message : 'unknown',
    })
  }

  checks.push({ name: 'api', status: 'ok' })

  return NextResponse.json(
    {
      status: overall,
      checks,
      version: process.env.npm_package_version || 'unknown',
      timestamp: new Date().toISOString(),
    },
    {
      status: overall === 'healthy' ? 200 : 503,
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
    },
  )
}
