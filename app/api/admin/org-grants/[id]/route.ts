import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { orgAdminGrants } from '@/lib/db/schema'
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
    .select({ id: orgAdminGrants.id, userId: orgAdminGrants.userId, orgId: orgAdminGrants.orgId })
    .from(orgAdminGrants)
    .where(eq(orgAdminGrants.id, id))
    .limit(1)

  if (!existing.length) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await db.delete(orgAdminGrants).where(eq(orgAdminGrants.id, id))

  logger.info('admin.org_grant_revoked', {
    grant_id: id,
    target_user_id: existing[0].userId,
    org_id: existing[0].orgId,
    by: ctx.email,
  })

  return NextResponse.json({ deleted: true })
}
