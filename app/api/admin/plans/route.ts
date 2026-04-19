import { NextResponse } from 'next/server'
import { count } from 'drizzle-orm'
import { db } from '@/lib/db'
import { organizations } from '@/lib/db/schema'
import { requireSuperAdmin } from '@/lib/auth/super-admin'
import { AuthError } from '@/lib/auth/server'
import { PLANS } from '@/lib/billing/stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    await requireSuperAdmin(request)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    throw error
  }

  // Compter les orgs par plan — seuls les plans avec au moins 1 org apparaissent
  const countRows = await db
    .select({
      plan: organizations.plan,
      orgCount: count(),
    })
    .from(organizations)
    .groupBy(organizations.plan)

  const countMap = Object.fromEntries(
    countRows.map((r) => [r.plan, r.orgCount]),
  )

  // Itérer sur PLANS pour garantir la présence de tous les plans (0 si aucune org)
  const plans = Object.values(PLANS).map((plan) => ({
    id: plan.id,
    name: plan.name,
    priceMonthly: plan.priceMonthly,
    priceId: plan.priceId,
    auditLimit: plan.auditLimit,
    orgCount: countMap[plan.id] ?? 0,
  }))

  return NextResponse.json({ plans })
}
