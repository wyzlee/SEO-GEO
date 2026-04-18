import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe, planIdFromPriceId } from '@/lib/billing/stripe'
import { db } from '@/lib/db'
import { organizations } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { logger } from '@/lib/observability/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const payload = await request.text()
  const sig = request.headers.get('stripe-signature') ?? ''
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? ''

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(payload, sig, webhookSecret)
  } catch (err) {
    logger.warn('stripe webhook signature invalid', { err: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 })
  }

  const { type, data } = event

  if (
    type === 'customer.subscription.created' ||
    type === 'customer.subscription.updated' ||
    type === 'customer.subscription.deleted'
  ) {
    const sub = data.object as Stripe.Subscription
    // organizationId est dans les metadata de la subscription (propagé via
    // subscription_data.metadata lors de la Checkout Session).
    const orgIdFromMetadata = sub.metadata?.organizationId
    if (!orgIdFromMetadata) {
      logger.warn('stripe webhook: missing organizationId in subscription metadata', { subscriptionId: sub.id })
      return NextResponse.json({ ok: true })
    }

    // Défense en profondeur : croiser metadata.orgId avec l'org liée au
    // stripeCustomerId en DB. Empêche qu'un acteur qui contrôlerait les
    // metadata d'une subscription Stripe n'altère un autre org.
    const stripeCustomerId =
      typeof sub.customer === 'string' ? sub.customer : sub.customer.id
    const [ownerOrg] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.stripeCustomerId, stripeCustomerId))
      .limit(1)

    if (!ownerOrg) {
      logger.warn('stripe webhook: no org matches stripeCustomerId', {
        subscriptionId: sub.id,
        stripeCustomerId,
      })
      return NextResponse.json({ ok: true })
    }

    if (ownerOrg.id !== orgIdFromMetadata) {
      logger.error('stripe webhook: orgId mismatch metadata vs customer', {
        subscriptionId: sub.id,
        metadataOrgId: orgIdFromMetadata,
        customerOrgId: ownerOrg.id,
        stripeCustomerId,
      })
      return NextResponse.json(
        { error: 'orgId mismatch' },
        { status: 400 },
      )
    }

    const orgId = ownerOrg.id
    const priceId = sub.items.data[0]?.price.id ?? ''
    const planId =
      type === 'customer.subscription.deleted'
        ? 'discovery'
        : planIdFromPriceId(priceId)

    await db
      .update(organizations)
      .set({
        plan: planId,
        stripeSubscriptionId: sub.id,
        stripePriceId: priceId,
        subscriptionStatus: sub.status,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, orgId))

    logger.info('stripe subscription synced', { orgId, planId, status: sub.status })
  }

  if (type === 'invoice.payment_failed') {
    const invoice = data.object as Stripe.Invoice
    // Dans l'API Stripe 2026+ (dahlia), la référence à la subscription se trouve dans
    // invoice.parent.subscription_details.subscription (plus dans invoice.subscription).
    const subRef = invoice.parent?.subscription_details?.subscription ?? null
    const subscriptionId =
      typeof subRef === 'string' ? subRef : (subRef as Stripe.Subscription | null)?.id ?? null

    if (subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      const orgId = subscription.metadata?.organizationId
      if (orgId) {
        await db
          .update(organizations)
          .set({ subscriptionStatus: 'past_due', updatedAt: new Date() })
          .where(eq(organizations.id, orgId))

        logger.info('stripe.invoice.payment_failed', { orgId, subscriptionId })
      }
    }
  }

  return NextResponse.json({ ok: true })
}
