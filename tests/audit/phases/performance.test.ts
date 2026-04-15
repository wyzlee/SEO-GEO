import { describe, expect, it } from 'vitest'
import { runPerformancePhase } from '@/lib/audit/phases/performance'
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

describe('runPerformancePhase', () => {
  it('critically flags HashRouter URLs', async () => {
    const html = `<html><body>
<a href="#/home">Home</a><a href="#/about">About</a>
<a href="#/contact">Contact</a><a href="#/blog">Blog</a>
<p>${'content '.repeat(100)}</p>
</body></html>`
    const result = await runPerformancePhase(snapshot({ html }))
    const finding = result.findings.find(
      (f) => f.category === 'performance-hashrouter',
    )
    expect(finding?.severity).toBe('critical')
    expect(finding?.pointsLost).toBe(3)
  })

  it('flags SPA without SSR content', async () => {
    const html = `<html><body><div id="root"></div></body></html>`
    const result = await runPerformancePhase(snapshot({ html }))
    const finding = result.findings.find((f) => f.category === 'performance-ssr')
    expect(finding?.pointsLost).toBe(2)
  })

  it('flags images sans width/height', async () => {
    const imgs = Array.from({ length: 10 })
      .map(() => '<img src="/img.jpg" alt="">')
      .join('')
    const html = `<html><body><p>${'content '.repeat(100)}</p>${imgs}</body></html>`
    const result = await runPerformancePhase(snapshot({ html }))
    const finding = result.findings.find((f) => f.category === 'performance-cls')
    expect(finding?.pointsLost).toBe(1)
  })

  it('keeps full score on well-optimized page', async () => {
    const html = `<html><head>
<link rel="preconnect" href="https://cdn.example.com">
</head><body>
<p>${'content '.repeat(100)}</p>
<img src="/img.webp" alt="" width="800" height="600" loading="lazy">
</body></html>`
    const result = await runPerformancePhase(snapshot({ html }))
    expect(result.score).toBe(8)
  })
})
