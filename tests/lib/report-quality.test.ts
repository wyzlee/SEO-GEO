import { describe, expect, it } from 'vitest'
import { dedupeFindings, extractSubject } from '@/lib/report/dedup'
import { capitalizeProperNouns } from '@/lib/report/proper-nouns'
import { generateReport } from '@/lib/report/generate'
import type { ReportFinding, ReportInput, ReportPhase } from '@/lib/report/render'

// ── Fixture helpers ───────────────────────────────────────────────────────────

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

function phase(overrides: Partial<ReportPhase>): ReportPhase {
  return {
    phaseKey: 'technical',
    score: 8,
    scoreMax: 12,
    status: 'done',
    summary: 'Bonne base technique.',
    ...overrides,
  }
}

const MINIMAL_AUDIT: ReportInput['audit'] = {
  id: 'test-audit-001',
  targetUrl: 'https://example.com',
  clientName: null,
  consultantName: null,
  scoreTotal: 75,
  scoreBreakdown: null,
  finishedAt: new Date('2026-01-15T10:00:00Z'),
}

function minimalInput(overrides: Partial<ReportInput> = {}): ReportInput {
  return {
    audit: MINIMAL_AUDIT,
    phases: [phase({ phaseKey: 'technical' })],
    findings: [],
    branding: null,
    ...overrides,
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('rapport quality gates', () => {
  // Test 1 — Dédup sémantique cross-phase
  // Deux phases différentes émettent un finding sur datePublished.
  // Sans dédup, le rapport affiche 2× le même sujet.
  it('dédup sémantique cross-phase : datePublished fusionné en 1 seul finding avec pointsLost max', () => {
    const findings = [
      finding({
        phaseKey: 'freshness',
        title: 'datePublished absent de la page',
        recommendation: 'Ajouter une propriété datePublished au JSON-LD Article.',
        pointsLost: 1,
        severity: 'medium',
      }),
      finding({
        phaseKey: 'structured_data',
        title: 'Champ datePublished non renseigné dans le schema',
        recommendation: 'Renseigner datePublished dans le schema Article pour le signal fraîcheur.',
        pointsLost: 3,
        severity: 'high',
      }),
    ]

    const deduped = dedupeFindings(findings)

    expect(deduped).toHaveLength(1)
    expect(deduped[0].pointsLost).toBe(3) // garde le max
  })

  // Test 2 — extractSubject : guard titre vide + détection llms.txt
  // Un finding avec titre vide ne doit pas générer de faux positif de sujet.
  // Un finding avec titre réel doit être correctement reconnu.
  it('extractSubject : titre vide → null ; titre réel llms.txt → sujet détecté', () => {
    const emptyTitleFinding = finding({ title: '', recommendation: '' })
    expect(extractSubject(emptyTitleFinding)).toBeNull()

    const realFinding = finding({
      title: 'Fichier /llms.txt manquant',
      recommendation: 'Créer /llms.txt à la racine pour signaler le contenu aux LLMs.',
    })
    expect(extractSubject(realFinding)).toBe('llms.txt')
  })

  // Test 3 — Sections conditionnelles : quickWins sans findings effort='quick'
  // Si aucun finding n'a effort='quick', le HTML doit contenir le message
  // de fallback "Aucune quick win à signaler." et non une liste vide.
  it('quickWins vides → message de fallback, pas de liste vide', () => {
    const findings = [
      finding({
        title: 'sameAs manquant dans le JSON-LD Organization',
        recommendation: 'Ajouter la propriété sameAs avec les URLs Wikipedia et Wikidata.',
        pointsLost: 2,
        effort: 'medium',
        severity: 'high',
      }),
      finding({
        title: 'Balise title trop longue',
        recommendation: 'Réduire le title à moins de 60 caractères.',
        pointsLost: 1,
        effort: 'heavy',
        severity: 'medium',
      }),
    ]

    const result = generateReport(minimalInput({ findings }))

    // Le message de fallback doit être présent
    expect(result.html).toContain('Aucune quick win à signaler')
    // Pas de liste vide (div.qw-list sans items)
    expect(result.html).not.toContain('<div class="qw-list">')
  })

  // Test 4 — Roadmap : sprints sans findings effort correspondant
  // Quand aucun finding n'est effort='medium' ou 'heavy', les sprints 2 et 3
  // doivent afficher le message "Aucune action à planifier." et non rester vides.
  it('roadmap sprints vides → fallback "Aucune action à planifier", pas de sprint-body vide', () => {
    const findings = [
      finding({
        title: '/llms.txt introuvable',
        recommendation: 'Créer /llms.txt à la racine du domaine.',
        pointsLost: 2,
        effort: 'quick',
        severity: 'high',
      }),
    ]

    const result = generateReport(minimalInput({ findings }))

    // Les sprints 2 et 3 doivent contenir le message de fallback (effort medium/heavy vides)
    expect(result.html).toContain('Aucune action à planifier')
    // Aucun sprint-body ne doit être structurellement vide (balise div sans contenu)
    expect(result.html).not.toMatch(/<div class="sprint-body">\s*<\/div>/)
  })

  // Test 5 — Capitalisation des noms propres dans le markdown
  // "google" en minuscule → "Google", "ia" → "IA", "chatgpt" → "ChatGPT"
  // Les URLs et le code inline backticks doivent être préservés.
  it('capitalizeProperNouns : corrige la casse des noms propres sans toucher aux URLs ni au code', () => {
    expect(capitalizeProperNouns('optimisation google')).toBe('optimisation Google')
    expect(capitalizeProperNouns('moteurs ia et chatgpt')).toBe('moteurs IA et ChatGPT')

    // URL http : le token "google" dans l'URL doit être préservé
    const withUrl = 'Voir https://www.google.com pour les détails'
    expect(capitalizeProperNouns(withUrl)).toBe('Voir https://www.google.com pour les détails')

    // Code inline backtick : préservé tel quel
    const withCode = 'La propriété `google` est réservée'
    expect(capitalizeProperNouns(withCode)).toBe('La propriété `google` est réservée')
  })
})
