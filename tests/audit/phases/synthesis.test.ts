import { describe, expect, it } from 'vitest'
import { runSynthesisPhase } from '@/lib/audit/phases/synthesis'
import type { Finding, PhaseKey } from '@/lib/audit/types'

function finding(
  overrides: Partial<Finding> & { phaseKey: PhaseKey },
): Finding {
  return {
    severity: 'medium',
    category: 'test',
    title: 'Test',
    description: 'Desc',
    recommendation: 'Do it',
    pointsLost: 1,
    ...overrides,
  }
}

describe('runSynthesisPhase', () => {
  it('returns severity breakdown even on empty input', () => {
    const result = runSynthesisPhase({ findings: [], breakdown: {} })
    expect(result.status).toBe('completed')
    expect(result.scoreMax).toBe(0)
    expect(result.score).toBe(0)
    const breakdown = result.findings.find(
      (f) => f.category === 'synthesis-severity-breakdown',
    )
    expect(breakdown).toBeDefined()
  })

  it('surfaces top critical findings ordered by severity then points', () => {
    const findings: Finding[] = [
      finding({ phaseKey: 'geo', severity: 'high', title: 'H1', pointsLost: 3 }),
      finding({ phaseKey: 'technical', severity: 'critical', title: 'C1', pointsLost: 2 }),
      finding({ phaseKey: 'eeat', severity: 'low', title: 'L1', pointsLost: 0.5 }),
      finding({ phaseKey: 'geo', severity: 'critical', title: 'C2', pointsLost: 4 }),
    ]
    const result = runSynthesisPhase({ findings, breakdown: {} })
    const top = result.findings.find(
      (f) => f.category === 'synthesis-top-critical',
    )
    expect(top).toBeDefined()
    // critical sortis en premier, et parmi les critical le plus gros pointsLost d'abord
    expect(top!.description).toContain('C2')
    expect(top!.description).toContain('C1')
    expect(top!.description).toContain('H1')
  })

  it('surfaces quick wins when ≥ 3 findings avec effort quick', () => {
    const findings: Finding[] = [
      finding({ phaseKey: 'technical', effort: 'quick', pointsLost: 1 }),
      finding({ phaseKey: 'geo', effort: 'quick', pointsLost: 0.5 }),
      finding({ phaseKey: 'eeat', effort: 'quick', pointsLost: 0.5 }),
      finding({ phaseKey: 'structured_data', effort: 'heavy', pointsLost: 2 }),
    ]
    const result = runSynthesisPhase({ findings, breakdown: {} })
    const qw = result.findings.find(
      (f) => f.category === 'synthesis-quick-wins',
    )
    expect(qw).toBeDefined()
    expect(qw!.title).toContain('2')
  })

  it('detects hotspot URLs (≥ 3 findings sur ≥ 2 phases)', () => {
    const findings: Finding[] = [
      finding({
        phaseKey: 'geo',
        locationUrl: 'https://site.com/blog/post1',
      }),
      finding({
        phaseKey: 'eeat',
        locationUrl: 'https://site.com/blog/post1',
      }),
      finding({
        phaseKey: 'technical',
        locationUrl: 'https://site.com/blog/post1',
      }),
      finding({
        phaseKey: 'geo',
        locationUrl: 'https://site.com/home',
      }),
    ]
    const result = runSynthesisPhase({ findings, breakdown: {} })
    const hotspot = result.findings.find(
      (f) => f.category === 'synthesis-hotspot-urls',
    )
    expect(hotspot).toBeDefined()
    expect(hotspot!.description).toContain('post1')
    expect(hotspot!.description).not.toContain('home')
  })

  it('flags weak fundamentals when ≥ 3 phases < 50 %', () => {
    const result = runSynthesisPhase({
      findings: [],
      breakdown: {
        technical: { score: 4, scoreMax: 12 },
        structured_data: { score: 5, scoreMax: 15 },
        geo: { score: 6, scoreMax: 18 },
        eeat: { score: 9, scoreMax: 10 },
      },
    })
    const weak = result.findings.find(
      (f) => f.category === 'synthesis-fundamentals',
    )
    expect(weak).toBeDefined()
    expect(weak!.description).toContain('technical')
    expect(weak!.description).toContain('structured_data')
  })

  it('ignores synthesis phase itself in fundamentals check', () => {
    const result = runSynthesisPhase({
      findings: [],
      breakdown: {
        technical: { score: 11, scoreMax: 12 },
        geo: { score: 16, scoreMax: 18 },
        synthesis: { score: 0, scoreMax: 0 },
      },
    })
    const weak = result.findings.find(
      (f) => f.category === 'synthesis-fundamentals',
    )
    expect(weak).toBeUndefined()
  })
})
