import { describe, expect, it } from 'vitest'
import { runTopicalPhase } from '@/lib/audit/phases/topical'
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

function makeSubPage(
  url: string,
  html: string,
  contentHash = url,
): SubPageSnapshot {
  return { url, status: 200, html, lastModified: null, contentHash }
}

function richBody(words = 500): string {
  return `<html><body><main>${'mot '.repeat(words)}</main></body></html>`
}

function thinBody(): string {
  return `<html><body><p>Contenu court.</p></body></html>`
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

  it('flags orphan pages when home ne link pas toutes les subpages', async () => {
    // Home ne link que /blog/a et /blog/b. Les 3 autres sont orphelines.
    const homeHtml = `<html><body>
      <a href="/blog/a">A</a><a href="/blog/b">B</a>
    </body></html>`
    const subPages = [
      makeSubPage('https://example.com/blog/a', richBody(), 'h1'),
      makeSubPage('https://example.com/blog/b', richBody(), 'h2'),
      makeSubPage('https://example.com/blog/c', richBody(), 'h3'),
      makeSubPage('https://example.com/blog/d', richBody(), 'h4'),
      makeSubPage('https://example.com/blog/e', richBody(), 'h5'),
    ]
    const result = await runTopicalPhase(snapshot({ html: homeHtml, subPages }))
    const finding = result.findings.find(
      (f) => f.category === 'topical-orphan-pages',
    )
    expect(finding).toBeDefined()
    expect(finding!.severity).toBe('medium')
    expect(finding!.pointsLost).toBe(1)
  })

  it('flags thin content when majority of subpages are < 300 mots', async () => {
    const homeHtml = `<html><body>${Array.from(
      { length: 5 },
      (_, i) => `<a href="/p/${i}">P${i}</a>`,
    ).join('')}</body></html>`
    const subPages = Array.from({ length: 5 }, (_, i) =>
      makeSubPage(`https://example.com/p/${i}`, thinBody(), `t${i}`),
    )
    const result = await runTopicalPhase(snapshot({ html: homeHtml, subPages }))
    const finding = result.findings.find(
      (f) => f.category === 'topical-thin-content',
    )
    expect(finding).toBeDefined()
    expect(finding!.pointsLost).toBe(1)
  })

  it('flags cluster coverage when home relie < 50 % des clusters', async () => {
    // 2 clusters (/blog, /produits, /equipe) ≥ 4 pages chacun, home ne link
    // que /blog.
    const homeHtml = `<html><body>
      <a href="/blog/a">blog a</a>
    </body></html>`
    const subPages = [
      makeSubPage('https://example.com/blog/a', richBody(), 'b1'),
      makeSubPage('https://example.com/blog/b', richBody(), 'b2'),
      makeSubPage('https://example.com/blog/c', richBody(), 'b3'),
      makeSubPage('https://example.com/blog/d', richBody(), 'b4'),
      makeSubPage('https://example.com/produits/x', richBody(), 'p1'),
      makeSubPage('https://example.com/produits/y', richBody(), 'p2'),
      makeSubPage('https://example.com/produits/z', richBody(), 'p3'),
      makeSubPage('https://example.com/produits/w', richBody(), 'p4'),
      makeSubPage('https://example.com/equipe/a', richBody(), 'e1'),
      makeSubPage('https://example.com/equipe/b', richBody(), 'e2'),
      makeSubPage('https://example.com/equipe/c', richBody(), 'e3'),
      makeSubPage('https://example.com/equipe/d', richBody(), 'e4'),
    ]
    const result = await runTopicalPhase(snapshot({ html: homeHtml, subPages }))
    const finding = result.findings.find(
      (f) => f.category === 'topical-cluster-coverage',
    )
    expect(finding).toBeDefined()
    expect(finding!.severity).toBe('low')
  })

  it('flags fragmented cluster without a pillar page', async () => {
    // Cluster /blog avec 4 pages, inbound égaux (1 chacune sauf 1 à zéro) :
    // aucune ne dépasse 30 % d'inbound, signal fragmenté.
    // On construit : home link aucune des 4 pages, mais chaque page link une
    // autre (round-robin) → inbound uniforme.
    const subPages = [
      makeSubPage(
        'https://example.com/blog/a',
        `<html><body>${richBody(300).slice(0, 400)}<a href="/blog/b">b</a></body></html>`,
      ),
      makeSubPage(
        'https://example.com/blog/b',
        `<html><body>${richBody(300).slice(0, 400)}<a href="/blog/c">c</a></body></html>`,
      ),
      makeSubPage(
        'https://example.com/blog/c',
        `<html><body>${richBody(300).slice(0, 400)}<a href="/blog/d">d</a></body></html>`,
      ),
      makeSubPage(
        'https://example.com/blog/d',
        `<html><body>${richBody(300).slice(0, 400)}<a href="/blog/a">a</a></body></html>`,
      ),
      makeSubPage('https://example.com/other/x', richBody(), 'ox'),
    ]
    const homeHtml = `<html><body>
      <a href="/other/x">other</a>
    </body></html>`
    const result = await runTopicalPhase(snapshot({ html: homeHtml, subPages }))
    const finding = result.findings.find(
      (f) => f.category === 'topical-pillar-missing',
    )
    expect(finding).toBeDefined()
    expect(finding!.severity).toBe('low')
  })

  it('flags site with zero authority outbound links', async () => {
    const html = `<html><body>
      <a href="https://random-blog.com">x</a>
      <a href="https://another-site.io">y</a>
      <a href="https://commercial.xyz">z</a>
      <a href="https://random.com/page">w</a>
      <a href="https://foo.bar/baz">v</a>
    </body></html>`
    const result = await runTopicalPhase(snapshot({ html }))
    const finding = result.findings.find(
      (f) => f.category === 'topical-authority-outbound',
    )
    expect(finding).toBeDefined()
    expect(finding!.pointsLost).toBe(0.5)
  })

  it('does not flag authority outbound when a Wikipedia link exists', async () => {
    const html = `<html><body>
      <a href="https://random.com/1">1</a>
      <a href="https://random.com/2">2</a>
      <a href="https://random.com/3">3</a>
      <a href="https://random.com/4">4</a>
      <a href="https://fr.wikipedia.org/wiki/SEO">wikipedia</a>
    </body></html>`
    const result = await runTopicalPhase(snapshot({ html }))
    const finding = result.findings.find(
      (f) => f.category === 'topical-authority-outbound',
    )
    expect(finding).toBeUndefined()
  })

  it('does not emit multi-page checks when no subPages', async () => {
    const html = `<html><body><a href="/x">x</a></body></html>`
    const result = await runTopicalPhase(snapshot({ html }))
    const multiPageFindings = result.findings.filter(
      (f) =>
        f.category === 'topical-orphan-pages' ||
        f.category === 'topical-thin-content' ||
        f.category === 'topical-cluster-coverage',
    )
    expect(multiPageFindings).toHaveLength(0)
  })
})
