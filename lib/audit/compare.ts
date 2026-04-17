/**
 * Diff entre deux audits du même site (N vs N-1).
 *
 * Objectifs :
 *  - Donner au client une vue "what changed" entre son dernier audit et
 *    le précédent (score global, score par phase, findings résolus /
 *    nouveaux / persistants).
 *  - Réutiliser la dédup sémantique par sujet (`extractSubject`) pour le
 *    matching cross-audit : deux findings "datePublished manquant" entre
 *    N et N-1 doivent matcher même si leur `title` exact a bougé.
 *  - Fonction pure : aucune DB access. Les callers (route API, section
 *    rapport) récupèrent les données et appellent `compareAudits`.
 */
import { extractSubject } from '@/lib/report/dedup'
import type { ReportFinding } from '@/lib/report/render'

export interface CompareAuditSummary {
  id: string
  scoreTotal: number | null
  finishedAt: Date | string | null
  targetUrl: string | null
}

export interface CompareInput {
  current: CompareAuditSummary
  previous: CompareAuditSummary
  currentPhases: Array<{ phaseKey: string; score: number | null; scoreMax: number }>
  previousPhases: Array<{
    phaseKey: string
    score: number | null
    scoreMax: number
  }>
  currentFindings: ReportFinding[]
  previousFindings: ReportFinding[]
}

export interface PhaseDelta {
  phaseKey: string
  previousScore: number
  currentScore: number
  scoreMax: number
  delta: number
}

export interface FindingDelta {
  resolved: ReportFinding[] // étaient dans N-1, absents de N
  introduced: ReportFinding[] // nouveaux dans N, absents de N-1
  persistent: ReportFinding[] // présents dans les deux (même sujet)
}

export interface CompareResult {
  scoreDelta: number // current - previous, arrondi 0.1
  currentScore: number
  previousScore: number
  daysBetween: number | null
  phases: PhaseDelta[]
  findings: FindingDelta
}

/**
 * Clé de matching cross-audit pour un finding.
 *   1. `extractSubject` si détectable (sujet technique canonique).
 *   2. Fallback `phaseKey:normalizedTitle` (premiers 60 car lowercased).
 *   3. Intègre `locationUrl` pour ne pas fusionner un datePublished
 *      manquant sur /blog/a et un datePublished manquant sur /blog/b.
 */
function findingKey(f: ReportFinding): string {
  const subject = extractSubject(f) ?? `t:${f.title.toLowerCase().slice(0, 60)}`
  const loc = f.locationUrl ?? ''
  return `${f.phaseKey}:${subject}:${loc}`
}

function daysBetween(a: Date | string | null, b: Date | string | null): number | null {
  if (!a || !b) return null
  const da = typeof a === 'string' ? new Date(a) : a
  const db = typeof b === 'string' ? new Date(b) : b
  if (isNaN(da.getTime()) || isNaN(db.getTime())) return null
  return Math.round(Math.abs(da.getTime() - db.getTime()) / (1000 * 60 * 60 * 24))
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

export function compareAudits(input: CompareInput): CompareResult {
  const currentScore = round1(input.current.scoreTotal ?? 0)
  const previousScore = round1(input.previous.scoreTotal ?? 0)

  const phaseMap = new Map<string, PhaseDelta>()
  for (const p of input.previousPhases) {
    phaseMap.set(p.phaseKey, {
      phaseKey: p.phaseKey,
      previousScore: round1(p.score ?? 0),
      currentScore: 0,
      scoreMax: p.scoreMax,
      delta: 0,
    })
  }
  for (const p of input.currentPhases) {
    const existing = phaseMap.get(p.phaseKey)
    if (existing) {
      existing.currentScore = round1(p.score ?? 0)
      existing.scoreMax = Math.max(existing.scoreMax, p.scoreMax)
    } else {
      phaseMap.set(p.phaseKey, {
        phaseKey: p.phaseKey,
        previousScore: 0,
        currentScore: round1(p.score ?? 0),
        scoreMax: p.scoreMax,
        delta: 0,
      })
    }
  }
  const phases: PhaseDelta[] = []
  for (const delta of phaseMap.values()) {
    delta.delta = round1(delta.currentScore - delta.previousScore)
    if (delta.phaseKey !== 'synthesis') phases.push(delta)
  }
  phases.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))

  const prevKeys = new Map<string, ReportFinding>()
  for (const f of input.previousFindings) {
    if (f.phaseKey === 'synthesis') continue
    prevKeys.set(findingKey(f), f)
  }
  const currentKeys = new Map<string, ReportFinding>()
  for (const f of input.currentFindings) {
    if (f.phaseKey === 'synthesis') continue
    currentKeys.set(findingKey(f), f)
  }

  const resolved: ReportFinding[] = []
  const introduced: ReportFinding[] = []
  const persistent: ReportFinding[] = []

  for (const [key, f] of prevKeys) {
    if (!currentKeys.has(key)) resolved.push(f)
    else persistent.push(currentKeys.get(key)!)
  }
  for (const [key, f] of currentKeys) {
    if (!prevKeys.has(key)) introduced.push(f)
  }

  // Ordonne par pointsLost décroissant pour mettre en avant les findings
  // à plus gros impact.
  const bySeverity = (a: ReportFinding, b: ReportFinding) =>
    b.pointsLost - a.pointsLost
  resolved.sort(bySeverity)
  introduced.sort(bySeverity)
  persistent.sort(bySeverity)

  return {
    scoreDelta: round1(currentScore - previousScore),
    currentScore,
    previousScore,
    daysBetween: daysBetween(input.current.finishedAt, input.previous.finishedAt),
    phases,
    findings: { resolved, introduced, persistent },
  }
}
