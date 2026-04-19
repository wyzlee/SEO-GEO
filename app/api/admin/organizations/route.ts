import { NextResponse } from 'next/server'
import { count } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { organizations, memberships } from '@/lib/db/schema'
import { requireSuperAdmin } from '@/lib/auth/super-admin'
import { AuthError } from '@/lib/auth/server'
import { logger } from '@/lib/observability/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const postBody = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().min(2).max(40).regex(/^[a-z0-9-]+$/, 'Le slug doit contenir uniquement des lettres minuscules, chiffres et tirets'),
  plan: z.enum(['discovery', 'studio', 'agency']).default('discovery'),
})

export async function POST(request: Request) {
  let ctx
  try {
    ctx = await requireSuperAdmin(request)
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
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = postBody.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid body' }, { status: 422 })
  }

  let organization
  try {
    const [inserted] = await db
      .insert(organizations)
      .values({
        id: crypto.randomUUID(),
        name: parsed.data.name,
        slug: parsed.data.slug,
        plan: parsed.data.plan,
      })
      .returning()
    organization = inserted
  } catch (error) {
    // Conflit de contrainte unique Postgres (slug, ou autre champ unique)
    const pgError = error as { code?: string; constraint?: string }
    if (pgError.code === '23505') {
      return NextResponse.json(
        { error: 'Ce slug est déjà utilisé par une autre organisation.' },
        { status: 409 },
      )
    }
    throw error
  }

  logger.info('admin.org_created', {
    org_id: organization.id,
    slug: organization.slug,
    plan: organization.plan,
    by: ctx.email,
  })

  return NextResponse.json({ organization }, { status: 201 })
}

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
