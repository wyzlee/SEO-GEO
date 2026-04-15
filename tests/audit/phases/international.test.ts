import { describe, expect, it } from 'vitest'
import { runInternationalPhase } from '@/lib/audit/phases/international'
import type { CrawlSnapshot, SubPageSnapshot } from '@/lib/audit/types'

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

  it('flags malformed hreflang (underscore / casing)', async () => {
    const html = `<html lang="fr-FR"><head>
<link rel="alternate" hreflang="fr_FR" href="https://example.com/">
<link rel="alternate" hreflang="EN-GB" href="https://example.com/en/">
<link rel="alternate" hreflang="x-default" href="https://example.com/">
</head><body></body></html>`
    const result = await runInternationalPhase(
      snapshot({ html, finalUrl: 'https://example.com/' }),
    )
    const finding = result.findings.find(
      (f) => f.category === 'international-format',
    )
    expect(finding).toBeDefined()
    expect(finding!.pointsLost).toBe(1)
  })

  it('flags missing self-reference', async () => {
    const html = `<html lang="fr-FR"><head>
<link rel="alternate" hreflang="fr-FR" href="https://example.com/fr/">
<link rel="alternate" hreflang="en-US" href="https://example.com/en/">
<link rel="alternate" hreflang="x-default" href="https://example.com/en/">
</head><body></body></html>`
    const result = await runInternationalPhase(
      snapshot({ html, finalUrl: 'https://example.com/' }),
    )
    const finding = result.findings.find(
      (f) => f.category === 'international-self-ref',
    )
    expect(finding).toBeDefined()
    expect(finding!.pointsLost).toBe(2)
  })

  it('flags <html lang> incoherence with self hreflang', async () => {
    const html = `<html lang="en-US"><head>
<link rel="alternate" hreflang="fr-FR" href="https://example.com/">
<link rel="alternate" hreflang="en-US" href="https://example.com/en/">
<link rel="alternate" hreflang="x-default" href="https://example.com/">
</head><body></body></html>`
    const result = await runInternationalPhase(
      snapshot({ html, finalUrl: 'https://example.com/' }),
    )
    const finding = result.findings.find(
      (f) => f.category === 'international-html-lang',
    )
    expect(finding).toBeDefined()
    expect(finding!.pointsLost).toBe(1)
  })

  it('flags missing <html lang>', async () => {
    const html = `<html><head>
<link rel="alternate" hreflang="fr-FR" href="https://example.com/">
<link rel="alternate" hreflang="en-US" href="https://example.com/en/">
<link rel="alternate" hreflang="x-default" href="https://example.com/">
</head><body></body></html>`
    const result = await runInternationalPhase(
      snapshot({ html, finalUrl: 'https://example.com/' }),
    )
    const finding = result.findings.find(
      (f) => f.category === 'international-html-lang-missing',
    )
    expect(finding).toBeDefined()
    expect(finding!.pointsLost).toBe(0.5)
  })

  it('flags asymmetric hreflang via subPages', async () => {
    // Home déclare fr + en. /en/ doit déclarer back /fr/ ; ici /en/ ne
    // liste que elle-même → asymétrique.
    const html = `<html lang="fr-FR"><head>
<link rel="alternate" hreflang="fr-FR" href="https://example.com/">
<link rel="alternate" hreflang="en-US" href="https://example.com/en/">
<link rel="alternate" hreflang="x-default" href="https://example.com/">
</head><body></body></html>`
    const enHtml = `<html lang="en-US"><head>
<link rel="alternate" hreflang="en-US" href="https://example.com/en/">
</head><body></body></html>`
    const subPages: SubPageSnapshot[] = [
      {
        url: 'https://example.com/en/',
        status: 200,
        html: enHtml,
        lastModified: null,
        contentHash: 'en',
      },
    ]
    const result = await runInternationalPhase(
      snapshot({ html, finalUrl: 'https://example.com/', subPages }),
    )
    const finding = result.findings.find(
      (f) => f.category === 'international-bidirectional',
    )
    expect(finding).toBeDefined()
    expect(finding!.severity).toBe('high')
    expect(finding!.pointsLost).toBe(2)
  })
})
