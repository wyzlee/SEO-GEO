import { describe, expect, it } from 'vitest'
import { runTopicalPhase } from '@/lib/audit/phases/topical'
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

describe('runTopicalPhase', () => {
  it('flags generic anchors when frequent', async () => {
    const anchors = [
      '<a href="/a">cliquez ici</a>',
      '<a href="/b">voir plus</a>',
      '<a href="/c">en savoir plus</a>',
      '<a href="/d">Guide complet</a>',
      '<a href="/e">Produit Wyzlee</a>',
      '<a href="/f">Article référence</a>',
      '<a href="/g">Page contact</a>',
      '<a href="/h">Article top 10</a>',
    ].join('\n')
    const html = `<html><body>${anchors}</body></html>`
    const result = await runTopicalPhase(snapshot({ html }))
    const finding = result.findings.find(
      (f) => f.category === 'topical-anchor-generic',
    )
    expect(finding?.pointsLost).toBe(1)
  })

  it('flags over-optimized anchor text', async () => {
    const repeated = Array.from({ length: 7 })
      .map(() => '<a href="/x">Meilleur audit GEO</a>')
      .join('\n')
    const html = `<html><body>${repeated}<a href="/y">Contact</a></body></html>`
    const result = await runTopicalPhase(snapshot({ html }))
    const finding = result.findings.find(
      (f) => f.category === 'topical-anchor-overopt',
    )
    expect(finding?.pointsLost).toBe(1)
  })
})
