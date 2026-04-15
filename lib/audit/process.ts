/**
 * Full audit pipeline : crawl → 11 phases → persist at each step.
 * Called from the API route (fire-and-forget via `after()`) or from the
 * background worker. Keeps writes incremental so partial progress is visible
 * during polling.
 */
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { audits } from '@/lib/db/schema'
import { crawlUrl } from './crawl'
import { runTechnicalPhase } from './phases/technical'
import { runStructuredDataPhase } from './phases/structured-data'
import { runGeoPhase } from './phases/geo'
import { runEntityPhase } from './phases/entity'
import { runEeatPhase } from './phases/eeat'
import { runFreshnessPhase } from './phases/freshness'
import { runInternationalPhase } from './phases/international'
import { runPerformancePhase } from './phases/performance'
import { runTopicalPhase } from './phases/topical'
import { runCommonMistakesPhase } from './phases/common-mistakes'
import { PHASE_ORDER, PHASE_SCORE_MAX } from './engine'
import type { CrawlSnapshot, PhaseKey, PhaseResult } from './types'
import {
  completeAudit,
  failAudit,
  markAuditRunning,
  markPhaseFailed,
  markPhaseRunning,
  persistPhaseResult,
  seedAuditPhases,
} from './persist'

function skipped(key: PhaseKey, scoreMax: number): PhaseResult {
  return {
    phaseKey: key,
    score: 0,
    scoreMax,
    status: 'skipped',
    summary: 'Phase ignorée (pas de crawl URL disponible)',
    findings: [],
  }
}

async function runPhase(
  key: PhaseKey,
  crawl?: CrawlSnapshot,
): Promise<PhaseResult> {
  const scoreMax = PHASE_SCORE_MAX[key]
  switch (key) {
    case 'technical':
      return crawl ? runTechnicalPhase(crawl) : skipped(key, scoreMax)
    case 'structured_data':
      return crawl ? runStructuredDataPhase(crawl) : skipped(key, scoreMax)
    case 'geo':
      return crawl ? runGeoPhase(crawl) : skipped(key, scoreMax)
    case 'entity':
      return crawl ? runEntityPhase(crawl) : skipped(key, scoreMax)
    case 'eeat':
      return crawl ? runEeatPhase(crawl) : skipped(key, scoreMax)
    case 'freshness':
      return crawl ? runFreshnessPhase(crawl) : skipped(key, scoreMax)
    case 'international':
      return crawl ? runInternationalPhase(crawl) : skipped(key, scoreMax)
    case 'performance':
      return crawl ? runPerformancePhase(crawl) : skipped(key, scoreMax)
    case 'topical':
      return crawl ? runTopicalPhase(crawl) : skipped(key, scoreMax)
    case 'common_mistakes':
      return crawl ? runCommonMistakesPhase(crawl) : skipped(key, scoreMax)
    case 'synthesis':
      return {
        phaseKey: key,
        score: 0,
        scoreMax: 0,
        status: 'completed',
        summary:
          'Synthèse — pas de scoring, livrables générés par le moteur de rapport',
        findings: [],
      }
    default:
      return skipped(key, scoreMax)
  }
}

export async function processAudit(auditId: string): Promise<void> {
  try {
    const rows = await db
      .select()
      .from(audits)
      .where(eq(audits.id, auditId))
      .limit(1)
    const audit = rows[0]
    if (!audit) throw new Error(`Audit ${auditId} introuvable`)

    await markAuditRunning(auditId)
    await seedAuditPhases(auditId)

    let crawl: CrawlSnapshot | undefined
    if (audit.inputType === 'url' && audit.targetUrl) {
      crawl = await crawlUrl(audit.targetUrl)
    }

    const breakdown: Partial<Record<PhaseKey, number>> = {}
    let totalScore = 0

    for (const key of PHASE_ORDER) {
      try {
        await markPhaseRunning(auditId, key)
        const result = await runPhase(key, crawl)
        await persistPhaseResult(auditId, result)
        breakdown[key] = result.score
        totalScore += result.score
      } catch (phaseError) {
        console.error(`[audit ${auditId}] phase ${key} failed`, phaseError)
        await markPhaseFailed(auditId, key, phaseError)
      }
    }

    await completeAudit(auditId, totalScore, breakdown)
  } catch (error) {
    console.error(`[audit ${auditId}] fatal error`, error)
    await failAudit(auditId, error).catch(() => undefined)
  }
}
