/**
 * Audit engine orchestrator.
 * Runs the 11 audit phases sequentially. Only `technical` is implemented today
 * (Sprint 03 in progress). Remaining phases raise "not implemented" and leave
 * the phase row in status `skipped` so the audit can still complete.
 *
 * Reference: `.claude/docs/audit-engine.md`.
 */

import { crawlUrl } from './crawl'
import { runTechnicalPhase, TECHNICAL_SCORE_MAX } from './phases/technical'
import type {
  AuditInput,
  AuditResult,
  CrawlSnapshot,
  Finding,
  PhaseKey,
  PhaseResult,
} from './types'

export const PHASE_ORDER: PhaseKey[] = [
  'technical',
  'structured_data',
  'geo',
  'entity',
  'eeat',
  'freshness',
  'international',
  'performance',
  'topical',
  'common_mistakes',
  'synthesis',
]

export const PHASE_SCORE_MAX: Record<PhaseKey, number> = {
  technical: TECHNICAL_SCORE_MAX,
  structured_data: 15,
  geo: 18,
  entity: 10,
  eeat: 10,
  freshness: 8,
  international: 8,
  performance: 8,
  topical: 6,
  common_mistakes: 5,
  synthesis: 0,
}

export interface RunAuditOptions {
  auditId: string
  organizationId: string
  input: AuditInput
}

async function resolveInput(
  input: AuditInput,
): Promise<{ crawl?: CrawlSnapshot }> {
  if (input.type === 'url') {
    const crawl = await crawlUrl(input.targetUrl)
    return { crawl }
  }
  // zip/github inputs land in Sprint 06
  return {}
}

async function runPhase(
  key: PhaseKey,
  context: { crawl?: CrawlSnapshot },
): Promise<PhaseResult> {
  const scoreMax = PHASE_SCORE_MAX[key]
  switch (key) {
    case 'technical':
      if (!context.crawl) {
        return {
          phaseKey: key,
          score: 0,
          scoreMax,
          status: 'skipped',
          summary: 'Phase technique ignorée (pas de crawl URL disponible)',
          findings: [],
        }
      }
      return runTechnicalPhase(context.crawl)

    case 'synthesis':
      return {
        phaseKey: key,
        score: 0,
        scoreMax: 0,
        status: 'completed',
        summary: 'Synthèse — pas de scoring, livrables générés par le moteur de rapport',
        findings: [],
      }

    default:
      return {
        phaseKey: key,
        score: 0,
        scoreMax,
        status: 'skipped',
        summary: `Phase ${key} pas encore implémentée (Sprint 03 en cours)`,
        findings: [],
      }
  }
}

/**
 * Run all phases for an audit. Returns the aggregated result.
 * Persistence (DB writes) is handled by the worker, not here — this keeps the
 * engine pure and easy to unit-test.
 */
export async function runAudit(options: RunAuditOptions): Promise<AuditResult> {
  const context = await resolveInput(options.input)

  const findings: Finding[] = []
  const breakdown: Partial<Record<PhaseKey, number>> = {}
  let totalScore = 0

  for (const key of PHASE_ORDER) {
    const result = await runPhase(key, context)
    breakdown[key] = result.score
    totalScore += result.score
    findings.push(...result.findings)
  }

  return { totalScore, breakdown, findings }
}
