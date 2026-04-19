import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { requireSuperAdmin } from '@/lib/auth/super-admin'
import { AuthError } from '@/lib/auth/server'
import {
  suspendStackAuthUser,
  unsuspendStackAuthUser,
  updateStackAuthUserEmail,
} from '@/lib/auth/stack-auth-admin'
import { logger } from '@/lib/observability/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const patchBody = z.object({
  isSuperAdmin: z.boolean().optional(),
  displayName: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
  email: z.string().email().optional(),
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

  // Gardes auto-modification : un super-admin ne peut pas s'affecter ces actions
  if (id === ctx.userId && parsed.data.isSuperAdmin === false) {
    return NextResponse.json(
      { error: 'Vous ne pouvez pas retirer votre propre statut super-admin.' },
      { status: 403 },
    )
  }
  if (id === ctx.userId && parsed.data.isActive === false) {
    return NextResponse.json(
      { error: 'Vous ne pouvez pas désactiver votre propre compte.' },
      { status: 403 },
    )
  }
  if (id === ctx.userId && parsed.data.email !== undefined) {
    return NextResponse.json(
      { error: 'Vous ne pouvez pas modifier votre propre email depuis cette interface.' },
      { status: 403 },
    )
  }

  const existing = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.id, id))
    .limit(1)

  if (!existing.length) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Si changement d'email : appeler Stack Auth AVANT la DB pour éviter divergence d'état
  if (parsed.data.email !== undefined && parsed.data.email !== existing[0].email) {
    // Vérification d'unicité préventive (avant d'appeler Stack Auth)
    const conflict = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, parsed.data.email))
      .limit(1)
    if (conflict.length && conflict[0].id !== id) {
      return NextResponse.json(
        { error: 'Cet email est déjà utilisé par un autre compte.' },
        { status: 409 },
      )
    }

    try {
      await updateStackAuthUserEmail(id, parsed.data.email)
    } catch (err) {
      logger.error('admin.user_email_update_stack_failed', {
        target_user_id: id,
        by: ctx.email,
        error: err instanceof Error ? err.message : String(err),
      })
      return NextResponse.json(
        { error: "Échec de la mise à jour de l'email dans Stack Auth. Aucune modification effectuée." },
        { status: 502 },
      )
    }
  }

  const updateValues: Partial<typeof users.$inferInsert> = {
    updatedAt: new Date(),
  }
  if (parsed.data.isSuperAdmin !== undefined) updateValues.isSuperAdmin = parsed.data.isSuperAdmin
  if (parsed.data.displayName !== undefined) updateValues.displayName = parsed.data.displayName
  if (parsed.data.isActive !== undefined) updateValues.isActive = parsed.data.isActive
  if (parsed.data.email !== undefined) updateValues.email = parsed.data.email

  let updated: typeof users.$inferSelect
  try {
    const rows = await db
      .update(users)
      .set(updateValues)
      .where(eq(users.id, id))
      .returning()
    updated = rows[0]
  } catch (err) {
    const pgError = err as { code?: string }
    if (pgError.code === '23505') {
      return NextResponse.json(
        { error: 'Cet email est déjà utilisé par un autre compte.' },
        { status: 409 },
      )
    }
    throw err
  }

  // Synchroniser la suspension Stack Auth en best-effort (ne bloque pas si ça échoue —
  // les fonctions suspend/unsuspend absorbent l'erreur et loggent un warn)
  if (parsed.data.isActive !== undefined) {
    if (parsed.data.isActive) {
      await unsuspendStackAuthUser(id)
    } else {
      await suspendStackAuthUser(id)
    }
  }

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
