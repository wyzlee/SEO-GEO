import { describe, expect, it } from 'vitest'
import { runFreshnessPhase } from '@/lib/audit/phases/freshness'
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

function withArticle(date: string): string {
  return `<html><body><article>
<time datetime="${date}">${date}</time>
<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    datePublished: date,
    dateModified: date,
  })}</script>
<p>Content</p>
</article></body></html>`
}

describe('runFreshnessPhase', () => {
  it('scores max when article is recent', async () => {
    const today = new Date().toISOString().slice(0, 10)
    const result = await runFreshnessPhase(
      snapshot({
        html: withArticle(today),
        finalUrl: 'https://example.com/blog/post',
      }),
    )
    expect(result.score).toBe(8)
    expect(result.findings).toHaveLength(0)
  })

  it('flags stale blog post (> 90 days)', async () => {
    const oldDate = new Date(Date.now() - 200 * 24 * 3600 * 1000)
      .toISOString()
      .slice(0, 10)
    const result = await runFreshnessPhase(
      snapshot({
        html: withArticle(oldDate),
        finalUrl: 'https://example.com/blog/post',
      }),
    )
    const finding = result.findings.find((f) => f.category === 'freshness-stale')
    expect(finding).toBeDefined()
  })

  it('flags no date detectable', async () => {
    const html = '<html><body><p>No date anywhere.</p></body></html>'
    const result = await runFreshnessPhase(snapshot({ html }))
    const finding = result.findings.find(
      (f) => f.category === 'freshness-no-date',
    )
    expect(finding).toBeDefined()
    expect(finding!.pointsLost).toBeCloseTo(1.5)
  })

  it('flags phantom refresh (JSON-LD frais mais HTTP ancien)', async () => {
    const today = new Date().toISOString().slice(0, 10)
    const veryOldHttp = new Date(Date.now() - 400 * 24 * 3600 * 1000).toUTCString()
    const result = await runFreshnessPhase(
      snapshot({
        html: withArticle(today),
        finalUrl: 'https://example.com/blog/post',
        lastModified: veryOldHttp,
      }),
    )
    const finding = result.findings.find(
      (f) => f.category === 'freshness-phantom-refresh',
    )
    expect(finding).toBeDefined()
    expect(finding!.severity).toBe('medium')
    expect(finding!.pointsLost).toBe(1.5)
  })

  it('does not flag phantom refresh when HTTP header is also recent', async () => {
    const today = new Date().toISOString().slice(0, 10)
    const recentHttp = new Date().toUTCString()
    const result = await runFreshnessPhase(
      snapshot({
        html: withArticle(today),
        finalUrl: 'https://example.com/blog/post',
        lastModified: recentHttp,
      }),
    )
    const finding = result.findings.find(
      (f) => f.category === 'freshness-phantom-refresh',
    )
    expect(finding).toBeUndefined()
  })

  it('flags site-wide sitemap staleness', async () => {
    const today = new Date().toISOString().slice(0, 10)
    const oldDate = new Date(Date.now() - 500 * 24 * 3600 * 1000)
      .toISOString()
      .slice(0, 10)
    const urls = [
      ...Array.from({ length: 10 }, (_, i) => ({
        loc: `https://example.com/p${i}`,
        lastmod: oldDate,
      })),
      { loc: 'https://example.com/fresh', lastmod: today },
    ]
    const sitemapXml = `<?xml version="1.0"?><urlset>${urls
      .map(
        ({ loc, lastmod }) =>
          `<url><loc>${loc}</loc><lastmod>${lastmod}</lastmod></url>`,
      )
      .join('')}</urlset>`
    const result = await runFreshnessPhase(
      snapshot({ html: withArticle(today), sitemapXml }),
    )
    const finding = result.findings.find(
      (f) => f.category === 'freshness-site-wide-stale',
    )
    expect(finding).toBeDefined()
    expect(finding!.pointsLost).toBe(1)
  })

  it('flags duplicate content across subPages', async () => {
    const today = new Date().toISOString().slice(0, 10)
    const subPages = Array.from({ length: 5 }, (_, i) => ({
      url: `https://example.com/p${i}`,
      status: 200,
      html: '',
      lastModified: null,
      contentHash: i < 4 ? 'same-hash' : 'other-hash',
    }))
    const result = await runFreshnessPhase(
      snapshot({ html: withArticle(today), subPages }),
    )
    const finding = result.findings.find(
      (f) => f.category === 'freshness-content-duplication',
    )
    expect(finding).toBeDefined()
    expect(finding!.metricValue).toBe('4 pages identiques')
  })
})
