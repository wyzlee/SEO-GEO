import { describe, expect, it } from 'vitest'
import { runTechnicalPhase } from '@/lib/audit/phases/technical'
import type { CrawlSnapshot, SubPageSnapshot } from '@/lib/audit/types'

function snapshot(partial: Partial<CrawlSnapshot>): CrawlSnapshot {
  return {
    html: '<!doctype html><html lang="fr"><head></head><body></body></html>',
    finalUrl: 'https://example.com/',
    status: 200,
    robotsTxt: null,
    sitemapXml: null,
    llmsTxt: null,
    ...partial,
  }
}

const PERFECT_HTML = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Exemple — page de test d'audit SEO-GEO</title>
    <meta name="description" content="Description de test exactement calibrée sur la fourchette 150-160 caractères pour passer tous les checks de la phase technique de l'audit moteur.">
    <link rel="canonical" href="https://example.com/">
    <link rel="icon" href="/favicon.ico">
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
    <meta property="og:title" content="Exemple">
    <meta property="og:description" content="Description">
    <meta property="og:image" content="https://example.com/og.png">
    <meta property="og:url" content="https://example.com/">
    <meta property="og:type" content="website">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Exemple">
    <meta name="twitter:description" content="Description">
    <meta name="twitter:image" content="https://example.com/og.png">
  </head>
  <body>
    <h1>Titre principal</h1>
  </body>
</html>`

const ROBOTS_OK = `User-agent: *\nAllow: /\nSitemap: https://example.com/sitemap.xml`
const SITEMAP_OK = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://example.com/</loc><lastmod>2026-04-14</lastmod></url>
</urlset>`

describe('runTechnicalPhase', () => {
  it('scores 12/12 on a perfect page with robots + sitemap OK', async () => {
    const result = await runTechnicalPhase(
      snapshot({
        html: PERFECT_HTML,
        robotsTxt: ROBOTS_OK,
        sitemapXml: SITEMAP_OK,
      }),
    )
    expect(result.score).toBe(12)
    expect(result.scoreMax).toBe(12)
    expect(result.status).toBe('completed')
    expect(result.findings).toHaveLength(0)
  })

  it('detects missing title', async () => {
    const html = PERFECT_HTML.replace(/<title>[^<]+<\/title>/, '')
    const result = await runTechnicalPhase(
      snapshot({ html, robotsTxt: ROBOTS_OK, sitemapXml: SITEMAP_OK }),
    )
    const finding = result.findings.find((f) => f.category === 'technical-title')
    expect(finding).toBeDefined()
    expect(finding?.pointsLost).toBe(1)
    expect(result.score).toBe(11)
  })

  it('detects critical Disallow: / in robots.txt', async () => {
    const result = await runTechnicalPhase(
      snapshot({
        html: PERFECT_HTML,
        robotsTxt: 'User-agent: *\nDisallow: /\nSitemap: https://example.com/sitemap.xml',
        sitemapXml: SITEMAP_OK,
      }),
    )
    const finding = result.findings.find(
      (f) => f.category === 'technical-robots',
    )
    expect(finding?.severity).toBe('critical')
    expect(finding?.pointsLost).toBe(3)
    expect(result.score).toBe(9)
  })

  it('flags canonical pointing to another domain', async () => {
    const html = PERFECT_HTML.replace(
      /canonical" href="[^"]+"/,
      'canonical" href="https://other.com/"',
    )
    const result = await runTechnicalPhase(
      snapshot({ html, robotsTxt: ROBOTS_OK, sitemapXml: SITEMAP_OK }),
    )
    const finding = result.findings.find(
      (f) => f.category === 'technical-canonical',
    )
    expect(finding?.severity).toBe('high')
    expect(finding?.pointsLost).toBe(2)
  })

  it('flags missing robots.txt and sitemap.xml', async () => {
    const result = await runTechnicalPhase(
      snapshot({ html: PERFECT_HTML, robotsTxt: null, sitemapXml: null }),
    )
    const robots = result.findings.find((f) => f.category === 'technical-robots')
    const sitemap = result.findings.find(
      (f) => f.category === 'technical-sitemap',
    )
    expect(robots?.pointsLost).toBe(1)
    expect(sitemap?.pointsLost).toBe(2)
    expect(result.score).toBe(12 - 1 - 2)
  })

  it('flags missing OpenGraph fields', async () => {
    const html = PERFECT_HTML.replace(
      /<meta property="og:(title|description|image|url|type)"[^>]*>/g,
      '',
    )
    const result = await runTechnicalPhase(
      snapshot({ html, robotsTxt: ROBOTS_OK, sitemapXml: SITEMAP_OK }),
    )
    const ogFindings = result.findings.filter(
      (f) => f.category === 'technical-og',
    )
    expect(ogFindings).toHaveLength(5)
    expect(ogFindings.every((f) => f.pointsLost === 1)).toBe(true)
    expect(result.score).toBe(Math.max(0, 12 - 5))
  })

  it('critically flags meta robots noindex', async () => {
    const html = PERFECT_HTML.replace(
      '<head>',
      '<head><meta name="robots" content="noindex">',
    )
    const result = await runTechnicalPhase(
      snapshot({ html, robotsTxt: ROBOTS_OK, sitemapXml: SITEMAP_OK }),
    )
    const finding = result.findings.find(
      (f) => f.category === 'technical-meta-robots',
    )
    expect(finding?.severity).toBe('critical')
    expect(finding?.pointsLost).toBe(3)
  })

  it('flags nofollow as medium', async () => {
    const html = PERFECT_HTML.replace(
      '<head>',
      '<head><meta name="robots" content="nofollow">',
    )
    const result = await runTechnicalPhase(
      snapshot({ html, robotsTxt: ROBOTS_OK, sitemapXml: SITEMAP_OK }),
    )
    const finding = result.findings.find(
      (f) => f.category === 'technical-meta-robots',
    )
    expect(finding?.severity).toBe('medium')
    expect(finding?.pointsLost).toBe(1)
  })

  it('flags canonical self-ref mismatch (same host, different URL)', async () => {
    const html = PERFECT_HTML.replace(
      /canonical" href="[^"]+"/,
      'canonical" href="https://example.com/other-page"',
    )
    const result = await runTechnicalPhase(
      snapshot({ html, robotsTxt: ROBOTS_OK, sitemapXml: SITEMAP_OK }),
    )
    const finding = result.findings.find(
      (f) => f.category === 'technical-canonical-self',
    )
    expect(finding).toBeDefined()
    expect(finding!.pointsLost).toBe(0.5)
  })

  it('flags multiple H1 on the page', async () => {
    const html = PERFECT_HTML.replace(
      '<h1>Titre principal</h1>',
      '<h1>Titre 1</h1><h1>Titre 2</h1>',
    )
    const result = await runTechnicalPhase(
      snapshot({ html, robotsTxt: ROBOTS_OK, sitemapXml: SITEMAP_OK }),
    )
    const finding = result.findings.find((f) => f.category === 'technical-h1')
    expect(finding).toBeDefined()
    expect(finding!.pointsLost).toBe(0.5)
  })

  it('flags sitemap not declared in robots.txt', async () => {
    const robotsWithoutSitemap = 'User-agent: *\nAllow: /'
    const result = await runTechnicalPhase(
      snapshot({
        html: PERFECT_HTML,
        robotsTxt: robotsWithoutSitemap,
        sitemapXml: SITEMAP_OK,
      }),
    )
    const finding = result.findings.find(
      (f) => f.category === 'technical-robots-sitemap',
    )
    expect(finding).toBeDefined()
    expect(finding!.pointsLost).toBe(0.5)
  })

  it('flags subPages en noindex', async () => {
    const subPages: SubPageSnapshot[] = [
      {
        url: 'https://example.com/hidden',
        status: 200,
        html: '<html><head><meta name="robots" content="noindex"></head><body></body></html>',
        lastModified: null,
        contentHash: 'a',
      },
      {
        url: 'https://example.com/ok',
        status: 200,
        html: '<html><body></body></html>',
        lastModified: null,
        contentHash: 'b',
      },
    ]
    const result = await runTechnicalPhase(
      snapshot({
        html: PERFECT_HTML,
        robotsTxt: ROBOTS_OK,
        sitemapXml: SITEMAP_OK,
        subPages,
      }),
    )
    const finding = result.findings.find(
      (f) => f.category === 'technical-noindex-subpages',
    )
    expect(finding).toBeDefined()
    expect(finding!.pointsLost).toBe(1)
    expect(finding!.metricValue).toBe('1 page(s)')
  })

  it('flags oversized HTML (> 500 KB)', async () => {
    const bulk = 'x'.repeat(600_000)
    const html = PERFECT_HTML.replace('<body>', `<body><div>${bulk}</div>`)
    const result = await runTechnicalPhase(
      snapshot({ html, robotsTxt: ROBOTS_OK, sitemapXml: SITEMAP_OK }),
    )
    const finding = result.findings.find(
      (f) => f.category === 'technical-html-size',
    )
    expect(finding).toBeDefined()
    expect(finding!.pointsLost).toBe(0.5)
  })

  it('is deterministic (golden test — same input, same output)', async () => {
    const run = async () =>
      runTechnicalPhase(
        snapshot({
          html: PERFECT_HTML,
          robotsTxt: ROBOTS_OK,
          sitemapXml: SITEMAP_OK,
        }),
      )
    const a = await run()
    const b = await run()
    expect(a.score).toBe(b.score)
    expect(a.findings.length).toBe(b.findings.length)
    expect(a.summary).toBe(b.summary)
  })
})
