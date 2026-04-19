import { NextResponse } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { memberships } from '@/lib/db/schema'
import { requireSuperAdmin } from '@/lib/auth/super-admin'
import { AuthError } from '@/lib/auth/server'
import { logger } from '@/lib/observability/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const patchBody = z.object({
  role: z.enum(['owner', 'admin', 'member']),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  const { id, userId } = await params

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

  // Vérifier que le membership existe
  const existing = await db
    .select({ id: memberships.id, role: memberships.role })
    .from(memberships)
    .where(and(eq(memberships.userId, userId), eq(memberships.organizationId, id)))
    .limit(1)

  if (!existing.length) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const [updated] = await db
    .update(memberships)
    .set({ role: parsed.data.role })
    .where(and(eq(memberships.userId, userId), eq(memberships.organizationId, id)))
    .returning({
      userId: memberships.userId,
      role: memberships.role,
    })

  logger.info('admin.member_role_changed', {
    org_id: id,
    user_id: userId,
    role_from: existing[0].role,
    role_to: parsed.data.role,
    by: ctx.email,
  })

  return NextResponse.json({ member: updated })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  const { id, userId } = await params

  let ctx
  try {
    ctx = await requireSuperAdmin(request)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    throw error
  }

  // Vérifier que le membership existe avant suppression
  const existing = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(and(eq(memberships.userId, userId), eq(memberships.organizationId, id)))
    .limit(1)

  if (!existing.length) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await db
    .delete(memberships)
    .where(and(eq(memberships.userId, userId), eq(memberships.organizationId, id)))

  logger.info('admin.member_removed', {
    org_id: id,
    user_id: userId,
    by: ctx.email,
  })

  return NextResponse.json({ deleted: true })
}
