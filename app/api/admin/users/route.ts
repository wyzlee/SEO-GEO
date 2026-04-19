import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users, memberships, organizations } from '@/lib/db/schema'
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

  const allUsers = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      isSuperAdmin: users.isSuperAdmin,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(users.createdAt)

  const allMemberships = await db
    .select({
      userId: memberships.userId,
      organizationId: memberships.organizationId,
      organizationName: organizations.name,
      role: memberships.role,
    })
    .from(memberships)
    .innerJoin(organizations, eq(memberships.organizationId, organizations.id))

  const membershipMap: Record<string, typeof allMemberships> = {}
  for (const m of allMemberships) {
    if (!membershipMap[m.userId]) membershipMap[m.userId] = []
    membershipMap[m.userId].push(m)
  }

  return NextResponse.json({
    users: allUsers.map((u) => ({
      ...u,
      memberships: membershipMap[u.id] ?? [],
    })),
  })
}
