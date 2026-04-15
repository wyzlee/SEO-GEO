import { describe, expect, it } from 'vitest'
import { runEeatPhase } from '@/lib/audit/phases/eeat'
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

const TRUST_HTML = `<html><body>
<footer>
  <a href="/about">About</a>
  <a href="/contact">Contact</a>
  <a href="/mentions-legales">Mentions légales</a>
  <a href="/privacy">Privacy</a>
</footer>
</body></html>`

describe('runEeatPhase', () => {
  it('critically flags HTTP (non-HTTPS)', async () => {
    const result = await runEeatPhase(
      snapshot({ html: TRUST_HTML, finalUrl: 'http://example.com/' }),
    )
    const finding = result.findings.find((f) => f.category === 'eeat-https')
    expect(finding?.severity).toBe('critical')
    expect(finding?.pointsLost).toBe(3)
  })

  it('flags missing trust pages', async () => {
    const result = await runEeatPhase(
      snapshot({
        html: '<html><body><a href="/about">About</a></body></html>',
      }),
    )
    const finding = result.findings.find(
      (f) => f.category === 'eeat-trust-pages',
    )
    expect(finding).toBeDefined()
    expect(finding!.pointsLost).toBeCloseTo(1.5)
  })

  it('flags missing author on editorial page', async () => {
    const html = `<html><body><article><h1>Post</h1></article>
      <footer>
        <a href="/about">About</a>
        <a href="/contact">Contact</a>
        <a href="/legal">Legal</a>
        <a href="/privacy">Privacy</a>
      </footer>
    </body></html>`
    const result = await runEeatPhase(
      snapshot({ html, finalUrl: 'https://example.com/blog/post' }),
    )
    const finding = result.findings.find((f) => f.category === 'eeat-author')
    expect(finding?.pointsLost).toBe(1)
  })

  it('keeps full score on landing with HTTPS and all trust pages', async () => {
    const result = await runEeatPhase(snapshot({ html: TRUST_HTML }))
    expect(result.score).toBe(10)
  })
})
