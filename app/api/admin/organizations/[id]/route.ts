import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { organizations } from '@/lib/db/schema'
import { requireSuperAdmin } from '@/lib/auth/super-admin'
import { AuthError } from '@/lib/auth/server'
import { logger } from '@/lib/observability/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const patchBody = z.object({
  plan: z.enum(['discovery', 'studio', 'agency']),
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

  // Vérifier que l'org n'a pas de sub Stripe active (éviter drift)
  const org = await db
    .select({ stripeSubscriptionId: organizations.stripeSubscriptionId, plan: organizations.plan })
    .from(organizations)
    .where(eq(organizations.id, id))
    .limit(1)

  if (!org.length) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (org[0].stripeSubscriptionId) {
    return NextResponse.json(
      { error: 'Cette organisation a un abonnement Stripe actif. Modifiez le plan via le dashboard Stripe.' },
      { status: 409 },
    )
  }

  const updated = await db
    .update(organizations)
    .set({ plan: parsed.data.plan, updatedAt: new Date() })
    .where(eq(organizations.id, id))
    .returning()

  logger.info('admin.org_plan_changed', {
    org_id: id,
    from: org[0].plan,
    to: parsed.data.plan,
    by: ctx.email,
  })

  return NextResponse.json({ organization: updated[0] })
}
