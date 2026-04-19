import { NextResponse } from 'next/server'
import { count } from 'drizzle-orm'
import { db } from '@/lib/db'
import { organizations, memberships } from '@/lib/db/schema'
import { requireSuperAdmin } from '@/lib/auth/super-admin'
import { AuthError } from '@/lib/auth/server'

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

  const orgs = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      plan: organizations.plan,
      auditUsage: organizations.auditUsage,
      subscriptionStatus: organizations.subscriptionStatus,
      stripeSubscriptionId: organizations.stripeSubscriptionId,
      createdAt: organizations.createdAt,
    })
    .from(organizations)
    .orderBy(organizations.createdAt)

  // member counts per org
  const memberCounts = await db
    .select({
      organizationId: memberships.organizationId,
      count: count(),
    })
    .from(memberships)
    .groupBy(memberships.organizationId)

  const countMap = Object.fromEntries(
    memberCounts.map((r) => [r.organizationId, r.count]),
  )

  return NextResponse.json({
    organizations: orgs.map((o) => ({
      ...o,
      memberCount: countMap[o.id] ?? 0,
    })),
  })
}
