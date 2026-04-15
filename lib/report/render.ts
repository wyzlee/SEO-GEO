/**
 * Markdown renderers for each report section. Pure functions so we can
 * unit-test without DB or HTTP.
 */
import {
  EFFORT_LABELS_FR,
  PHASE_CONTEXT_FR,
  PHASE_LABELS_FR,
  SEVERITY_LABELS_FR,
} from './labels'
import { PHASE_ORDER, PHASE_SCORE_MAX } from '@/lib/audit/engine'
import type { PhaseKey } from '@/lib/audit/types'

export interface ReportAudit {
  id: string
  targetUrl: string | null
  clientName: string | null
  consultantName: string | null
  scoreTotal: number | null
  scoreBreakdown: Record<string, number> | null
  finishedAt: Date | string | null
}

export interface ReportPhase {
  phaseKey: string
  score: number | null
  scoreMax: number
  status: string
  summary: string | null
}

export interface ReportFinding {
  phaseKey: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  category: string | null
  title: string
  description: string
  recommendation: string
  pointsLost: number
  effort: 'quick' | 'medium' | 'heavy' | null
  locationUrl?: string | null
}

export interface ReportInput {
  audit: ReportAudit
  phases: ReportPhase[]
  findings: ReportFinding[]
}

const SEVERITY_WEIGHT: Record<ReportFinding['severity'], number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
}

function sortFindings(findings: ReportFinding[]): ReportFinding[] {
  return [...findings].sort((a, b) => {
    const diff = SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity]
    if (diff !== 0) return diff
    return b.pointsLost - a.pointsLost
  })
}

export function buildScoreBreakdown(phases: ReportPhase[]): string {
  const header =
    '| Catégorie | Score | Max | Ratio |\n|-----------|-------|-----|-------|'
  const rows = PHASE_ORDER.filter((key) => key !== 'synthesis').map(
    (key: PhaseKey) => {
      const phase = phases.find((p) => p.phaseKey === key)
      const score = phase?.score ?? 0
      const max = PHASE_SCORE_MAX[key]
      const label = PHASE_LABELS_FR[key] ?? key
      const ratio = max > 0 ? `${Math.round((score / max) * 100)} %` : '—'
      return `| ${label} | ${score} | ${max} | ${ratio} |`
    },
  )
  const total = phases.reduce((acc, p) => acc + (p.score ?? 0), 0)
  rows.push(`| **Total** | **${total.toFixed(1)}** | **100** | — |`)
  return [header, ...rows].join('\n')
}

export function buildTop5Issues(findings: ReportFinding[]): string {
  const top = sortFindings(findings)
    .filter((f) => f.severity !== 'info')
    .slice(0, 5)

  if (top.length === 0) {
    return '_Aucun problème critique détecté — excellent._'
  }

  return top
    .map((f, idx) => {
      const severity = SEVERITY_LABELS_FR[f.severity] ?? f.severity
      const effort = f.effort ? EFFORT_LABELS_FR[f.effort] ?? f.effort : 'Non évalué'
      return `### ${idx + 1}. ${f.title}

**Impact** : ${severity} — coûte **${f.pointsLost} point${f.pointsLost > 1 ? 's' : ''}** dans le scoring.

${f.description}

**Recommandation** : ${f.recommendation}

**Effort estimé** : ${effort}.

---`
    })
    .join('\n\n')
}

export function buildQuickWins(findings: ReportFinding[]): string {
  const quicks = findings
    .filter((f) => f.effort === 'quick' && f.severity !== 'info')
    .sort((a, b) => b.pointsLost - a.pointsLost)
    .slice(0, 10)

  if (quicks.length === 0) {
    return '_Aucune quick win à signaler._'
  }

  return quicks
    .map(
      (f) =>
        `- ✔ ${f.recommendation.replace(/\.$/, '')} (+${f.pointsLost} pt${f.pointsLost > 1 ? 's' : ''})`,
    )
    .join('\n')
}

export function buildStrengths(phases: ReportPhase[]): string {
  const scored = phases
    .filter((p) => p.phaseKey !== 'synthesis' && p.status !== 'skipped')
    .map((p) => {
      const ratio = p.scoreMax > 0 ? (p.score ?? 0) / p.scoreMax : 0
      return { phase: p, ratio }
    })
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, 3)

  if (scored.length === 0) return '_—_'

  return scored
    .map(
      ({ phase, ratio }) =>
        `- **${PHASE_LABELS_FR[phase.phaseKey] ?? phase.phaseKey}** (${Math.round(ratio * 100)} %)`,
    )
    .join('\n')
}

export function buildWeaknesses(phases: ReportPhase[]): string {
  const scored = phases
    .filter((p) => p.phaseKey !== 'synthesis' && p.status !== 'skipped')
    .map((p) => {
      const ratio = p.scoreMax > 0 ? (p.score ?? 0) / p.scoreMax : 0
      return { phase: p, ratio }
    })
    .sort((a, b) => a.ratio - b.ratio)
    .slice(0, 3)

  if (scored.length === 0) return '_—_'

  return scored
    .map(
      ({ phase, ratio }) =>
        `- **${PHASE_LABELS_FR[phase.phaseKey] ?? phase.phaseKey}** (${Math.round(ratio * 100)} %)`,
    )
    .join('\n')
}

export function buildRoadmap(findings: ReportFinding[]): string {
  const rankable = findings.filter((f) => f.severity !== 'info')
  const sorted = sortFindings(rankable)

  const quicks = sorted.filter((f) => f.effort === 'quick').slice(0, 5)
  const mediums = sorted.filter((f) => f.effort === 'medium').slice(0, 5)
  const heavys = sorted.filter((f) => f.effort === 'heavy').slice(0, 4)

  const sum = (list: ReportFinding[]) =>
    list.reduce((acc, f) => acc + f.pointsLost, 0)

  const actionLine = (f: ReportFinding) =>
    `- [ ] ${f.recommendation.replace(/\.$/, '')} (+${f.pointsLost} pt${f.pointsLost > 1 ? 's' : ''})`

  return `### 🏃 Sprint 1 — Victoires rapides (Semaines 1-2)

Objectif : récupérer ${sum(quicks).toFixed(1)} point${sum(quicks) > 1 ? 's' : ''} en < 10 h d'effort.

${quicks.length ? quicks.map(actionLine).join('\n') : '_—_'}

### 🔧 Sprint 2 — Structurant (Semaines 3-6)

Objectif : renforcer les fondations SEO/GEO, +${sum(mediums).toFixed(1)} point${sum(mediums) > 1 ? 's' : ''} potentiels.

${mediums.length ? mediums.map(actionLine).join('\n') : '_—_'}

### 🎯 Sprint 3 — Stratégique (Semaines 7-12)

Objectif : construire l'autorité long-terme, +${sum(heavys).toFixed(1)} point${sum(heavys) > 1 ? 's' : ''} potentiels.

${heavys.length ? heavys.map(actionLine).join('\n') : '_—_'}`
}

/**
 * Deterministic executive summary (V1) — 5-6 lines. V2 : swap for Claude API
 * call with structured input.
 */
export function buildExecutiveSummary(input: ReportInput): string {
  const { audit, phases, findings } = input
  const critical = findings.filter((f) => f.severity === 'critical').length
  const highs = findings.filter((f) => f.severity === 'high').length

  const topWeakness = [...phases]
    .filter((p) => p.phaseKey !== 'synthesis' && p.status !== 'skipped')
    .sort((a, b) => {
      const ra = a.scoreMax > 0 ? (a.score ?? 0) / a.scoreMax : 1
      const rb = b.scoreMax > 0 ? (b.score ?? 0) / b.scoreMax : 1
      return ra - rb
    })[0]

  const topStrength = [...phases]
    .filter((p) => p.phaseKey !== 'synthesis' && p.status !== 'skipped')
    .sort((a, b) => {
      const ra = a.scoreMax > 0 ? (a.score ?? 0) / a.scoreMax : 0
      const rb = b.scoreMax > 0 ? (b.score ?? 0) / b.scoreMax : 0
      return rb - ra
    })[0]

  const lines: string[] = []
  lines.push(
    `L'analyse identifie **${findings.length} constat${findings.length > 1 ? 's' : ''}** au total, dont **${critical + highs}** avec un impact élevé ou critique.`,
  )
  if (topWeakness) {
    const label = PHASE_LABELS_FR[topWeakness.phaseKey] ?? topWeakness.phaseKey
    lines.push(
      `Le principal axe d'amélioration porte sur **${label}** : ${(PHASE_CONTEXT_FR[topWeakness.phaseKey] ?? '').toLowerCase()}`,
    )
  }
  if (topStrength) {
    const label = PHASE_LABELS_FR[topStrength.phaseKey] ?? topStrength.phaseKey
    lines.push(
      `À l'inverse, **${label}** est déjà bien couvert et constitue une base solide.`,
    )
  }
  if (audit.targetUrl) {
    lines.push(
      `Les actions prioritaires à mener sur ${audit.targetUrl} sont listées en section « Points à corriger » et « Victoires rapides ».`,
    )
  }

  return lines.join('\n\n')
}

/**
 * Hotspot URLs : pages qui cumulent ≥ 3 findings sur ≥ 2 phases distinctes.
 * Recalculé depuis les findings bruts (plutôt que de parser la description
 * de la finding synthesis-hotspot-urls) pour un rendu propre.
 */
export function buildHotspotUrls(findings: ReportFinding[]): string {
  const perUrl = new Map<
    string,
    { count: number; phases: Set<string>; totalPoints: number }
  >()
  for (const f of findings) {
    if (!f.locationUrl || f.phaseKey === 'synthesis') continue
    const entry = perUrl.get(f.locationUrl) ?? {
      count: 0,
      phases: new Set<string>(),
      totalPoints: 0,
    }
    entry.count += 1
    entry.phases.add(f.phaseKey)
    entry.totalPoints += f.pointsLost
    perUrl.set(f.locationUrl, entry)
  }
  const hotspots = Array.from(perUrl.entries())
    .filter(([, v]) => v.count >= 3 && v.phases.size >= 2)
    .sort((a, b) => b[1].totalPoints - a[1].totalPoints)
    .slice(0, 5)

  if (hotspots.length === 0) return ''

  const rows = hotspots
    .map(
      ([url, v]) =>
        `| ${url} | ${v.count} | ${v.phases.size} | ${v.totalPoints.toFixed(1)} |`,
    )
    .join('\n')
  return `| URL | Constats | Phases | Pts perdus |
|-----|----------|--------|------------|
${rows}`
}

export function computePotentialGain(findings: ReportFinding[]): {
  min: number
  max: number
} {
  const total = findings
    .filter((f) => f.severity !== 'info')
    .reduce((acc, f) => acc + f.pointsLost, 0)
  return {
    min: Math.round(total * 0.4),
    max: Math.round(total * 0.8),
  }
}
