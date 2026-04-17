import { describe, expect, it } from 'vitest'
import { compareAudits } from '@/lib/audit/compare'
import type { ReportFinding } from '@/lib/report/render'

const audit = (scoreTotal: number, finishedAt: string) => ({
  id: `a-${scoreTotal}`,
  scoreTotal,
  finishedAt,
  targetUrl: 'https://example.com',
})

const phase = (
  phaseKey: string,
  score: number,
  scoreMax: number,
) => ({ phaseKey, score, scoreMax })

const finding = (overrides: Partial<ReportFinding>): ReportFinding => ({
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
})

describe('compareAudits', () => {
  it('returns positive delta when current score > previous', () => {
    const res = compareAudits({
      current: audit(78, '2026-04-17T10:00:00Z'),
      previous: audit(62, '2026-03-17T10:00:00Z'),
      currentPhases: [phase('technical', 10, 12)],
      previousPhases: [phase('technical', 6, 12)],
      currentFindings: [],
      previousFindings: [],
    })
    expect(res.scoreDelta).toBe(16)
    expect(res.daysBetween).toBe(31)
  })

  it('computes phase deltas and sorts by absolute impact', () => {
    const res = compareAudits({
      current: audit(50, '2026-04-17T10:00:00Z'),
      previous: audit(50, '2026-04-10T10:00:00Z'),
      currentPhases: [
        phase('technical', 12, 12),
        phase('geo', 10, 18),
        phase('eeat', 7, 10),
      ],
      previousPhases: [
        phase('technical', 8, 12),
        phase('geo', 15, 18),
        phase('eeat', 6, 10),
      ],
      currentFindings: [],
      previousFindings: [],
    })
    expect(res.phases[0].phaseKey).toBe('geo') // -5 (plus grand impact absolu)
    expect(res.phases[0].delta).toBe(-5)
    expect(res.phases[1].phaseKey).toBe('technical') // +4
    expect(res.phases[1].delta).toBe(4)
    expect(res.phases[2].phaseKey).toBe('eeat') // +1
  })

  it('ignores synthesis phase in phase deltas', () => {
    const res = compareAudits({
      current: audit(70, '2026-04-17T10:00:00Z'),
      previous: audit(60, '2026-04-10T10:00:00Z'),
      currentPhases: [
        phase('technical', 10, 12),
        phase('synthesis', 0, 0),
      ],
      previousPhases: [
        phase('technical', 8, 12),
        phase('synthesis', 0, 0),
      ],
      currentFindings: [],
      previousFindings: [],
    })
    expect(res.phases.find((p) => p.phaseKey === 'synthesis')).toBeUndefined()
  })

  it('classifies findings as resolved / introduced / persistent via subject matching', () => {
    const prev = [
      finding({
        phaseKey: 'structured_data',
        title: 'datePublished manquant',
        recommendation: 'Ajouter datePublished au JSON-LD Article',
        pointsLost: 2,
      }),
      finding({
        phaseKey: 'entity',
        title: 'sameAs vide',
        recommendation: 'Ajouter sameAs avec profils sociaux',
        pointsLost: 3,
      }),
    ]
    const curr = [
      // Même sujet (datePublished), formulation différente → persistent
      finding({
        phaseKey: 'structured_data',
        title: 'Champ datePublished absent',
        recommendation: 'Renseigner la propriété datePublished',
        pointsLost: 2,
      }),
      // Nouveau finding sur llms.txt
      finding({
        phaseKey: 'geo',
        title: '/llms.txt manquant',
        recommendation: 'Créer un fichier /llms.txt',
        pointsLost: 2,
      }),
      // sameAs absent de curr → resolved
    ]
    const res = compareAudits({
      current: audit(70, '2026-04-17T10:00:00Z'),
      previous: audit(60, '2026-04-10T10:00:00Z'),
      currentPhases: [],
      previousPhases: [],
      currentFindings: curr,
      previousFindings: prev,
    })
    expect(res.findings.resolved).toHaveLength(1)
    expect(res.findings.resolved[0].title).toContain('sameAs')
    expect(res.findings.persistent).toHaveLength(1)
    expect(res.findings.introduced).toHaveLength(1)
    expect(res.findings.introduced[0].title).toContain('llms.txt')
  })

  it('separates findings by locationUrl (same subject, different URL = distinct)', () => {
    const prev = [
      finding({
        phaseKey: 'structured_data',
        title: 'datePublished manquant',
        recommendation: 'Ajouter datePublished',
        locationUrl: 'https://site.com/a',
      }),
    ]
    const curr = [
      finding({
        phaseKey: 'structured_data',
        title: 'datePublished manquant',
        recommendation: 'Ajouter datePublished',
        locationUrl: 'https://site.com/b',
      }),
    ]
    const res = compareAudits({
      current: audit(70, '2026-04-17T10:00:00Z'),
      previous: audit(60, '2026-04-10T10:00:00Z'),
      currentPhases: [],
      previousPhases: [],
      currentFindings: curr,
      previousFindings: prev,
    })
    expect(res.findings.resolved).toHaveLength(1)
    expect(res.findings.introduced).toHaveLength(1)
    expect(res.findings.persistent).toHaveLength(0)
  })

  it('returns daysBetween=null when a date is missing', () => {
    const res = compareAudits({
      current: { id: 'c', scoreTotal: 70, finishedAt: null, targetUrl: null },
      previous: audit(60, '2026-04-10T10:00:00Z'),
      currentPhases: [],
      previousPhases: [],
      currentFindings: [],
      previousFindings: [],
    })
    expect(res.daysBetween).toBeNull()
  })
})
