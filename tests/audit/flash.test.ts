// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from 'vitest'

// Mock crawlUrl to avoid real HTTP
const crawlMock = vi.fn()
vi.mock('@/lib/audit/crawl', () => ({
  crawlUrl: (url: string, opts: unknown) => crawlMock(url, opts),
}))

// Mock all 4 phase runners
const technicalMock = vi.fn()
const structuredDataMock = vi.fn()
const geoMock = vi.fn()
const commonMistakesMock = vi.fn()

vi.mock('@/lib/audit/phases/technical', () => ({
  runTechnicalPhase: (crawl: unknown) => technicalMock(crawl),
}))
vi.mock('@/lib/audit/phases/structured-data', () => ({
  runStructuredDataPhase: (crawl: unknown) => structuredDataMock(crawl),
}))
vi.mock('@/lib/audit/phases/geo', () => ({
  runGeoPhase: (crawl: unknown) => geoMock(crawl),
}))
vi.mock('@/lib/audit/phases/common-mistakes', () => ({
  runCommonMistakesPhase: (crawl: unknown) => commonMistakesMock(crawl),
}))

function makeCrawl(url = 'https://example.com') {
  return {
    html: '<html></html>',
    finalUrl: url,
    status: 200,
    robotsTxt: null,
    sitemapXml: null,
    llmsTxt: null,
    llmsFullTxt: null,
    lastModified: null,
    contentHash: 'abc',
    subPages: [],
  }
}

function makePhaseResult(
  phaseKey: string,
  score: number,
  scoreMax: number,
  findings: unknown[] = [],
) {
  return { phaseKey, score, scoreMax, status: 'completed', summary: '', findings }
}

function makeFinding(severity = 'high', recommendation = 'Fix this issue now with specific steps') {
  return {
    phaseKey: 'technical',
    severity,
    title: 'Missing title',
    description: 'No title tag found',
    recommendation,
    pointsLost: 3,
    effort: 'quick',
  }
}

describe('runFlashAudit', () => {
  beforeEach(() => {
    crawlMock.mockReset()
    technicalMock.mockReset()
    structuredDataMock.mockReset()
    geoMock.mockReset()
    commonMistakesMock.mockReset()

    crawlMock.mockResolvedValue(makeCrawl())
    technicalMock.mockResolvedValue(makePhaseResult('technical', 8, 12))
    structuredDataMock.mockResolvedValue(makePhaseResult('structured_data', 10, 15))
    geoMock.mockResolvedValue(makePhaseResult('geo', 12, 18))
    commonMistakesMock.mockResolvedValue(makePhaseResult('common_mistakes', 4, 5))
  })

  it('passes maxSubPages: 0 and timeoutMs: 6000 to crawlUrl', async () => {
    const { runFlashAudit } = await import('@/lib/audit/flash')
    await runFlashAudit('https://example.com')
    expect(crawlMock).toHaveBeenCalledWith('https://example.com', {
      maxSubPages: 0,
      timeoutMs: 6_000,
    })
  })

  it('runs exactly 4 phases concurrently (no DB write)', async () => {
    const { runFlashAudit } = await import('@/lib/audit/flash')
    await runFlashAudit('https://example.com')
    expect(technicalMock).toHaveBeenCalledOnce()
    expect(structuredDataMock).toHaveBeenCalledOnce()
    expect(geoMock).toHaveBeenCalledOnce()
    expect(commonMistakesMock).toHaveBeenCalledOnce()
  })

  it('computes normalized score to /100', async () => {
    const { runFlashAudit } = await import('@/lib/audit/flash')
    const result = await runFlashAudit('https://example.com')
    // 8+10+12+4 = 34, max = 12+15+18+5 = 50 → 68%
    expect(result.score).toBe(68)
  })

  it('returns correct url from crawl.finalUrl', async () => {
    crawlMock.mockResolvedValue(makeCrawl('https://example.com/'))
    const { runFlashAudit } = await import('@/lib/audit/flash')
    const result = await runFlashAudit('https://example.com')
    expect(result.url).toBe('https://example.com/')
  })

  it('truncates recommendation to 40 chars', async () => {
    const longReco = 'A'.repeat(80)
    technicalMock.mockResolvedValue(
      makePhaseResult('technical', 8, 12, [makeFinding('high', longReco)]),
    )
    const { runFlashAudit } = await import('@/lib/audit/flash')
    const result = await runFlashAudit('https://example.com')
    expect(result.topFindings[0].recommendation).toHaveLength(41) // 40 chars + ellipsis
    expect(result.topFindings[0].recommendation.endsWith('…')).toBe(true)
  })

  it('does not truncate recommendations shorter than 40 chars', async () => {
    const shortReco = 'Fix it quickly'
    technicalMock.mockResolvedValue(
      makePhaseResult('technical', 8, 12, [makeFinding('high', shortReco)]),
    )
    const { runFlashAudit } = await import('@/lib/audit/flash')
    const result = await runFlashAudit('https://example.com')
    expect(result.topFindings[0].recommendation).toBe(shortReco)
  })

  it('returns at most 5 top findings, sorted by severity then pointsLost', async () => {
    const findings = [
      { ...makeFinding('low', 'reco'), pointsLost: 1 },
      { ...makeFinding('critical', 'reco'), pointsLost: 5 },
      { ...makeFinding('medium', 'reco'), pointsLost: 3 },
      { ...makeFinding('high', 'reco'), pointsLost: 4 },
      { ...makeFinding('critical', 'reco'), pointsLost: 8 },
      { ...makeFinding('info', 'reco'), pointsLost: 0 },
    ]
    technicalMock.mockResolvedValue(makePhaseResult('technical', 8, 12, findings))
    const { runFlashAudit } = await import('@/lib/audit/flash')
    const result = await runFlashAudit('https://example.com')
    expect(result.topFindings).toHaveLength(5)
    expect(result.topFindings[0].severity).toBe('critical')
    expect(result.topFindings[0].pointsLost).toBe(8)
    expect(result.topFindings[1].severity).toBe('critical')
    expect(result.topFindings[1].pointsLost).toBe(5)
    expect(result.topFindings[2].severity).toBe('high')
  })

  it('reports totalFindings across all phases', async () => {
    technicalMock.mockResolvedValue(
      makePhaseResult('technical', 8, 12, [makeFinding(), makeFinding()]),
    )
    geoMock.mockResolvedValue(
      makePhaseResult('geo', 12, 18, [makeFinding()]),
    )
    const { runFlashAudit } = await import('@/lib/audit/flash')
    const result = await runFlashAudit('https://example.com')
    expect(result.totalFindings).toBe(3)
  })

  it('handles a skipped phase without penalizing the score', async () => {
    geoMock.mockResolvedValue({
      phaseKey: 'geo',
      score: 0,
      scoreMax: 18,
      status: 'skipped',
      summary: 'N/A',
      findings: [],
    })
    const { runFlashAudit } = await import('@/lib/audit/flash')
    const result = await runFlashAudit('https://example.com')
    // Only 3 phases counted: 8+10+4 = 22 / 12+15+5 = 32 → 69%
    expect(result.score).toBe(69)
  })

  it('includes analysedAt as ISO timestamp', async () => {
    const { runFlashAudit } = await import('@/lib/audit/flash')
    const result = await runFlashAudit('https://example.com')
    expect(() => new Date(result.analysedAt)).not.toThrow()
    expect(result.analysedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })
})
