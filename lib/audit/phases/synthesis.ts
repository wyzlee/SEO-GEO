/**
 * Phase 11 — Synthesis (0 pt, non scoré)
 *
 * Agrège les findings des 10 phases précédentes pour produire des insights
 * cross-phase : hotspots URL, quick-wins, corrélations faibles. Ne retire
 * pas de points (pointsLost = 0) — sert uniquement au livrable client et
 * au dashboard interne pour prioriser.
 */
import type { Finding, PhaseKey, PhaseResult } from '../types'

const PHASE_KEY = 'synthesis' as const

interface SynthesisContext {
  findings: Finding[]
  breakdown: Partial<Record<PhaseKey, { score: number; scoreMax: number }>>
}

interface CheckSpec {
  severity: Finding['severity']
  category: string
  title: string
  description: string
  recommendation: string
  metricValue?: string
  locationUrl?: string
}

const SEVERITY_RANK: Record<Finding['severity'], number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  info: 0,
}

export function runSynthesisPhase(context: SynthesisContext): PhaseResult {
  const findings: Finding[] = []
  const { findings: allFindings, breakdown } = context

  const pushCheck = (check: CheckSpec) => {
    findings.push({
      phaseKey: PHASE_KEY,
      severity: check.severity,
      category: check.category,
      title: check.title,
      description: check.description,
      recommendation: check.recommendation,
      pointsLost: 0,
      locationUrl: check.locationUrl,
      metricValue: check.metricValue,
    })
  }

  // --- Top 3 critical issues ---------------------------------------------
  const critical = allFindings
    .filter((f) => f.severity === 'critical' || f.severity === 'high')
    .sort((a, b) => {
      const sevDiff = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]
      if (sevDiff !== 0) return sevDiff
      return b.pointsLost - a.pointsLost
    })
    .slice(0, 3)
  if (critical.length > 0) {
    pushCheck({
      severity: 'critical',
      category: 'synthesis-top-critical',
      title: 'Top des constats bloquants',
      description:
        'Les constats suivants (critical/high) concentrent la plus grosse part de perte et doivent être traités en priorité :\n' +
        critical
          .map(
            (f, i) =>
              `${i + 1}. [${f.phaseKey}] ${f.title} — ${f.pointsLost} pt(s)`,
          )
          .join('\n'),
      recommendation:
        'Prioriser ces constats dans le plan d\'action des 2 premières semaines. Ils représentent à eux seuls un gain potentiel mesurable sur le score global.',
      metricValue: `${critical.length} constat(s) critique(s)`,
    })
  }

  // --- Quick wins --------------------------------------------------------
  const quickWins = allFindings.filter(
    (f) => f.effort === 'quick' && f.pointsLost >= 0.5,
  )
  const quickWinsTotal = quickWins.reduce((acc, f) => acc + f.pointsLost, 0)
  if (quickWins.length >= 3) {
    pushCheck({
      severity: 'info',
      category: 'synthesis-quick-wins',
      title: `Quick-wins : ${Math.round(quickWinsTotal * 10) / 10} pts récupérables en effort court`,
      description: `${quickWins.length} constat(s) avec effort "quick" totalisent ${Math.round(quickWinsTotal * 10) / 10} points potentiels. Correction possible en quelques heures, souvent en quelques minutes par cas.`,
      recommendation:
        'Boucler d\'abord les quick-wins (édition meta, ajout schema, correction anchors) avant d\'attaquer les chantiers lourds — le score remonte vite et motive l\'équipe.',
      metricValue: `${quickWins.length} quick-win(s)`,
    })
  }

  // --- Hotspot URLs ------------------------------------------------------
  // Un hotspot = ≥ 3 findings sur ≥ 2 phases distinctes pour une même URL.
  const perUrl = new Map<string, { findings: Finding[]; phases: Set<PhaseKey> }>()
  for (const f of allFindings) {
    if (!f.locationUrl) continue
    const entry = perUrl.get(f.locationUrl) ?? {
      findings: [],
      phases: new Set<PhaseKey>(),
    }
    entry.findings.push(f)
    entry.phases.add(f.phaseKey)
    perUrl.set(f.locationUrl, entry)
  }
  const hotspots = Array.from(perUrl.entries())
    .filter(([, v]) => v.findings.length >= 3 && v.phases.size >= 2)
    .sort((a, b) => b[1].findings.length - a[1].findings.length)
    .slice(0, 5)
  if (hotspots.length > 0) {
    pushCheck({
      severity: 'high',
      category: 'synthesis-hotspot-urls',
      title: `${hotspots.length} URL(s) concentrent la majorité des problèmes`,
      description:
        'URLs présentes dans ≥ 3 constats sur ≥ 2 phases distinctes — optimiser ces pages en priorité donne un gain immédiat sur plusieurs axes à la fois :\n' +
        hotspots
          .map(
            ([url, v]) =>
              `• ${url} — ${v.findings.length} constats / ${v.phases.size} phases`,
          )
          .join('\n'),
      recommendation:
        'Traiter ces URLs comme des chantiers unitaires : relecture complète, pass technique + structured data + GEO ensemble. Effet boule de neige sur le score phase par phase.',
      metricValue: `${hotspots.length} hotspot(s)`,
      locationUrl: hotspots[0][0],
    })
  }

  // --- Phase correlation : fondamentaux faibles --------------------------
  const weakPhases = Object.entries(breakdown)
    .filter(([key, b]) => {
      if (!b || b.scoreMax === 0 || key === 'synthesis') return false
      return b.score / b.scoreMax < 0.5
    })
    .map(([key, b]) => ({
      key: key as PhaseKey,
      ratio: b!.score / b!.scoreMax,
    }))
    .sort((a, b) => a.ratio - b.ratio)
  if (weakPhases.length >= 3) {
    pushCheck({
      severity: 'high',
      category: 'synthesis-fundamentals',
      title: `${weakPhases.length} phases sous 50 % — fondamentaux à revoir`,
      description:
        'Phases sous la barre des 50 % du score max :\n' +
        weakPhases
          .slice(0, 5)
          .map((p) => `• ${p.key} — ${Math.round(p.ratio * 100)} %`)
          .join('\n') +
        '\n\nAttaquer d\'abord les fondamentaux technical + structured_data + GEO avant l\'optimisation fine (topical, international).',
      recommendation:
        'Construire un plan en 3 temps : (1) fondamentaux technique + schema de base, (2) GEO + E-E-A-T, (3) optimisations fines (topical, international). Passer à (2) seulement une fois (1) à ≥ 80 %.',
      metricValue: `${weakPhases.length} phases faibles`,
    })
  }

  // --- Severity summary ---------------------------------------------------
  const severityCounts = {
    critical: allFindings.filter((f) => f.severity === 'critical').length,
    high: allFindings.filter((f) => f.severity === 'high').length,
    medium: allFindings.filter((f) => f.severity === 'medium').length,
    low: allFindings.filter((f) => f.severity === 'low').length,
    info: allFindings.filter((f) => f.severity === 'info').length,
  }
  pushCheck({
    severity: 'info',
    category: 'synthesis-severity-breakdown',
    title: 'Répartition des constats par sévérité',
    description: `Total : ${allFindings.length} constat(s). Critical ${severityCounts.critical} · High ${severityCounts.high} · Medium ${severityCounts.medium} · Low ${severityCounts.low} · Info ${severityCounts.info}.`,
    recommendation:
      'Suivre la pyramide : résoudre les critical/high d\'abord, puis medium, puis polish low/info. Les info sont souvent des signaux "bien vus" sans pénalité.',
    metricValue: `${allFindings.length} total`,
  })

  return {
    phaseKey: PHASE_KEY,
    score: 0,
    scoreMax: 0,
    status: 'completed',
    summary: `Synthèse — ${findings.length} insight(s) cross-phase`,
    findings,
  }
}

export const SYNTHESIS_SCORE_MAX = 0
