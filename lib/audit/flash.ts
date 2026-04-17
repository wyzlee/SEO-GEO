/**
 * Flash audit — ephemeral, no DB write.
 * Runs 4 lightweight phases on the homepage only (0 subpages).
 * Used by POST /api/audit/flash (public, no auth).
 */
import { crawlUrl } from './crawl'
import { runTechnicalPhase } from './phases/technical'
import { runStructuredDataPhase } from './phases/structured-data'
import { runGeoPhase } from './phases/geo'
import { runCommonMistakesPhase } from './phases/common-mistakes'
import type { PhaseKey } from './types'

export interface FlashPhaseScore {
  score: number
  scoreMax: number
  label: string
}

export interface FlashFinding {
  phaseKey: PhaseKey
  severity: string
  title: string
  recommendation: string
  pointsLost: number
  effort?: string
}

export interface FlashAuditResult {
  url: string
  score: number
  phases: {
    technical: FlashPhaseScore
    geo: FlashPhaseScore
    structured_data: FlashPhaseScore
    common_mistakes: FlashPhaseScore
  }
  topFindings: FlashFinding[]
  totalFindings: number
  analysedAt: string
}

const SEVERITY_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
}

export async function runFlashAudit(url: string): Promise<FlashAuditResult> {
  const crawl = await crawlUrl(url, { maxSubPages: 0, timeoutMs: 6_000 })

  const [technical, structuredData, geo, commonMistakes] = await Promise.all([
    runTechnicalPhase(crawl),
    runStructuredDataPhase(crawl),
    runGeoPhase(crawl),
    runCommonMistakesPhase(crawl),
  ])

  const results = [technical, structuredData, geo, commonMistakes]

  let effectiveScore = 0
  let effectiveScoreMax = 0
  for (const r of results) {
    if (r.status !== 'skipped') {
      effectiveScore += r.score
      effectiveScoreMax += r.scoreMax
    }
  }

  const score =
    effectiveScoreMax > 0
      ? Math.round((effectiveScore / effectiveScoreMax) * 100)
      : 0

  const allFindings = [
    ...technical.findings,
    ...structuredData.findings,
    ...geo.findings,
    ...commonMistakes.findings,
  ]

  const sorted = [...allFindings].sort((a, b) => {
    const diff =
      (SEVERITY_RANK[a.severity] ?? 5) - (SEVERITY_RANK[b.severity] ?? 5)
    return diff !== 0 ? diff : b.pointsLost - a.pointsLost
  })

  const topFindings: FlashFinding[] = sorted.slice(0, 5).map((f) => ({
    phaseKey: f.phaseKey,
    severity: f.severity,
    title: f.title,
    // Truncate recommendation — teaser only, full text requires account
    recommendation:
      f.recommendation.length > 40
        ? `${f.recommendation.slice(0, 40)}…`
        : f.recommendation,
    pointsLost: f.pointsLost,
    effort: f.effort,
  }))

  return {
    url: crawl.finalUrl,
    score,
    phases: {
      technical: {
        score: technical.score,
        scoreMax: technical.scoreMax,
        label: 'SEO Technique',
      },
      geo: {
        score: geo.score,
        scoreMax: geo.scoreMax,
        label: 'Visibilité IA',
      },
      structured_data: {
        score: structuredData.score,
        scoreMax: structuredData.scoreMax,
        label: 'Données structurées',
      },
      common_mistakes: {
        score: commonMistakes.score,
        scoreMax: commonMistakes.scoreMax,
        label: 'Erreurs courantes',
      },
    },
    topFindings,
    totalFindings: allFindings.length,
    analysedAt: new Date().toISOString(),
  }
}
