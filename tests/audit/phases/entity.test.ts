import { afterEach, describe, expect, it, vi } from 'vitest'
import { runEntityPhase } from '@/lib/audit/phases/entity'
import * as wikidataModule from '@/lib/audit/wikidata'
import type { CrawlSnapshot } from '@/lib/audit/types'

function snapshot(partial: Partial<CrawlSnapshot>): CrawlSnapshot {
  return {
    html: '',
    finalUrl: 'https://example.com/',
    status: 200,
    robotsTxt: null,
    sitemapXml: null,
    llmsTxt: null,
    ...partial,
  }
}

function withOrg(sameAs: string[] = []): string {
  return `<html><head><title>Wyzlee</title>
<meta property="og:site_name" content="Wyzlee">
<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        name: 'Wyzlee',
        url: 'https://wyzlee.com',
        logo: 'https://wyzlee.com/logo.png',
        sameAs,
      },
      {
        '@type': 'WebSite',
        url: 'https://wyzlee.com',
        potentialAction: { '@type': 'SearchAction' },
      },
    ],
  })}</script></head><body></body></html>`
}

describe('runEntityPhase', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('scores max when brand is consistent + Wikidata/Wikipedia linked', async () => {
    const result = await runEntityPhase(
      snapshot({
        html: withOrg([
          'https://wikidata.org/wiki/Q1',
          'https://fr.wikipedia.org/wiki/Wyzlee',
          'https://linkedin.com/company/wyzlee',
          'https://x.com/wyzlee',
          'https://github.com/wyzlee',
        ]),
      }),
    )
    expect(result.score).toBe(10)
  })

  it('flags missing Wikidata link (no Wikidata match)', async () => {
    vi.spyOn(wikidataModule, 'searchWikidataEntity').mockResolvedValue(null)
    const result = await runEntityPhase(
      snapshot({
        html: withOrg(['https://linkedin.com/company/wyzlee']),
      }),
    )
    const finding = result.findings.find((f) => f.category === 'entity-wikidata')
    expect(finding?.severity).toBe('medium')
    expect(finding?.pointsLost).toBe(2)
  })

  it('raises severity when a matching Wikidata entity already exists', async () => {
    vi.spyOn(wikidataModule, 'searchWikidataEntity').mockResolvedValue({
      id: 'Q12345',
      label: 'Wyzlee',
      description: 'French SaaS',
      url: 'https://www.wikidata.org/wiki/Q12345',
    })
    const result = await runEntityPhase(
      snapshot({
        html: withOrg(['https://linkedin.com/company/wyzlee']),
      }),
    )
    const finding = result.findings.find((f) => f.category === 'entity-wikidata')
    expect(finding?.severity).toBe('high')
    expect(finding?.metricValue).toBe('Q12345')
  })

  it('flags brand name incoherence', async () => {
    const html = `<html><head><title>Wyzlee</title>
<meta property="og:site_name" content="Acme Corp">
<script type="application/ld+json">${JSON.stringify({
      '@type': 'Organization',
      name: 'Different Brand',
    })}</script></head><body></body></html>`
    const result = await runEntityPhase(snapshot({ html }))
    const finding = result.findings.find(
      (f) => f.category === 'entity-brand-coherence',
    )
    expect(finding?.severity).toBe('high')
    expect(finding?.pointsLost).toBe(2)
  })
})
