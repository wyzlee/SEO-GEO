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

  it('returns empty string when only one URL meets the threshold (mono-page case)', () => {
    // Une seule URL passe le seuil ≥ 3 findings × ≥ 2 phases — la section
    // "Pages à fort enjeu" n'a pas de valeur dans ce cas (typique du crawl
    // mono-page), on la masque entièrement.
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
    expect(buildHotspotUrls(findings)).toBe('')
  })

  it('extracts hotspots when ≥ 2 URLs meet the threshold', () => {
    const findings = [
      // URL 1 : 3 findings × 2 phases ✓
      finding({ phaseKey: 'geo', locationUrl: 'https://site.com/p1', pointsLost: 2 }),
      finding({ phaseKey: 'eeat', locationUrl: 'https://site.com/p1', pointsLost: 1 }),
      finding({ phaseKey: 'technical', locationUrl: 'https://site.com/p1', pointsLost: 0.5 }),
      // URL 2 : 3 findings × 2 phases ✓
      finding({ phaseKey: 'geo', locationUrl: 'https://site.com/p2', pointsLost: 1 }),
      finding({ phaseKey: 'eeat', locationUrl: 'https://site.com/p2', pointsLost: 0.5 }),
      finding({ phaseKey: 'technical', locationUrl: 'https://site.com/p2', pointsLost: 0.5 }),
    ]
    const md = buildHotspotUrls(findings)
    expect(md).toContain('https://site.com/p1')
    expect(md).toContain('https://site.com/p2')
    expect(md).toContain('3.5')
    expect(md).toContain('2.0')
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
