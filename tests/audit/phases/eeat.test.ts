import { describe, expect, it } from 'vitest'
import { runEeatPhase } from '@/lib/audit/phases/eeat'
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

const TRUST_HTML = `<html><body>
<a href="#main-content">Skip to main content</a>
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

  it('flags shallow Person schema (missing jobTitle + sameAs + knowsAbout)', async () => {
    const html = `<html><body><article><h1>Post</h1>
      <script type="application/ld+json">${JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          { '@type': 'Person', name: 'Auteur' },
          {
            '@type': 'Article',
            author: { '@type': 'Person', name: 'Auteur' },
          },
        ],
      })}</script>
    </article>
    <footer>
      <a href="/about">About</a><a href="/contact">Contact</a>
      <a href="/legal">Legal</a><a href="/privacy">Privacy</a>
    </footer></body></html>`
    const result = await runEeatPhase(
      snapshot({ html, finalUrl: 'https://example.com/blog/post' }),
    )
    const finding = result.findings.find(
      (f) => f.category === 'eeat-person-shallow',
    )
    expect(finding).toBeDefined()
    expect(finding!.pointsLost).toBe(0.5)
  })

  it('does not flag Person shallow when jobTitle + sameAs + knowsAbout are filled', async () => {
    const html = `<html><body><article><h1>Post</h1>
      <script type="application/ld+json">${JSON.stringify({
        '@type': 'Person',
        name: 'Alice',
        jobTitle: 'Consultante SEO',
        sameAs: ['https://linkedin.com/in/alice'],
        knowsAbout: ['SEO', 'GEO'],
      })}</script>
      <meta name="author" content="Alice">
    </article>
    <footer>
      <a href="/about">About</a><a href="/contact">Contact</a>
      <a href="/legal">Legal</a><a href="/privacy">Privacy</a>
    </footer></body></html>`
    const result = await runEeatPhase(
      snapshot({ html, finalUrl: 'https://example.com/blog/post' }),
    )
    const finding = result.findings.find(
      (f) => f.category === 'eeat-person-shallow',
    )
    expect(finding).toBeUndefined()
  })

  it('flags missing reviewed-by / editorial policy', async () => {
    const html = `<html><body><article><h1>Post médical</h1>
      <p>Long contenu éditorial sans mention de relecture.</p>
    </article>
    <footer>
      <a href="/about">About</a><a href="/contact">Contact</a>
      <a href="/legal">Legal</a><a href="/privacy">Privacy</a>
    </footer></body></html>`
    const result = await runEeatPhase(
      snapshot({ html, finalUrl: 'https://example.com/blog/post' }),
    )
    const finding = result.findings.find(
      (f) => f.category === 'eeat-review-policy',
    )
    expect(finding).toBeDefined()
    expect(finding!.pointsLost).toBe(0.5)
  })

  it('does not flag review-policy when "Relu par" is present', async () => {
    const html = `<html><body><article><h1>Post</h1>
      <p>Contenu.</p>
      <p>Relu par Dr. Martin, cardiologue.</p>
    </article>
    <footer>
      <a href="/about">About</a><a href="/contact">Contact</a>
      <a href="/legal">Legal</a><a href="/privacy">Privacy</a>
    </footer></body></html>`
    const result = await runEeatPhase(
      snapshot({ html, finalUrl: 'https://example.com/blog/post' }),
    )
    const finding = result.findings.find(
      (f) => f.category === 'eeat-review-policy',
    )
    expect(finding).toBeUndefined()
  })

  it('flags bare URL anchors on external citations', async () => {
    const html = `<html><body><article><h1>Post</h1>
      <meta name="author" content="x">
      <p>Sources :
        <a href="https://studyA.com/paper">https://studyA.com/paper</a>
        <a href="https://studyB.com/paper">https://studyB.com/paper</a>
        <a href="https://studyC.com/paper">https://studyC.com/paper</a>
      </p>
    </article>
    <footer>
      <a href="/about">About</a><a href="/contact">Contact</a>
      <a href="/legal">Legal</a><a href="/privacy">Privacy</a>
    </footer></body></html>`
    const result = await runEeatPhase(
      snapshot({ html, finalUrl: 'https://example.com/blog/post' }),
    )
    const finding = result.findings.find(
      (f) => f.category === 'eeat-bare-urls',
    )
    expect(finding).toBeDefined()
    expect(finding!.pointsLost).toBe(0.5)
  })

  it('flags broken trust page via subPages', async () => {
    const subPages: SubPageSnapshot[] = [
      {
        url: 'https://example.com/about',
        status: 200,
        html: '<html><body>About</body></html>',
        lastModified: null,
        contentHash: 'a',
      },
      {
        url: 'https://example.com/mentions-legales',
        status: 404,
        html: '<html><body>Not Found</body></html>',
        lastModified: null,
        contentHash: 'b',
      },
    ]
    const result = await runEeatPhase(snapshot({ html: TRUST_HTML, subPages }))
    const finding = result.findings.find(
      (f) => f.category === 'eeat-trust-broken',
    )
    expect(finding).toBeDefined()
    expect(finding!.severity).toBe('high')
    expect(finding!.pointsLost).toBe(1)
  })
})
