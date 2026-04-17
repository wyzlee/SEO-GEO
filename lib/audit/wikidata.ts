/**
 * Wikidata entity lookup. No API key required — public MediaWiki API.
 * Respectful : one request per audit, short timeout, no retries.
 */

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

    return {
      id: first.id,
      label: first.label ?? brandName,
      description: first.description ?? null,
      url: first.concepturi ?? `https://www.wikidata.org/wiki/${first.id}`,
    }
  } catch {
    return null
  }
}
