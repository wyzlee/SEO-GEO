import { describe, expect, it } from 'vitest'
import { runStructuredDataPhase } from '@/lib/audit/phases/structured-data'
import type { CrawlSnapshot } from '@/lib/audit/types'

function snapshot(partial: Partial<CrawlSnapshot>): CrawlSnapshot {
  return {
    html: '<!doctype html><html><body></body></html>',
    finalUrl: 'https://example.com/',
    status: 200,
    robotsTxt: null,
    sitemapXml: null,
    llmsTxt: null,
    ...partial,
  }
}

function jsonLd(obj: unknown): string {
  return `<script type="application/ld+json">${JSON.stringify(obj)}</script>`
}

const ORGANIZATION_FULL = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Wyzlee',
  url: 'https://wyzlee.com',
  logo: 'https://wyzlee.com/logo.png',
  sameAs: [
    'https://linkedin.com/company/wyzlee',
    'https://x.com/wyzlee',
    'https://github.com/wyzlee',
    'https://www.wikidata.org/wiki/Q123',
    'https://crunchbase.com/wyzlee',
  ],
}

const WEBSITE_WITH_SEARCH = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  url: 'https://wyzlee.com',
  name: 'Wyzlee',
  potentialAction: {
    '@type': 'SearchAction',
    target: 'https://wyzlee.com/search?q={search_term_string}',
    'query-input': 'required name=search_term_string',
  },
}

const BREADCRUMB = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://wyzlee.com/' },
  ],
}

const PERFECT_HTML = `<!doctype html><html><head>
${jsonLd({ '@context': 'https://schema.org', '@graph': [ORGANIZATION_FULL, WEBSITE_WITH_SEARCH, BREADCRUMB] })}
</head><body></body></html>`

describe('runStructuredDataPhase', () => {
  it('scores 15/15 when Organization + WebSite + stacking are all valid', async () => {
    const result = await runStructuredDataPhase(snapshot({ html: PERFECT_HTML }))
    expect(result.score).toBe(15)
    expect(result.findings).toHaveLength(0)
  })

  it('critically flags missing Organization', async () => {
    const html = `<html><head>${jsonLd(WEBSITE_WITH_SEARCH)}</head><body></body></html>`
    const result = await runStructuredDataPhase(snapshot({ html }))
    const finding = result.findings.find((f) => f.category === 'schema-organization')
    expect(finding?.severity).toBe('critical')
    expect(finding?.pointsLost).toBe(3)
  })

  it('flags Organization missing logo + sameAs', async () => {
    const incomplete = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Wyzlee',
      url: 'https://wyzlee.com',
    }
    const html = `<html><head>${jsonLd({ '@graph': [incomplete, WEBSITE_WITH_SEARCH, BREADCRUMB] })}</head><body></body></html>`
    const result = await runStructuredDataPhase(snapshot({ html }))
    const orgFinding = result.findings.find((f) => f.category === 'schema-organization')
    expect(orgFinding?.title).toContain('logo')
    const sameAsFinding = result.findings.find((f) => f.category === 'schema-sameas')
    expect(sameAsFinding?.pointsLost).toBe(3)
  })

  it('flags sameAs under 5 profiles', async () => {
    const small = { ...ORGANIZATION_FULL, sameAs: ['https://linkedin.com/x'] }
    const html = `<html><head>${jsonLd({ '@graph': [small, WEBSITE_WITH_SEARCH, BREADCRUMB] })}</head><body></body></html>`
    const result = await runStructuredDataPhase(snapshot({ html }))
    const finding = result.findings.find((f) => f.category === 'schema-sameas')
    expect(finding?.severity).toBe('medium')
    expect(finding?.pointsLost).toBe(2)
  })

  it('flags WebSite without SearchAction', async () => {
    const plainWebsite = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      url: 'https://wyzlee.com',
      name: 'Wyzlee',
    }
    const html = `<html><head>${jsonLd({ '@graph': [ORGANIZATION_FULL, plainWebsite, BREADCRUMB] })}</head><body></body></html>`
    const result = await runStructuredDataPhase(snapshot({ html }))
    const finding = result.findings.find((f) => f.category === 'schema-website')
    expect(finding?.pointsLost).toBe(2)
  })

  it('flags missing Article on editorial page', async () => {
    const html = `<html><head>
      <meta property="og:type" content="article">
      ${jsonLd({ '@graph': [ORGANIZATION_FULL, WEBSITE_WITH_SEARCH, BREADCRUMB] })}
    </head><body><article><h1>Post</h1></article></body></html>`
    const result = await runStructuredDataPhase(
      snapshot({ html, finalUrl: 'https://example.com/blog/post-1' }),
    )
    const finding = result.findings.find((f) => f.category === 'schema-article')
    expect(finding?.severity).toBe('high')
    expect(finding?.pointsLost).toBe(3)
  })

  it('flags JSON-LD parse errors', async () => {
    const html = `<html><head><script type="application/ld+json">{"@type": "Organization", invalid}</script></head><body></body></html>`
    const result = await runStructuredDataPhase(snapshot({ html }))
    const finding = result.findings.find((f) => f.category === 'schema-syntax')
    expect(finding?.severity).toBe('high')
    expect(finding?.pointsLost).toBe(2)
  })

  it('flags weak schema stacking', async () => {
    const html = `<html><head>${jsonLd(ORGANIZATION_FULL)}</head><body></body></html>`
    const result = await runStructuredDataPhase(snapshot({ html }))
    const finding = result.findings.find((f) => f.category === 'schema-stacking')
    expect(finding?.pointsLost).toBe(1)
  })

  it('emits info-only finding on FAQPage', async () => {
    const faq = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [] }
    const html = `<html><head>${jsonLd({ '@graph': [ORGANIZATION_FULL, WEBSITE_WITH_SEARCH, BREADCRUMB, faq] })}</head><body></body></html>`
    const result = await runStructuredDataPhase(snapshot({ html }))
    const finding = result.findings.find((f) => f.category === 'schema-faqpage')
    expect(finding?.severity).toBe('info')
    expect(finding?.pointsLost).toBe(0)
    expect(result.score).toBe(15)
  })

  it('is deterministic', async () => {
    const a = await runStructuredDataPhase(snapshot({ html: PERFECT_HTML }))
    const b = await runStructuredDataPhase(snapshot({ html: PERFECT_HTML }))
    expect(a.score).toBe(b.score)
    expect(a.findings.length).toBe(b.findings.length)
  })
})
