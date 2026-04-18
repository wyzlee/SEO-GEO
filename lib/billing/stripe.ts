import Stripe from 'stripe'

// Lazy singleton : le SDK Stripe instantiate throw si STRIPE_SECRET_KEY manque
// (versions récentes). Import-time throw casserait tests, dev sans Stripe et
// builds CI. L'accès réel aux méthodes reste fail-loud.
let _stripe: Stripe | null = null

function createStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error(
      'STRIPE_SECRET_KEY non défini — client Stripe indisponible. ' +
        'Configurer la clé dans .env.local (dev) ou Vercel env (prod).',
    )
  }
  return new Stripe(key, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    apiVersion: '2026-03-25.dahlia' as any,
    typescript: true,
  })
}

export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    if (!_stripe) _stripe = createStripe()
    const value = Reflect.get(_stripe as object, prop, receiver)
    return typeof value === 'function' ? value.bind(_stripe) : value
  },
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
