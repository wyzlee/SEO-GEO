import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { scheduledAudits } from '@/lib/db/schema'
import { authenticateAuto, AuthError } from '@/lib/auth/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let ctx
  try {
    ctx = await authenticateAuto(request)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    throw error
  }

  const { id } = await params

  const deleted = await db
    .delete(scheduledAudits)
    .where(
      and(
        eq(scheduledAudits.id, id),
        eq(scheduledAudits.organizationId, ctx.organizationId),
      ),
    )
    .returning({ id: scheduledAudits.id })

  if (!deleted.length) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return new NextResponse(null, { status: 204 })
}
