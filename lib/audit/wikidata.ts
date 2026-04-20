/**
 * Wikidata entity lookup. No API key required — public MediaWiki API.
 * Respectful : one request per audit, short timeout, no retries.
 *
 * Cache Upstash Redis TTL 7 jours : les données d'entités Wikidata sont très
 * stables (labels/descriptions changent rarement).
 * Note : les entités introuvables (null) ne sont PAS mises en cache — la marque
 * pourrait apparaître sur Wikidata plus tard.
 */

import { getRedis } from '@/lib/redis'
import { logger } from '@/lib/observability/logger'

const CACHE_TTL_SECONDS = 7 * 86_400 // 7 jours

export interface WikidataEntity {
  id: string // "Q12345"
  label: string
  description: string | null
  url: string // https://www.wikidata.org/wiki/Q12345
}

interface WikidataSearchResponse {
  search?: Array<{
    id: string
    label?: string
    description?: string
    concepturi?: string
  }>
}

/**
 * Search for an entity by brand name. Returns the best match (first result)
 * or null if nothing is found (or request fails).
 */
export async function searchWikidataEntity(
  brandName: string,
): Promise<WikidataEntity | null> {
  const query = brandName.trim()
  if (query.length < 2 || query.length > 120) return null

  const redis = getRedis()
  const cacheKey = `wikidata:entity:${query.toLowerCase()}`

  // Tenter le cache
  if (redis) {
    const cached = await redis.get<WikidataEntity>(cacheKey).catch(() => null)
    if (cached) {
      logger.info('wikidata.cache.hit', { brandName: query })
      return cached
    }
    logger.info('wikidata.cache.miss', { brandName: query })
  }

  try {
    const params = new URLSearchParams({
      action: 'wbsearchentities',
      search: query,
      language: 'en',
      format: 'json',
      limit: '5',
      type: 'item',
      origin: '*',
    })

    const res = await fetch(
      `https://www.wikidata.org/w/api.php?${params.toString()}`,
      {
        headers: {
          'User-Agent':
            'SEO-GEO-Audit/0.1 (+https://seo-geo-orcin.vercel.app; respectful one-shot lookup)',
        },
        signal: AbortSignal.timeout(5_000),
      },
    )
    if (!res.ok) return null

    const body = (await res.json()) as WikidataSearchResponse
    const first = body.search?.[0]
    if (!first) return null

    const result: WikidataEntity = {
      id: first.id,
      label: first.label ?? brandName,
      description: first.description ?? null,
      url: first.concepturi ?? `https://www.wikidata.org/wiki/${first.id}`,
    }

    // Mettre en cache uniquement si une entité est trouvée
    if (redis) {
      await redis.set(cacheKey, result, { ex: CACHE_TTL_SECONDS }).catch(() => null)
    }

    return result
  } catch {
    return null
  }
}
