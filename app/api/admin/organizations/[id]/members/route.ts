import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { organizations, users, memberships } from '@/lib/db/schema'
import { requireSuperAdmin } from '@/lib/auth/super-admin'
import { AuthError } from '@/lib/auth/server'
import { logger } from '@/lib/observability/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const postBody = z.object({
  userId: z.string().uuid(),
  role: z.enum(['owner', 'admin', 'member']).default('member'),
})

export async function POST(
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

  const parsed = postBody.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid body' }, { status: 422 })
  }

  // Vérifier que l'org existe
  const orgRows = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.id, id))
    .limit(1)

  if (!orgRows.length) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Vérifier que le user existe dans la table locale
  const userRows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, parsed.data.userId))
    .limit(1)

  if (!userRows.length) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const [member] = await db
    .insert(memberships)
    .values({
      userId: parsed.data.userId,
      organizationId: id,
      role: parsed.data.role,
    })
    .onConflictDoUpdate({
      target: [memberships.userId, memberships.organizationId],
      set: { role: parsed.data.role },
    })
    .returning({
      userId: memberships.userId,
      role: memberships.role,
    })

  logger.info('admin.member_added', {
    org_id: id,
    user_id: parsed.data.userId,
    role: parsed.data.role,
    by: ctx.email,
  })

  return NextResponse.json({ member }, { status: 201 })
}
