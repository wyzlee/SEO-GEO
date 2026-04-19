import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { requireSuperAdmin } from '@/lib/auth/super-admin'
import { AuthError } from '@/lib/auth/server'
import { sendMagicLink } from '@/lib/auth/stack-auth-admin'
import { logger } from '@/lib/observability/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

  const userRow = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, id))
    .limit(1)

  if (!userRow.length) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { email } = userRow[0]
  const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`

  try {
    await sendMagicLink(email, redirectUrl)
  } catch (err) {
    logger.error('admin.magic_link_failed', {
      target_user_id: id,
      by: ctx.email,
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json(
      { error: "Échec d'envoi du magic link. Vérifier les logs Stack Auth." },
      { status: 502 },
    )
  }

  logger.info('admin.magic_link_sent', {
    target_user_id: id,
    by: ctx.email,
  })

  return NextResponse.json({ sent: true })
}
