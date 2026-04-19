import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { audits } from '@/lib/db/schema'
import { requireSuperAdmin } from '@/lib/auth/super-admin'
import { AuthError } from '@/lib/auth/server'
import { logger } from '@/lib/observability/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

  const existing = await db
    .select({ id: audits.id })
    .from(audits)
    .where(eq(audits.id, id))
    .limit(1)

  if (!existing.length) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await db.delete(audits).where(eq(audits.id, id))

  logger.info('admin.audit_deleted', { audit_id: id, by: ctx.email })

  return NextResponse.json({ deleted: true })
}
