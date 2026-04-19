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

const patchMemberSchema = z.object({
  role: z.enum(['owner', 'admin', 'member']),
})

type RouteParams = { params: Promise<{ userId: string }> }

/**
 * Résout l'orgId et valide que le membre cible appartient bien à cette org.
 * Retourne { orgId, membership } ou une NextResponse d'erreur.
 */
async function resolveContext(
  request: Request,
  targetUserId: string,
): Promise<{ orgId: string; membershipId: string } | NextResponse> {
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

  // Vérifier que le membre cible est bien dans cette org (404 opaque — pas de fuite)
  const memberRow = await db
    .select({ id: memberships.id, role: memberships.role })
    .from(memberships)
    .where(and(eq(memberships.userId, targetUserId), eq(memberships.organizationId, orgId)))
    .limit(1)

  if (!memberRow.length) {
    return NextResponse.json({ error: 'Membre introuvable dans cette organisation' }, { status: 404 })
  }

  return { orgId, membershipId: memberRow[0].id }
}

/**
 * PATCH /api/admin/org/members/[userId]
 *
 * Modifie le rôle d'un membre de l'org courante.
 * Body : { role: 'owner'|'admin'|'member' }
 *
 * TODO: ajouter une garde pour empêcher la suppression du dernier owner.
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const { userId: targetUserId } = await params

  const resolved = await resolveContext(request, targetUserId)
  if (resolved instanceof NextResponse) return resolved

  const body = await request.json().catch(() => null)
  const parsed = patchMemberSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }

  const { role } = parsed.data

  const [updated] = await db
    .update(memberships)
    .set({ role })
    .where(eq(memberships.id, resolved.membershipId))
    .returning()

  // Récupérer l'email pour la réponse enrichie
  const userRow = await db
    .select({ email: users.email, displayName: users.displayName, avatarUrl: users.avatarUrl })
    .from(users)
    .where(eq(users.id, targetUserId))
    .limit(1)

  logger.info('admin.member_role_changed', {
    org_id: resolved.orgId,
    target_user_id: targetUserId,
    new_role: role,
  })

  return NextResponse.json({
    member: {
      userId: updated.userId,
      email: userRow[0]?.email ?? '',
      displayName: userRow[0]?.displayName ?? null,
      avatarUrl: userRow[0]?.avatarUrl ?? null,
      role: updated.role,
      joinedAt: updated.createdAt,
    },
  })
}

/**
 * DELETE /api/admin/org/members/[userId]
 *
 * Retire un membre de l'org courante.
 *
 * TODO: ajouter une garde pour empêcher la suppression du dernier owner.
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const { userId: targetUserId } = await params

  const resolved = await resolveContext(request, targetUserId)
  if (resolved instanceof NextResponse) return resolved

  await db
    .delete(memberships)
    .where(eq(memberships.id, resolved.membershipId))

  logger.info('admin.member_removed', {
    org_id: resolved.orgId,
    target_user_id: targetUserId,
  })

  return NextResponse.json({ removed: true })
}
