import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users, memberships, organizations } from '@/lib/db/schema'
import { authenticateRequest, AuthError } from '@/lib/auth/server'
import { requireSuperAdmin } from '@/lib/auth/super-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // Cas 1 : super-admin
  try {
    const ctx = await requireSuperAdmin(request)
    return NextResponse.json({
      isSuperAdmin: true,
      userId: ctx.userId,
      email: ctx.email,
      orgId: null,
      orgRole: null,
      orgName: null,
    })
  } catch (superError) {
    // Propager les erreurs 401 (token absent ou invalide) — pas de fallback org-admin
    if (superError instanceof AuthError && superError.status === 401) {
      return NextResponse.json({ error: superError.message }, { status: 401 })
    }
    // Continuer uniquement si 403 (authentifié mais pas super-admin)
    if (!(superError instanceof AuthError && superError.status === 403)) {
      throw superError
    }
  }

  // Cas 2 : org-admin (owner ou admin) — l'user est authentifié mais pas super-admin
  let user
  try {
    user = await authenticateRequest(request)
  } catch (authError) {
    if (authError instanceof AuthError) {
      return NextResponse.json({ error: authError.message }, { status: authError.status })
    }
    throw authError
  }

  // Chercher le premier membership avec rôle owner ou admin
  const memberRows = await db
    .select({
      organizationId: memberships.organizationId,
      role: memberships.role,
      orgName: organizations.name,
    })
    .from(memberships)
    .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
    .where(eq(memberships.userId, user.id))

  const adminMembership = memberRows.find((m) => m.role === 'owner' || m.role === 'admin')

  if (!adminMembership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Récupérer l'email depuis la table users locale
  const userRow = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1)

  const email = userRow[0]?.email ?? user.email

  return NextResponse.json({
    isSuperAdmin: false,
    userId: user.id,
    email,
    orgId: adminMembership.organizationId,
    orgRole: adminMembership.role,
    orgName: adminMembership.orgName,
  })
}
