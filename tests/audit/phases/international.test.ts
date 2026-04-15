import { describe, expect, it } from 'vitest'
import { runInternationalPhase } from '@/lib/audit/phases/international'
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

describe('runInternationalPhase', () => {
  it('keeps full 8/8 on single-language site with info flag', async () => {
    const result = await runInternationalPhase(snapshot({ html: '<html><body></body></html>' }))
    expect(result.score).toBe(8)
    const finding = result.findings.find(
      (f) => f.category === 'international-single-lang',
    )
    expect(finding?.severity).toBe('info')
  })

  it('flags missing x-default when hreflang is set', async () => {
    const html = `<html><head>
<link rel="alternate" hreflang="fr" href="https://example.com/fr/">
<link rel="alternate" hreflang="en" href="https://example.com/en/">
<meta property="og:locale" content="fr_FR">
</head><body></body></html>`
    const result = await runInternationalPhase(snapshot({ html }))
    const finding = result.findings.find(
      (f) => f.category === 'international-x-default',
    )
    expect(finding?.pointsLost).toBe(1)
  })

  it('flags duplicate hreflang entries', async () => {
    const html = `<html><head>
<link rel="alternate" hreflang="fr" href="https://example.com/fr/">
<link rel="alternate" hreflang="fr" href="https://example.com/fr-fr/">
<link rel="alternate" hreflang="x-default" href="https://example.com/">
<meta property="og:locale" content="fr_FR">
</head><body></body></html>`
    const result = await runInternationalPhase(snapshot({ html }))
    const finding = result.findings.find(
      (f) => f.category === 'international-hreflang-dup',
    )
    expect(finding?.pointsLost).toBe(1)
  })
})
