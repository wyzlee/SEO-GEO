/**
 * Citation Monitor — orchestrateur pour détecter si un domaine est cité
 * par les LLMs (Perplexity ou OpenAI web search).
 *
 * Usage :
 *   const result = await checkCitation({ domain: 'wyzlee.com', query: '...', tool: 'perplexity' })
 */
import { normalizeDomain, extractDomains } from './domain-utils'
import { callPerplexity } from './perplexity'
import { callOpenAISearch } from './openai-search'
import { logger } from '@/lib/observability/logger'

export interface CitationResult {
  tool: 'perplexity' | 'openai'
  query: string
  isCited: boolean
  competitorDomainsCited: string[]
  rawResponse: string
}

export async function checkCitation(params: {
  domain: string
  query: string
  tool: 'perplexity' | 'openai'
}): Promise<CitationResult> {
  const { domain, query, tool } = params
  const normalizedTarget = normalizeDomain(domain)

  if (!normalizedTarget) {
    throw new Error(`Domaine invalide : ${domain}`)
  }

  let rawResponse: string
  let responseText: string
  let citationUrls: string[]

  if (tool === 'perplexity') {
    const result = await callPerplexity(query)
    rawResponse = result.rawResponse
    responseText = result.responseText
    citationUrls = result.citationUrls
  } else {
    const result = await callOpenAISearch(query)
    rawResponse = result.rawResponse
    responseText = result.responseText
    citationUrls = result.citationUrls
  }

  // Extraire tous les domaines présents dans la réponse (texte + URLs explicites)
  const allDomains = extractDomains(responseText, citationUrls)

  // Le domaine cible est-il mentionné ?
  // Deux stratégies combinées :
  // 1. Présence de l'URL/domaine extrait (ex: https://wyzlee.com dans une liste)
  // 2. Mention textuelle directe (ex: "wyzlee.com est cité" sans https://)
  const escapedDomain = normalizedTarget.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const mentionRe = new RegExp(`\\b${escapedDomain}\\b`, 'i')
  const isCited = allDomains.includes(normalizedTarget) || mentionRe.test(responseText)

  // Les autres domaines sont les concurrents potentiels
  const competitorDomainsCited = allDomains.filter((d) => d !== normalizedTarget)

  logger.info('citation.check.done', {
    tool,
    query_length: query.length,
    target_domain: normalizedTarget,
    is_cited: isCited,
    competitor_count: competitorDomainsCited.length,
  })

  return {
    tool,
    query,
    isCited,
    competitorDomainsCited,
    rawResponse,
  }
}
