import { NextResponse } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { memberships, users } from '@/lib/db/schema'
import { requireAdmin, resolveOrgId } from '@/lib/auth/require-admin'
import { AuthError } from '@/lib/auth/server'
import { logger } from '@/lib/observability/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const addMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['owner', 'admin', 'member']).default('member'),
})

/**
 * GET /api/admin/org/members
 *
 * Liste les membres de l'org courante de l'admin.
 * - Org-admin → filtré sur ctx.orgId
 * - Super-admin + header `x-org-id` → filtré sur cet orgId
 * - Super-admin sans header → 400 (orgId obligatoire pour ce endpoint scopé)
 */
export async function GET(request: Request) {
  let ctx
  try {
    ctx = await requireAdmin(request)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    throw error
  }

  let orgId: string | null
  try {
    orgId = await resolveOrgId(request, ctx)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    throw error
  }

  if (!orgId) {
    return NextResponse.json(
      { error: 'Super-admin : header x-org-id requis pour ce endpoint' },
      { status: 400 },
    )
  }

  const rows = await db
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
    .where(eq(memberships.organizationId, orgId))

  return NextResponse.json({ members: rows })
}

/**
 * POST /api/admin/org/members
 *
 * Ajoute un membre à l'org courante de l'admin.
 * Body : { userId: string (uuid), role?: 'owner'|'admin'|'member' }
 */
export async function POST(request: Request) {
  let ctx
  try {
    ctx = await requireAdmin(request)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    throw error
  }

  let orgId: string | null
  try {
    orgId = await resolveOrgId(request, ctx)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    throw error
  }

  if (!orgId) {
    return NextResponse.json(
      { error: 'Super-admin : header x-org-id requis pour ce endpoint' },
      { status: 400 },
    )
  }

  const body = await request.json().catch(() => null)
  const parsed = addMemberSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }

  const { userId, role } = parsed.data

  // Vérifier que l'utilisateur existe en DB (FK users.id)
  const userRow = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!userRow.length) {
    return NextResponse.json(
      { error: 'Utilisateur introuvable — sync Stack Auth requis' },
      { status: 404 },
    )
  }

  // Vérifier si le membership existe déjà (éviter le 500 sur unique constraint)
  const existing = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(and(eq(memberships.userId, userId), eq(memberships.organizationId, orgId)))
    .limit(1)

  if (existing.length) {
    return NextResponse.json(
      { error: 'Cet utilisateur est déjà membre de cette organisation' },
      { status: 409 },
    )
  }

  const [member] = await db
    .insert(memberships)
    .values({ userId, organizationId: orgId, role })
    .returning()

  logger.info('admin.member_added', {
    by: ctx.userId,
    org_id: orgId,
    target_user_id: userId,
    role,
  })

  return NextResponse.json(
    {
      member: {
        userId: member.userId,
        email: userRow[0].email,
        displayName: null,
        avatarUrl: null,
        role: member.role,
        joinedAt: member.createdAt,
      },
    },
    { status: 201 },
  )
}
