/**
 * Handlers MSW pour l'API Stripe.
 * Couvre les endpoints utilisés par lib/billing/stripe.ts.
 */
import { http, HttpResponse } from 'msw'

export const stripeHandlers = [
  http.post('https://api.stripe.com/v1/checkout/sessions', () => {
    return HttpResponse.json({
      id: 'cs_test_mock_001',
      url: 'https://checkout.stripe.com/pay/mock',
      status: 'open',
    })
  }),

  http.post('https://api.stripe.com/v1/billing_portal/sessions', () => {
    return HttpResponse.json({
      id: 'bps_test_mock_001',
      url: 'https://billing.stripe.com/session/mock',
    })
  }),
]
