/**
 * Full audit pipeline : resolveInput (crawl URL / extract zip / clone github)
 * → 11 phases → persist at each step.
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
import { runSynthesisPhase } from './phases/synthesis'
import {
  runTechnicalPhaseCode,
  runStructuredDataPhaseCode,
  runGeoPhaseCode,
} from './code/phases'
import { readCodeSnapshot, type CodeSnapshot } from './code/read'
import { cloneGithubRepo } from './code/clone'
import { cleanupRoot } from './upload/extract'
import { PHASE_ORDER, PHASE_SCORE_MAX } from './engine'
import type { CrawlSnapshot, Finding, PhaseKey, PhaseResult } from './types'
import {
  completeAudit,
  failAudit,
  markAuditRunning,
  markPhaseFailed,
  markPhaseRunning,
  persistPhaseResult,
  seedAuditPhases,
} from './persist'

function skipped(key: PhaseKey, scoreMax: number, reason: string): PhaseResult {
  return {
    phaseKey: key,
    score: 0,
    scoreMax,
    status: 'skipped',
    summary: reason,
    findings: [],
  }
}

interface PipelineContext {
  crawl?: CrawlSnapshot
  code?: CodeSnapshot
  cleanupPaths: string[]
}

async function resolveInput(audit: {
  inputType: string
  targetUrl: string | null
  uploadPath: string | null
  githubRepo: string | null
}): Promise<PipelineContext> {
  const ctx: PipelineContext = { cleanupPaths: [] }

  if (audit.inputType === 'url' && audit.targetUrl) {
    ctx.crawl = await crawlUrl(audit.targetUrl)
    return ctx
  }

  if (audit.inputType === 'zip' && audit.uploadPath) {
    ctx.code = await readCodeSnapshot(audit.uploadPath)
    ctx.cleanupPaths.push(audit.uploadPath)
    return ctx
  }

  if (audit.inputType === 'github' && audit.githubRepo) {
    const clone = await cloneGithubRepo(audit.githubRepo)
    ctx.code = await readCodeSnapshot(clone.rootPath)
    ctx.cleanupPaths.push(clone.rootPath)
    return ctx
  }

  throw new Error(`Input non supporté : ${audit.inputType}`)
}

async function runPhaseForCrawl(
  key: PhaseKey,
  crawl: CrawlSnapshot,
): Promise<PhaseResult> {
  const scoreMax = PHASE_SCORE_MAX[key]
  switch (key) {
    case 'technical':
      return runTechnicalPhase(crawl)
    case 'structured_data':
      return runStructuredDataPhase(crawl)
    case 'geo':
      return runGeoPhase(crawl)
    case 'entity':
      return runEntityPhase(crawl)
    case 'eeat':
      return runEeatPhase(crawl)
    case 'freshness':
      return runFreshnessPhase(crawl)
    case 'international':
      return runInternationalPhase(crawl)
    case 'performance':
      return runPerformancePhase(crawl)
    case 'topical':
      return runTopicalPhase(crawl)
    case 'common_mistakes':
      return runCommonMistakesPhase(crawl)
    case 'synthesis':
      // synthesis is handled at orchestration level (needs cross-phase data)
      return {
        phaseKey: key,
        score: 0,
        scoreMax: 0,
        status: 'skipped',
        summary: 'Synthesis handled by orchestrator',
        findings: [],
      }
    default:
      return skipped(key, scoreMax, `Phase ${key} non reconnue`)
  }
}

async function runPhaseForCode(
  key: PhaseKey,
  code: CodeSnapshot,
): Promise<PhaseResult> {
  const scoreMax = PHASE_SCORE_MAX[key]
  switch (key) {
    case 'technical':
      return runTechnicalPhaseCode(code)
    case 'structured_data':
      return runStructuredDataPhaseCode(code)
    case 'geo':
      return runGeoPhaseCode(code)
    case 'synthesis':
      // synthesis is handled at orchestration level (needs cross-phase data)
      return {
        phaseKey: key,
        score: 0,
        scoreMax: 0,
        status: 'skipped',
        summary: 'Synthesis handled by orchestrator',
        findings: [],
      }
    default:
      return skipped(
        key,
        scoreMax,
        'Phase non disponible en mode code V1 (URL mode recommandé)',
      )
  }
}

export async function processAudit(auditId: string): Promise<void> {
  let cleanupPaths: string[] = []
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

    const ctx = await resolveInput({
      inputType: audit.inputType,
      targetUrl: audit.targetUrl,
      uploadPath: audit.uploadPath,
      githubRepo: audit.githubRepo,
    })
    cleanupPaths = ctx.cleanupPaths

    const breakdown: Partial<Record<PhaseKey, number>> = {}
    const detailedBreakdown: Partial<
      Record<PhaseKey, { score: number; scoreMax: number }>
    > = {}
    const allFindings: Finding[] = []
    let totalScore = 0

    for (const key of PHASE_ORDER) {
      try {
        await markPhaseRunning(auditId, key)
        let result: PhaseResult
        if (key === 'synthesis') {
          result = runSynthesisPhase({
            findings: allFindings,
            breakdown: detailedBreakdown,
          })
        } else if (ctx.crawl) {
          result = await runPhaseForCrawl(key, ctx.crawl)
        } else if (ctx.code) {
          result = await runPhaseForCode(key, ctx.code)
        } else {
          result = skipped(
            key,
            PHASE_SCORE_MAX[key],
            'Pas de source disponible pour cet audit',
          )
        }
        await persistPhaseResult(auditId, result)
        breakdown[key] = result.score
        detailedBreakdown[key] = {
          score: result.score,
          scoreMax: result.scoreMax,
        }
        totalScore += result.score
        allFindings.push(...result.findings)
      } catch (phaseError) {
        console.error(`[audit ${auditId}] phase ${key} failed`, phaseError)
        await markPhaseFailed(auditId, key, phaseError)
      }
    }

    await completeAudit(auditId, totalScore, breakdown)
  } catch (error) {
    console.error(`[audit ${auditId}] fatal error`, error)
    await failAudit(auditId, error).catch(() => undefined)
  } finally {
    for (const path of cleanupPaths) {
      await cleanupRoot(path)
    }
  }
}
