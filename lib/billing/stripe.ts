import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  // La version 2026-03-25.dahlia est la LatestApiVersion selon le package installé (v22.0.2).
  // Le cast `as never` contourne la contrainte de type — safer que d'importer LatestApiVersion
  // dont l'export n'est pas stable entre les versions majeures du package.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apiVersion: '2026-03-25.dahlia' as any,
  typescript: true,
})

export const PLANS = {
  discovery: {
    id: 'discovery',
    name: 'Découverte',
    priceId: null as string | null,
    priceMonthly: 0,
    auditLimit: 1,
  },
  studio: {
    id: 'studio',
    name: 'Studio',
    priceId: (process.env.STRIPE_PRICE_STUDIO_MONTHLY ?? '') as string,
    priceMonthly: 490,
    auditLimit: 20,
  },
  agency: {
    id: 'agency',
    name: 'Agency',
    priceId: (process.env.STRIPE_PRICE_AGENCY_MONTHLY ?? '') as string,
    priceMonthly: 990,
    auditLimit: -1, // illimité
  },
} as const

export type PlanId = keyof typeof PLANS

/**
 * Retrouve l'ID de plan à partir d'un priceId Stripe.
 * Retourne 'discovery' si aucun plan ne correspond.
 */
export function planIdFromPriceId(priceId: string): PlanId {
  for (const [id, plan] of Object.entries(PLANS)) {
    if (plan.priceId && plan.priceId === priceId) return id as PlanId
  }
  return 'discovery'
}
