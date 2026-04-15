import { describe, expect, it } from 'vitest'
import { runCommonMistakesPhase } from '@/lib/audit/phases/common-mistakes'
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

  it('flags multiple <title> tags', async () => {
    const html = `<html><head><title>A</title><title>B</title></head><body></body></html>`
    const result = await runCommonMistakesPhase(snapshot({ html }))
    const finding = result.findings.find(
      (f) => f.category === 'common-duplicate-title',
    )
    expect(finding).toBeDefined()
    expect(finding!.pointsLost).toBe(0.5)
  })

  it('flags images without alt when ratio > 30 %', async () => {
    const imgs = Array.from({ length: 10 }, (_, i) =>
      i < 5 ? `<img src="/a${i}.jpg">` : `<img src="/a${i}.jpg" alt="x">`,
    ).join('')
    const html = `<html><body>${imgs}</body></html>`
    const result = await runCommonMistakesPhase(snapshot({ html }))
    const finding = result.findings.find(
      (f) => f.category === 'common-img-alt',
    )
    expect(finding).toBeDefined()
    expect(finding!.pointsLost).toBe(0.5)
  })

  it('flags noindex + self-canonical contradiction', async () => {
    const html = `<html><head>
      <meta name="robots" content="noindex">
      <link rel="canonical" href="https://example.com/page">
    </head><body></body></html>`
    const result = await runCommonMistakesPhase(
      snapshot({ html, finalUrl: 'https://example.com/page' }),
    )
    const finding = result.findings.find(
      (f) => f.category === 'common-noindex-canonical',
    )
    expect(finding).toBeDefined()
    expect(finding!.severity).toBe('high')
    expect(finding!.pointsLost).toBe(1)
  })

  it('flags JS-only navigation (onclick without href)', async () => {
    const html = `<html><body><nav>
      <div onclick="navigate('/')">Accueil</div>
      <div onclick="navigate('/a')">Page A</div>
      <div onclick="navigate('/b')">Page B</div>
      <div onclick="navigate('/c')">Page C</div>
    </nav></body></html>`
    const result = await runCommonMistakesPhase(snapshot({ html }))
    const finding = result.findings.find(
      (f) => f.category === 'common-js-only-nav',
    )
    expect(finding).toBeDefined()
    expect(finding!.pointsLost).toBe(1)
  })

  it('flags broken internal links via subPages', async () => {
    const html = `<html><body>
      <a href="/ok">OK</a>
      <a href="/gone">Gone</a>
      <a href="/err">Err</a>
    </body></html>`
    const subPages: SubPageSnapshot[] = [
      {
        url: 'https://example.com/ok',
        status: 200,
        html: '<html></html>',
        lastModified: null,
        contentHash: 'a',
      },
      {
        url: 'https://example.com/gone',
        status: 404,
        html: '<html></html>',
        lastModified: null,
        contentHash: 'b',
      },
      {
        url: 'https://example.com/err',
        status: 500,
        html: '<html></html>',
        lastModified: null,
        contentHash: 'c',
      },
    ]
    const result = await runCommonMistakesPhase(snapshot({ html, subPages }))
    const finding = result.findings.find(
      (f) => f.category === 'common-broken-links',
    )
    expect(finding).toBeDefined()
    expect(finding!.severity).toBe('high')
    expect(finding!.pointsLost).toBe(1)
    expect(finding!.metricValue).toBe('2 lien(s) cassé(s)')
  })

  it('flags duplicate <title> across subPages', async () => {
    const makeSp = (i: number, title: string): SubPageSnapshot => ({
      url: `https://example.com/p/${i}`,
      status: 200,
      html: `<html><head><title>${title}</title></head><body></body></html>`,
      lastModified: null,
      contentHash: `h${i}`,
    })
    const subPages = [
      makeSp(0, 'Boutique'),
      makeSp(1, 'Boutique'),
      makeSp(2, 'Boutique'),
      makeSp(3, 'Autre'),
      makeSp(4, 'Différent'),
    ]
    const result = await runCommonMistakesPhase(
      snapshot({
        html: '<html><body></body></html>',
        subPages,
      }),
    )
    const finding = result.findings.find(
      (f) => f.category === 'common-duplicate-titles',
    )
    expect(finding).toBeDefined()
    expect(finding!.pointsLost).toBe(0.5)
  })
})
