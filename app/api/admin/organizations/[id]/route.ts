import { NextResponse } from 'next/server'
import { eq, desc } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { organizations, memberships, users, audits } from '@/lib/db/schema'
import { requireSuperAdmin } from '@/lib/auth/super-admin'
import { AuthError } from '@/lib/auth/server'
import { logger } from '@/lib/observability/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const patchBody = z
  .object({
    plan: z.enum(['discovery', 'studio', 'agency']).optional(),
    name: z.string().min(2).max(80).optional(),
    slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/, 'Slug: lettres minuscules, chiffres et tirets uniquement').optional(),
    description: z.string().max(500).nullable().optional(),
    logoUrl: z.string().url('URL invalide').nullable().optional(),
    auditUsage: z.number().int().min(0).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Au moins un champ doit être fourni',
  })

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  try {
    await requireSuperAdmin(request)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    throw error
  }

  const orgRows = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      plan: organizations.plan,
      auditUsage: organizations.auditUsage,
      subscriptionStatus: organizations.subscriptionStatus,
      stripeCustomerId: organizations.stripeCustomerId,
      stripeSubscriptionId: organizations.stripeSubscriptionId,
      stripePriceId: organizations.stripePriceId,
      description: organizations.description,
      logoUrl: organizations.logoUrl,
      branding: organizations.branding,
      customDomain: organizations.customDomain,
      createdAt: organizations.createdAt,
      updatedAt: organizations.updatedAt,
    })
    .from(organizations)
    .where(eq(organizations.id, id))
    .limit(1)

  if (!orgRows.length) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const memberRows = await db
    .select({
      userId: memberships.userId,
      email: users.email,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      role: memberships.role,
      joinedAt: memberships.createdAt,
    })
    .from(memberships)
    .innerJoin(users, eq(memberships.userId, users.id))
    .where(eq(memberships.organizationId, id))

  const recentAuditRows = await db
    .select({
      id: audits.id,
      targetUrl: audits.targetUrl,
      status: audits.status,
      scoreTotal: audits.scoreTotal,
      mode: audits.mode,
      createdAt: audits.createdAt,
      finishedAt: audits.finishedAt,
    })
    .from(audits)
    .where(eq(audits.organizationId, id))
    .orderBy(desc(audits.createdAt))
    .limit(20)

  return NextResponse.json({
    organization: orgRows[0],
    members: memberRows,
    recentAudits: recentAuditRows,
  })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

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

  const parsed = patchBody.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid body' }, { status: 422 })
  }

  const org = await db
    .select({
      id: organizations.id,
      plan: organizations.plan,
      stripeSubscriptionId: organizations.stripeSubscriptionId,
    })
    .from(organizations)
    .where(eq(organizations.id, id))
    .limit(1)

  if (!org.length) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // La garde Stripe ne s'applique qu'au champ `plan`
  if (parsed.data.plan !== undefined && org[0].stripeSubscriptionId) {
    return NextResponse.json(
      { error: 'Cette organisation a un abonnement Stripe actif. Modifiez le plan via le dashboard Stripe.' },
      { status: 409 },
    )
  }

  const updates: Partial<typeof organizations.$inferInsert> = {
    updatedAt: new Date(),
  }
  if (parsed.data.plan !== undefined) updates.plan = parsed.data.plan
  if (parsed.data.name !== undefined) updates.name = parsed.data.name
  if (parsed.data.slug !== undefined) {
    // Slug uniqueness check
    const slugConflict = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.slug, parsed.data.slug))
      .limit(1)
    if (slugConflict.length && slugConflict[0].id !== id) {
      return NextResponse.json({ error: 'Ce slug est déjà utilisé.' }, { status: 409 })
    }
    updates.slug = parsed.data.slug
  }
  if (parsed.data.description !== undefined) updates.description = parsed.data.description
  if (parsed.data.logoUrl !== undefined) updates.logoUrl = parsed.data.logoUrl
  if (parsed.data.auditUsage !== undefined) updates.auditUsage = parsed.data.auditUsage

  const updated = await db
    .update(organizations)
    .set(updates)
    .where(eq(organizations.id, id))
    .returning()

  const changedFields = Object.keys(parsed.data)
  logger.info('admin.org_updated', {
    org_id: id,
    changed_fields: changedFields,
    ...(parsed.data.plan !== undefined && { plan_from: org[0].plan, plan_to: parsed.data.plan }),
    ...(parsed.data.name !== undefined && { name: parsed.data.name }),
    ...(parsed.data.auditUsage !== undefined && { audit_usage: parsed.data.auditUsage }),
    by: ctx.email,
  })

  return NextResponse.json({ organization: updated[0] })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  let ctx
  try {
    ctx = await requireSuperAdmin(request)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    throw error
  }

  const org = await db
    .select({
      id: organizations.id,
      stripeSubscriptionId: organizations.stripeSubscriptionId,
    })
    .from(organizations)
    .where(eq(organizations.id, id))
    .limit(1)

  if (!org.length) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (org[0].stripeSubscriptionId) {
    return NextResponse.json(
      { error: 'Cette organisation a un abonnement Stripe actif. Résilier l\'abonnement avant de supprimer l\'organisation.' },
      { status: 409 },
    )
  }

  await db.delete(organizations).where(eq(organizations.id, id))

  logger.info('admin.org_deleted', { org_id: id, by: ctx.email })

  return NextResponse.json({ deleted: true })
}
