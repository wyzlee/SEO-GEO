/**
 * Intégration Perplexity Sonar — détection de citations domaine.
 *
 * - Modèle : sonar (sonar-pro si disponible via PERPLEXITY_MODEL env)
 * - Endpoint : https://api.perplexity.ai/chat/completions
 * - Timeout : 30s
 * - rawResponse tronquée à 8 Ko avant stockage
 */
import { logger } from '@/lib/observability/logger'

const PERPLEXITY_ENDPOINT = 'https://api.perplexity.ai/chat/completions'
const RAW_RESPONSE_MAX_BYTES = 8_192

export interface PerplexityResult {
  rawResponse: string
  responseText: string
  citationUrls: string[]
}

export async function callPerplexity(query: string): Promise<PerplexityResult> {
  const apiKey = process.env.PERPLEXITY_API_KEY
  if (!apiKey) throw new Error('PERPLEXITY_API_KEY absent')

  const model = process.env.PERPLEXITY_MODEL ?? 'sonar'

  const requestBody = {
    model,
    messages: [
      {
        role: 'system',
        content: 'Tu es un assistant de recherche. Réponds à la question avec les sources.',
      },
      {
        role: 'user',
        content: query,
      },
    ],
  }

  const signal = AbortSignal.timeout(30_000)

  let response: Response
  try {
    response = await fetch(PERPLEXITY_ENDPOINT, {
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
    logger.error('perplexity.fetch_error', {
      query_length: query.length,
      error: err instanceof Error ? err.message : String(err),
    })
    throw new Error(`Perplexity fetch failed: ${err instanceof Error ? err.message : String(err)}`)
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    logger.error('perplexity.api_error', {
      status: response.status,
      error_length: errorText.length,
    })
    throw new Error(`Perplexity API error: HTTP ${response.status}`)
  }

  const data = await response.json() as Record<string, unknown>

  // Extraire le texte de la réponse
  const choices = data.choices as Array<Record<string, unknown>> | undefined
  const firstChoice = choices?.[0] ?? {}
  const message = firstChoice.message as Record<string, unknown> | undefined
  const responseText = (message?.content as string) ?? ''

  // Extraire les citations (array de strings URLs dans la réponse Perplexity)
  const citationUrls: string[] = []
  const rawCitations = data.citations
  if (Array.isArray(rawCitations)) {
    for (const c of rawCitations) {
      if (typeof c === 'string') citationUrls.push(c)
      else if (typeof c === 'object' && c !== null && 'url' in c && typeof (c as Record<string,unknown>).url === 'string') {
        citationUrls.push((c as Record<string,unknown>).url as string)
      }
    }
  }

  // Tronquer rawResponse avant stockage
  const fullRaw = JSON.stringify(data)
  const rawResponse = fullRaw.length > RAW_RESPONSE_MAX_BYTES
    ? fullRaw.slice(0, RAW_RESPONSE_MAX_BYTES) + '…[truncated]'
    : fullRaw

  logger.info('perplexity.success', {
    query_length: query.length,
    response_length: responseText.length,
    citation_count: citationUrls.length,
  })

  return { rawResponse, responseText, citationUrls }
}
