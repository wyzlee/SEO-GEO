/**
 * Handler MSW pour l'API Anthropic (v1/messages).
 * La réponse simule un appel tool_use `generate_brief` conforme au schéma
 * contentBriefClaudeResponseSchema de lib/types/briefs.ts.
 */
import { http, HttpResponse } from 'msw'

export const anthropicHandlers = [
  http.post('https://api.anthropic.com/v1/messages', () => {
    return HttpResponse.json({
      id: 'msg_mock_001',
      type: 'message',
      role: 'assistant',
      content: [
        {
          type: 'tool_use',
          id: 'tool_001',
          name: 'generate_brief',
          input: {
            title: 'Comment optimiser son contenu SEO en 2026',
            targetKeyword: 'optimisation contenu SEO',
            searchIntent: 'informational',
            contentType: 'pillar',
            wordCountTarget: 2500,
            outline: {
              h2: ['Introduction au SEO 2026', 'Signaux E-E-A-T', 'GEO et LLMs'],
              h3_per_h2: [
                ['Contexte et enjeux', 'Mutations algorithmiques'],
                ['Experience', 'Expertise', 'Authority', 'Trust'],
                ['Optimisation pour ChatGPT', 'Perplexity et Gemini'],
              ],
            },
            eeatAngle: 'Démontrer une expérience terrain avec des cas clients réels et des métriques vérifiables.',
            semanticKeywords: [
              'stratégie contenu',
              'référencement naturel',
              'intent de recherche',
              'semantic SEO',
              'content gap',
            ],
          },
        },
      ],
      model: 'claude-sonnet-4-6',
      stop_reason: 'tool_use',
      usage: {
        input_tokens: 100,
        output_tokens: 50,
        cache_read_input_tokens: 80,
        cache_creation_input_tokens: 0,
      },
    })
  }),
]
