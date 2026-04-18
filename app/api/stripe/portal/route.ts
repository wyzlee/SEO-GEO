import { NextResponse } from 'next/server'
import { z } from 'zod'
import { stripe } from '@/lib/billing/stripe'
import { db } from '@/lib/db'
import { organizations } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { authenticateWithOrg, AuthError } from '@/lib/auth/server'
import { logger } from '@/lib/observability/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PortalSchema = z
  .object({
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

  const parsed = PortalSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Validation failed' },
      { status: 400 },
    )
  }

  const { organizationId } = parsed.data

  try {
    await authenticateWithOrg(request, organizationId)
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))

  if (!org?.stripeCustomerId) {
    return NextResponse.json({ error: 'No billing account' }, { status: 400 })
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? 'https://seo-geo-orcin.vercel.app'

  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${appUrl}/dashboard/settings/billing`,
  })

  logger.info('stripe portal session created', { orgId: organizationId, sessionId: session.id })

  return NextResponse.json({ url: session.url })
}
