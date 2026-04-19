import { NextResponse } from 'next/server'
import { and, eq, desc } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { orgAdminGrants, users, organizations } from '@/lib/db/schema'
import { requireSuperAdmin } from '@/lib/auth/super-admin'
import { AuthError } from '@/lib/auth/server'
import { logger } from '@/lib/observability/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const postBody = z.object({
  userId: z.string().uuid(),
  orgId: z.string().uuid(),
})

export async function GET(request: Request) {
  let ctx
  try {
    ctx = await requireSuperAdmin(request)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    throw error
  }

  // Drizzle ne supporte pas les self-joins nommés directement sans alias via SQL.
  // On fait deux passes légères : grants + lookup users/orgs (volumétrie admin faible).
  const allGrants = await db
    .select({
      id: orgAdminGrants.id,
      userId: orgAdminGrants.userId,
      orgId: orgAdminGrants.orgId,
      grantedBy: orgAdminGrants.grantedBy,
      createdAt: orgAdminGrants.createdAt,
    })
    .from(orgAdminGrants)
    .orderBy(desc(orgAdminGrants.createdAt))

  if (!allGrants.length) {
    void ctx
    return NextResponse.json({ grants: [] })
  }

  const [allUsers, allOrgs] = await Promise.all([
    db
      .select({ id: users.id, email: users.email, displayName: users.displayName })
      .from(users),
    db
      .select({ id: organizations.id, name: organizations.name })
      .from(organizations),
  ])

  const userMap = Object.fromEntries(allUsers.map((u) => [u.id, u]))
  const orgMap = Object.fromEntries(allOrgs.map((o) => [o.id, o]))

  const grants = allGrants.map((g) => ({
    id: g.id,
    userId: g.userId,
    userEmail: userMap[g.userId]?.email ?? '',
    userDisplayName: userMap[g.userId]?.displayName ?? null,
    orgId: g.orgId,
    orgName: orgMap[g.orgId]?.name ?? '',
    grantedBy: g.grantedBy,
    grantedByEmail: userMap[g.grantedBy]?.email ?? '',
    createdAt: g.createdAt,
  }))

  void ctx
  return NextResponse.json({ grants })
}

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

  const { userId, orgId } = parsed.data

  // Vérifier que user et org existent
  const [userRows, orgRows] = await Promise.all([
    db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1),
    db.select({ id: organizations.id }).from(organizations).where(eq(organizations.id, orgId)).limit(1),
  ])

  if (!userRows.length) {
    return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 })
  }
  if (!orgRows.length) {
    return NextResponse.json({ error: 'Organisation introuvable.' }, { status: 404 })
  }

  // onConflictDoNothing retourne [] si le grant existe déjà — on re-query pour être idempotent
  const inserted = await db
    .insert(orgAdminGrants)
    .values({ userId, orgId, grantedBy: ctx.userId })
    .onConflictDoNothing()
    .returning()

  if (inserted.length) {
    logger.info('admin.org_grant_created', {
      target_user_id: userId,
      org_id: orgId,
      grant_id: inserted[0].id,
      by: ctx.email,
    })
    return NextResponse.json({ grant: { id: inserted[0].id, userId, orgId } }, { status: 201 })
  }

  // Grant déjà existant — re-query sur (userId, orgId) et retourner 200 (idempotent)
  const existing = await db
    .select({ id: orgAdminGrants.id })
    .from(orgAdminGrants)
    .where(and(eq(orgAdminGrants.userId, userId), eq(orgAdminGrants.orgId, orgId)))
    .limit(1)

  // existing[0] doit exister — si ce n'est pas le cas, c'est un bug inattendu
  return NextResponse.json(
    { grant: { id: existing[0].id, userId, orgId } },
    { status: 200 },
  )
}
