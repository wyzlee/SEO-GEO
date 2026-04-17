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
import { dedupeFindings } from './dedup'
import { capitalizeProperNouns } from './proper-nouns'
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

export interface ReportBranding {
  logoUrl?: string | null
  primaryColor?: string | null
  accentColor?: string | null
  companyName?: string | null
}

export interface ReportInput {
  audit: ReportAudit
  phases: ReportPhase[]
  findings: ReportFinding[]
  branding?: ReportBranding | null
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

/**
 * Findings "actionnables" : on exclut synthesis (méta-insights cross-phase
 * qui ne représentent pas de constat technique propre, ils ont severity
 * critical/high mais pointsLost=0 — ils polluent les classements).
 */
function actionableFindings(findings: ReportFinding[]): ReportFinding[] {
  return findings.filter((f) => f.phaseKey !== 'synthesis')
}

/**
 * Dédup sémantique (v2). Délègue à `dedupeFindings` qui extrait un sujet
 * technique canonique (datePublished, sameAs, llms.txt, schema-organization,
 * web-vital-lcp, ...) pour fusionner les findings qui parlent du même sujet
 * quelle que soit la formulation. Fallback sur dédup string legacy quand
 * aucun sujet détectable.
 */
function dedupeByRecommendation(findings: ReportFinding[]): ReportFinding[] {
  return dedupeFindings(findings)
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
  const deduped = dedupeByRecommendation(
    actionableFindings(findings).filter(
      (f) => f.severity !== 'info' && f.pointsLost > 0,
    ),
  )
  const top = sortFindings(deduped).slice(0, 5)

  if (top.length === 0) {
    return '_Aucun problème critique détecté — excellent._'
  }

  return top
    .map((f, idx) => {
      const severity = SEVERITY_LABELS_FR[f.severity] ?? f.severity
      const effort = f.effort ? EFFORT_LABELS_FR[f.effort] ?? f.effort : null
      const effortLine = effort ? `\n\n**Effort estimé** : ${effort}.` : ''
      return `### ${idx + 1}. ${f.title}

**Impact** : ${severity} — coûte **${f.pointsLost} point${f.pointsLost > 1 ? 's' : ''}** dans le scoring.

${f.description}

**Recommandation** : ${f.recommendation}${effortLine}

---`
    })
    .join('\n\n')
}

export function buildQuickWins(findings: ReportFinding[]): string {
  const candidates = actionableFindings(findings).filter(
    (f) => f.effort === 'quick' && f.severity !== 'info',
  )
  const quicks = dedupeByRecommendation(candidates)
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
  const rankable = dedupeByRecommendation(
    actionableFindings(findings).filter((f) => f.severity !== 'info'),
  )
  const sorted = sortFindings(rankable)

  const quicks = sorted.filter((f) => f.effort === 'quick').slice(0, 5)
  const mediums = sorted.filter((f) => f.effort === 'medium').slice(0, 5)
  const heavys = sorted.filter((f) => f.effort === 'heavy').slice(0, 4)

  const sum = (list: ReportFinding[]) =>
    list.reduce((acc, f) => acc + f.pointsLost, 0)

  const actionLine = (f: ReportFinding) =>
    `- [ ] ${f.recommendation.replace(/\.$/, '')} (+${f.pointsLost} pt${f.pointsLost > 1 ? 's' : ''})`

  const sprintBody = (
    list: ReportFinding[],
    emptyMsg: string,
  ): string =>
    list.length ? list.map(actionLine).join('\n') : `_${emptyMsg}_`

  return `### 🏃 Sprint 1 — Victoires rapides (Semaines 1-2)

Objectif : récupérer ${sum(quicks).toFixed(1)} point${sum(quicks) > 1 ? 's' : ''} en < 10 h d'effort.

${sprintBody(quicks, 'Aucune action quick à planifier.')}

### 🔧 Sprint 2 — Structurant (Semaines 3-6)

Objectif : renforcer les fondations SEO/GEO, +${sum(mediums).toFixed(1)} point${sum(mediums) > 1 ? 's' : ''} potentiels.

${sprintBody(mediums, 'Aucun chantier de moyenne ampleur identifié.')}

### 🎯 Sprint 3 — Stratégique (Semaines 7-12)

Objectif : construire l'autorité long-terme, +${sum(heavys).toFixed(1)} point${sum(heavys) > 1 ? 's' : ''} potentiels.

${sprintBody(heavys, "Aucun chantier lourd identifié — votre site est globalement bien construit sur les fondations stratégiques.")}`
}

/**
 * Deterministic executive summary (V1) — 5-6 lines. V2 : swap for Claude API
 * call with structured input.
 */
export function buildExecutiveSummary(input: ReportInput): string {
  const { audit, phases, findings } = input
  const real = actionableFindings(findings)
  const critical = real.filter((f) => f.severity === 'critical').length
  const highs = real.filter((f) => f.severity === 'high').length

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
    `L'analyse identifie **${real.length} constat${real.length > 1 ? 's' : ''}** au total, dont **${critical + highs}** avec un impact élevé ou critique.`,
  )
  if (topWeakness) {
    const label = PHASE_LABELS_FR[topWeakness.phaseKey] ?? topWeakness.phaseKey
    const context = PHASE_CONTEXT_FR[topWeakness.phaseKey] ?? ''
    lines.push(
      `Le principal axe d'amélioration porte sur **${label}**. ${context}`,
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

  return capitalizeProperNouns(lines.join('\n\n'))
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

  // Si on a 0 ou 1 seule URL "à fort enjeu", la section perd sa valeur :
  // soit pas assez d'URLs analysées (crawl mono-page), soit problèmes
  // distribués. Mieux vaut masquer que rendre un tableau à 1 ligne.
  if (hotspots.length < 2) return ''

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
