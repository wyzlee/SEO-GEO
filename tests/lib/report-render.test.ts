import { describe, expect, it } from 'vitest'
import { buildHotspotUrls } from '@/lib/report/render'
import type { ReportFinding } from '@/lib/report/render'

function finding(overrides: Partial<ReportFinding>): ReportFinding {
  return {
    phaseKey: 'technical',
    severity: 'medium',
    category: 'x',
    title: 't',
    description: 'd',
    recommendation: 'r',
    pointsLost: 1,
    effort: null,
    locationUrl: null,
    ...overrides,
  }
}

describe('buildHotspotUrls', () => {
  it('returns empty string when no URL hits the threshold', () => {
    const findings = [
      finding({ phaseKey: 'geo', locationUrl: 'https://site.com/a' }),
      finding({ phaseKey: 'eeat', locationUrl: 'https://site.com/b' }),
    ]
    expect(buildHotspotUrls(findings)).toBe('')
  })

  it('ignores synthesis phase findings', () => {
    const findings = [
      finding({ phaseKey: 'synthesis', locationUrl: 'https://site.com/x' }),
      finding({ phaseKey: 'synthesis', locationUrl: 'https://site.com/x' }),
      finding({ phaseKey: 'synthesis', locationUrl: 'https://site.com/x' }),
    ]
    expect(buildHotspotUrls(findings)).toBe('')
  })

  it('extracts hotspot with ≥ 3 findings sur ≥ 2 phases', () => {
    const findings = [
      finding({
        phaseKey: 'geo',
        locationUrl: 'https://site.com/post',
        pointsLost: 2,
      }),
      finding({
        phaseKey: 'eeat',
        locationUrl: 'https://site.com/post',
        pointsLost: 1,
      }),
      finding({
        phaseKey: 'technical',
        locationUrl: 'https://site.com/post',
        pointsLost: 0.5,
      }),
      finding({
        phaseKey: 'geo',
        locationUrl: 'https://site.com/other',
      }),
    ]
    const md = buildHotspotUrls(findings)
    expect(md).toContain('https://site.com/post')
    expect(md).toContain('| 3 |')
    expect(md).toContain('3.5')
    expect(md).not.toContain('other')
  })

  it('sorts hotspots by total points lost desc', () => {
    const bigUrl = 'https://site.com/a'
    const smallUrl = 'https://site.com/b'
    const findings = [
      // Small URL : 3 findings × 0.5 = 1.5 pts
      ...['technical', 'geo', 'eeat'].map((p) =>
        finding({
          phaseKey: p,
          locationUrl: smallUrl,
          pointsLost: 0.5,
        }),
      ),
      // Big URL : 3 findings × 2 = 6 pts
      ...['technical', 'geo', 'eeat'].map((p) =>
        finding({
          phaseKey: p,
          locationUrl: bigUrl,
          pointsLost: 2,
        }),
      ),
    ]
    const md = buildHotspotUrls(findings)
    const bigIdx = md.indexOf(bigUrl)
    const smallIdx = md.indexOf(smallUrl)
    expect(bigIdx).toBeGreaterThan(-1)
    expect(smallIdx).toBeGreaterThan(bigIdx)
  })
})
