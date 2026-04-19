import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { requireSuperAdmin } from '@/lib/auth/super-admin'
import { AuthError } from '@/lib/auth/server'
import { logger } from '@/lib/observability/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const patchBody = z.object({
  isSuperAdmin: z.boolean().optional(),
  displayName: z.string().min(1).max(100).optional(),
})

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

  // Empêcher un super-admin de se retirer ses propres droits
  if (id === ctx.userId && parsed.data.isSuperAdmin === false) {
    return NextResponse.json(
      { error: 'Vous ne pouvez pas retirer votre propre statut super-admin.' },
      { status: 403 },
    )
  }

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, id))
    .limit(1)

  if (!existing.length) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const updateValues: Partial<typeof users.$inferInsert> = {
    updatedAt: new Date(),
  }
  if (parsed.data.isSuperAdmin !== undefined) {
    updateValues.isSuperAdmin = parsed.data.isSuperAdmin
  }
  if (parsed.data.displayName !== undefined) {
    updateValues.displayName = parsed.data.displayName
  }

  const [updated] = await db
    .update(users)
    .set(updateValues)
    .where(eq(users.id, id))
    .returning()

  logger.info('admin.user_updated', {
    target_user_id: id,
    fields: Object.keys(parsed.data),
    by: ctx.email,
  })

  return NextResponse.json({ user: updated })
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

  // Empêcher un super-admin de se supprimer lui-même
  if (id === ctx.userId) {
    return NextResponse.json(
      { error: 'Vous ne pouvez pas supprimer votre propre compte.' },
      { status: 403 },
    )
  }

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, id))
    .limit(1)

  if (!existing.length) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Les FK sur audits.created_by, scheduled_audits.created_by, benchmarks.created_by,
  // invitations.invited_by sont en NO ACTION par défaut. Intercepter le 23503 pour
  // retourner un 409 lisible plutôt qu'un 500 opaque.
  try {
    await db.delete(users).where(eq(users.id, id))
  } catch (error) {
    const pgError = error as { code?: string }
    if (pgError.code === '23503') {
      return NextResponse.json(
        { error: 'Cet utilisateur a des ressources liées (audits, invitations, etc.). Transférer ou supprimer ces ressources avant de supprimer le compte.' },
        { status: 409 },
      )
    }
    throw error
  }

  logger.info('admin.user_deleted', { target_user_id: id, by: ctx.email })

  return NextResponse.json({ deleted: true })
}
