/**
 * Handler MSW pour l'API Perplexity Sonar.
 * La réponse est conforme à la structure attendue par lib/integrations/perplexity.ts.
 */
import { http, HttpResponse } from 'msw'

export const perplexityHandlers = [
  http.post('https://api.perplexity.ai/chat/completions', () => {
    return HttpResponse.json({
      id: 'perp_mock_001',
      choices: [
        {
          message: {
            content:
              'Le site example.com est mentionné dans plusieurs articles de référence sur le SEO technique.',
            role: 'assistant',
          },
        },
      ],
      citations: [
        'https://moz.com/blog/example-reference',
        'https://search.google.com/test/example',
      ],
    })
  }),
]
