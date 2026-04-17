import { describe, expect, it } from 'vitest'
import { dedupeFindings, extractSubject } from '@/lib/report/dedup'
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

describe('extractSubject', () => {
  it('detects llms.txt in title', () => {
    expect(
      extractSubject(
        finding({ title: 'Fichier /llms.txt manquant', recommendation: 'Créer /llms.txt' }),
      ),
    ).toBe('llms.txt')
  })

  it('detects datePublished variants (CamelCase, spaced, French)', () => {
    expect(
      extractSubject(finding({ title: 'datePublished absent', recommendation: '' })),
    ).toBe('datepublished')
    expect(
      extractSubject(finding({ title: 'date published non renseigné', recommendation: '' })),
    ).toBe('datepublished')
    expect(
      extractSubject(
        finding({ title: 'Date de publication manquante', recommendation: '' }),
      ),
    ).toBe('datepublished')
  })

  it('detects sameAs both spellings', () => {
    expect(
      extractSubject(finding({ title: 'sameAs manquant', recommendation: '' })),
    ).toBe('sameas')
    expect(
      extractSubject(finding({ title: 'same as absent', recommendation: '' })),
    ).toBe('sameas')
  })

  it('detects web vitals LCP/INP/CLS', () => {
    expect(
      extractSubject(finding({ title: 'LCP > 2.5s', recommendation: '' })),
    ).toBe('web-vital-lcp')
    expect(
      extractSubject(
        finding({ title: 'Interaction to Next Paint trop élevé', recommendation: '' }),
      ),
    ).toBe('web-vital-inp')
  })

  it('prefers llms-full.txt over llms.txt (specificity)', () => {
    expect(
      extractSubject(
        finding({ title: 'llms-full.txt manquant', recommendation: '' }),
      ),
    ).toBe('llms-full.txt')
  })

  it('returns null when no technical subject is found', () => {
    expect(
      extractSubject(
        finding({
          title: 'Contenu trop court sur la page produit',
          recommendation: 'Rédiger plus de contenu pertinent.',
        }),
      ),
    ).toBeNull()
  })
})

describe('dedupeFindings', () => {
  it('merges two findings about datePublished across different phases', () => {
    const findings = [
      finding({
        phaseKey: 'freshness',
        title: 'datePublished manquant',
        recommendation: 'Ajouter une propriété datePublished au JSON-LD Article.',
        pointsLost: 1,
      }),
      finding({
        phaseKey: 'structured_data',
        title: 'Champ datePublished non renseigné',
        recommendation: 'Renseigner datePublished dans le schema Article pour le signal fraîcheur.',
        pointsLost: 2,
      }),
    ]
    const out = dedupeFindings(findings)
    expect(out).toHaveLength(1)
    expect(out[0].pointsLost).toBe(2) // keep max
  })

  it('does not merge findings on distinct subjects', () => {
    const findings = [
      finding({ title: 'datePublished manquant', pointsLost: 1 }),
      finding({ title: 'sameAs vide', pointsLost: 2 }),
    ]
    expect(dedupeFindings(findings)).toHaveLength(2)
  })

  it('merges recommandations distinctes en bullets', () => {
    const findings = [
      finding({
        title: 'llms.txt manquant',
        recommendation: 'Créer un fichier /llms.txt à la racine.',
        pointsLost: 2,
      }),
      finding({
        title: 'llms.txt vide',
        recommendation: 'Le contenu du llms.txt doit résumer le site en Markdown.',
        pointsLost: 1,
      }),
    ]
    const out = dedupeFindings(findings)
    expect(out).toHaveLength(1)
    expect(out[0].recommendation).toContain('Créer un fichier')
    expect(out[0].recommendation).toContain('résumer le site')
    expect(out[0].recommendation).toContain('\n- ')
  })

  it('falls back to string dedup for findings without technical subject', () => {
    const findings = [
      finding({
        title: 'Contenu mince',
        recommendation: 'Rédiger au moins 300 mots de contenu pertinent.',
        pointsLost: 1,
      }),
      finding({
        title: 'Page à faible contenu',
        recommendation: 'Rédiger au moins 300 mots de contenu pertinent.',
        pointsLost: 2,
      }),
    ]
    const out = dedupeFindings(findings)
    expect(out).toHaveLength(1)
    expect(out[0].pointsLost).toBe(2)
  })

  it('preserves unrelated findings untouched', () => {
    const findings = [
      finding({ title: 'datePublished manquant', pointsLost: 1 }),
      finding({
        title: 'Contenu mince',
        recommendation: 'Rédiger au moins 300 mots.',
        pointsLost: 1,
      }),
      finding({ title: 'sameAs vide', pointsLost: 2 }),
    ]
    expect(dedupeFindings(findings)).toHaveLength(3)
  })
})
