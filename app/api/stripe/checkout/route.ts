import { NextResponse } from 'next/server'
import { z } from 'zod'
import { stripe, PLANS } from '@/lib/billing/stripe'
import { db } from '@/lib/db'
import { organizations } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { authenticateWithOrg, AuthError } from '@/lib/auth/server'
import { logger } from '@/lib/observability/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CheckoutSchema = z
  .object({
    planId: z.enum(['studio', 'agency']),
    organizationId: z.string().uuid(),
  })
  .strict()

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = CheckoutSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Validation failed' },
      { status: 400 },
    )
  }

  const { planId, organizationId } = parsed.data

  // Vérifie l'identité ET l'appartenance à l'org — évite qu'un user initie
  // la facturation d'une org à laquelle il n'appartient pas.
  let ctx
  try {
    ctx = await authenticateWithOrg(request, organizationId)
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }

  const plan = PLANS[planId]

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  // Créer ou récupérer le customer Stripe
  let customerId = org.stripeCustomerId
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: ctx.user.email || undefined,
      metadata: { organizationId, userId: ctx.user.id },
    })
    customerId = customer.id
    await db
      .update(organizations)
      .set({ stripeCustomerId: customerId })
      .where(eq(organizations.id, organizationId))
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? 'https://seo-geo-orcin.vercel.app'

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: plan.priceId ?? '', quantity: 1 }],
    // Les metadata sur subscription_data permettent au webhook de retrouver
    // l'orgId lors des events customer.subscription.* (les metadata de session
    // ne sont pas propagées sur la subscription elle-même).
    subscription_data: {
      metadata: { organizationId, planId },
    },
    success_url: `${appUrl}/dashboard/settings/billing?success=1`,
    cancel_url: `${appUrl}/dashboard/settings/billing?canceled=1`,
    metadata: { organizationId, planId },
  })

  logger.info('stripe checkout session created', { orgId: organizationId, planId, sessionId: session.id })

  return NextResponse.json({ url: session.url })
}
