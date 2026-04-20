/**
 * Handler MSW pour l'API Chrome UX Report (CrUX).
 * La réponse est conforme à la structure attendue par lib/audit/crux.ts.
 */
import { http, HttpResponse } from 'msw'

export const cruxHandlers = [
  http.post(
    'https://chromeuxreport.googleapis.com/v1/records:queryRecord',
    () => {
      return HttpResponse.json({
        record: {
          key: { url: 'https://example.com/', formFactor: 'PHONE' },
          metrics: {
            largest_contentful_paint: { percentiles: { p75: 2400 } },
            interaction_to_next_paint: { percentiles: { p75: 150 } },
            cumulative_layout_shift: { percentiles: { p75: 0.05 } },
          },
          collectionPeriod: {
            firstDate: { year: 2026, month: 3, day: 1 },
            lastDate: { year: 2026, month: 3, day: 28 },
          },
        },
      })
    },
  ),
]
