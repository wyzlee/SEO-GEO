/**
 * Serveur MSW pour les tests Node.js / Vitest.
 * Intercepte tous les appels fetch vers les APIs externes :
 *   - Anthropic (claude)
 *   - Stripe (billing)
 *   - Perplexity (brand mentions)
 *   - CrUX (Core Web Vitals)
 *   - Wikidata (entity lookup)
 *
 * Usage : importer `server` dans tests qui nécessitent un override de handler :
 *   server.use(http.post('https://api.anthropic.com/...', () => HttpResponse.error()))
 */
import { setupServer } from 'msw/node'
import { anthropicHandlers } from './handlers/anthropic'
import { stripeHandlers } from './handlers/stripe'
import { perplexityHandlers } from './handlers/perplexity'
import { cruxHandlers } from './handlers/crux'
import { wikidataHandlers } from './handlers/wikidata'

export const server = setupServer(
  ...anthropicHandlers,
  ...stripeHandlers,
  ...perplexityHandlers,
  ...cruxHandlers,
  ...wikidataHandlers,
)
