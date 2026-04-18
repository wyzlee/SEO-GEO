import { NextResponse } from 'next/server'
import { and, desc, eq, gte, ne, count, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { audits, organizations } from '@/lib/db/schema'
import { authenticateAuto, AuthError } from '@/lib/auth/server'
import { PLANS } from '@/lib/billing/stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

  const [org] = await db
    .select({ plan: organizations.plan })
    .from(organizations)
    .where(eq(organizations.id, ctx.organizationId))
    .limit(1)

  if (!org) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const planId = (org.plan ?? 'discovery') as keyof typeof PLANS
  const planConfig = PLANS[planId] ?? PLANS.discovery
  const auditLimit = planConfig.auditLimit === -1 ? null : planConfig.auditLimit

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const [usageRow] = await db
    .select({ total: count() })
    .from(audits)
    .where(
      and(
        eq(audits.organizationId, ctx.organizationId),
        gte(audits.createdAt, startOfMonth),
        ne(audits.status, 'failed'),
      ),
    )

  const auditUsage = usageRow?.total ?? 0

  const recentAudits = await db
    .select({
      id: audits.id,
      targetUrl: audits.targetUrl,
      status: audits.status,
      scoreTotal: audits.scoreTotal,
      createdAt: audits.createdAt,
    })
    .from(audits)
    .where(eq(audits.organizationId, ctx.organizationId))
    .orderBy(desc(audits.createdAt))
    .limit(10)

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  thirtyDaysAgo.setHours(0, 0, 0, 0)

  const auditsByDayRows = await db
    .select({
      date: sql<string>`DATE(${audits.createdAt})`.as('date'),
      count: count(),
    })
    .from(audits)
    .where(
      and(
        eq(audits.organizationId, ctx.organizationId),
        gte(audits.createdAt, thirtyDaysAgo),
        ne(audits.status, 'failed'),
      ),
    )
    .groupBy(sql`DATE(${audits.createdAt})`)
    .orderBy(sql`DATE(${audits.createdAt})`)

  return NextResponse.json({
    plan: planId,
    auditUsage,
    auditLimit,
    recentAudits: recentAudits.map((a) => ({
      id: a.id,
      targetUrl: a.targetUrl,
      status: a.status,
      scoreTotal: a.scoreTotal,
      createdAt: a.createdAt.toISOString(),
    })),
    auditsByDay: auditsByDayRows.map((r) => ({
      date: r.date,
      count: r.count,
    })),
  })
}
