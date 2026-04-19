/**
 * Intégration OpenAI Responses API avec web_search_preview — détection de citations.
 *
 * - Modèle : gpt-4o-mini (ou OPENAI_SEARCH_MODEL env)
 * - Endpoint : https://api.openai.com/v1/responses
 * - Outil : web_search_preview
 * - Timeout : 30s
 * - rawResponse tronquée à 8 Ko avant stockage
 */
import { logger } from '@/lib/observability/logger'

const OPENAI_RESPONSES_ENDPOINT = 'https://api.openai.com/v1/responses'
const RAW_RESPONSE_MAX_BYTES = 8_192

export interface OpenAISearchResult {
  rawResponse: string
  responseText: string
  citationUrls: string[]
}

export async function callOpenAISearch(query: string): Promise<OpenAISearchResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY absent')

  const model = process.env.OPENAI_SEARCH_MODEL ?? 'gpt-4o-mini'

  const requestBody = {
    model,
    tools: [{ type: 'web_search_preview' }],
    input: query,
  }

  const signal = AbortSignal.timeout(30_000)

  let response: Response
  try {
    response = await fetch(OPENAI_RESPONSES_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal,
    })
  } catch (err) {
    logger.error('openai_search.fetch_error', {
      query_length: query.length,
      error: err instanceof Error ? err.message : String(err),
    })
    throw new Error(`OpenAI fetch failed: ${err instanceof Error ? err.message : String(err)}`)
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    logger.error('openai_search.api_error', {
      status: response.status,
      error_length: errorText.length,
    })
    throw new Error(`OpenAI API error: HTTP ${response.status}`)
  }

  const data = await response.json() as Record<string, unknown>

  // Parser la réponse : l'API Responses retourne un tableau `output`
  const output = data.output as Array<Record<string, unknown>> | undefined
  let responseText = ''
  const citationUrls: string[] = []

  if (Array.isArray(output)) {
    for (const item of output) {
      const itemType = item.type as string | undefined

      // Message texte principal
      if (itemType === 'message') {
        const content = item.content as Array<Record<string, unknown>> | undefined
        if (Array.isArray(content)) {
          for (const block of content) {
            if (block.type === 'output_text') {
              responseText += (block.text as string) ?? ''
              // Extraire les annotations (citations URLs)
              const annotations = block.annotations as Array<Record<string, unknown>> | undefined
              if (Array.isArray(annotations)) {
                for (const ann of annotations) {
                  if (ann.type === 'url_citation' && typeof ann.url === 'string') {
                    citationUrls.push(ann.url)
                  }
                }
              }
            }
          }
        }
      }

      // Résultats de recherche web (web_search_call results)
      if (itemType === 'web_search_call') {
        // Les URLs de recherche sont dans output des tool results
        const results = item.results as Array<Record<string, unknown>> | undefined
        if (Array.isArray(results)) {
          for (const r of results) {
            if (typeof r.url === 'string') citationUrls.push(r.url)
          }
        }
      }
    }
  }

  // Tronquer rawResponse avant stockage
  const fullRaw = JSON.stringify(data)
  const rawResponse = fullRaw.length > RAW_RESPONSE_MAX_BYTES
    ? fullRaw.slice(0, RAW_RESPONSE_MAX_BYTES) + '…[truncated]'
    : fullRaw

  logger.info('openai_search.success', {
    query_length: query.length,
    response_length: responseText.length,
    citation_count: citationUrls.length,
  })

  return { rawResponse, responseText, citationUrls }
}
