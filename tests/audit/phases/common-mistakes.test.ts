import { describe, expect, it } from 'vitest'
import { runCommonMistakesPhase } from '@/lib/audit/phases/common-mistakes'
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

describe('runCommonMistakesPhase', () => {
  it('critically flags noindex on public page', async () => {
    const html = `<html><head><meta name="robots" content="noindex, nofollow"></head><body></body></html>`
    const result = await runCommonMistakesPhase(snapshot({ html }))
    const finding = result.findings.find((f) => f.category === 'common-noindex')
    expect(finding?.severity).toBe('critical')
    expect(finding?.pointsLost).toBe(2)
  })

  it('does not flag noindex on admin page', async () => {
    const html = `<html><head><meta name="robots" content="noindex"></head><body></body></html>`
    const result = await runCommonMistakesPhase(
      snapshot({ html, finalUrl: 'https://example.com/admin/users' }),
    )
    const finding = result.findings.find((f) => f.category === 'common-noindex')
    expect(finding).toBeUndefined()
  })

  it('flags mixed content on https page', async () => {
    const html = `<html><body>
<img src="http://cdn.example.com/img.jpg">
<link href="http://cdn.example.com/style.css">
</body></html>`
    const result = await runCommonMistakesPhase(snapshot({ html }))
    const finding = result.findings.find(
      (f) => f.category === 'common-mixed-content',
    )
    expect(finding?.pointsLost).toBe(1)
  })

  it('flags incoherent canonical', async () => {
    const html = `<html><head>
<link rel="canonical" href="https://example.com/other">
</head><body></body></html>`
    const result = await runCommonMistakesPhase(
      snapshot({ html, finalUrl: 'https://example.com/page' }),
    )
    const finding = result.findings.find((f) => f.category === 'common-canonical')
    expect(finding?.pointsLost).toBe(1)
  })
})
