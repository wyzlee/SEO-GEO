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
})
