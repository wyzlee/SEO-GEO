/**
 * Full audit pipeline : resolveInput (crawl URL / extract zip / clone github)
 * → 11 phases → persist at each step.
 */
import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { audits, auditPhases, findings } from '@/lib/db/schema'
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
import { PHASE_SCORE_MAX } from './engine'
import { resolveModeConfig } from './modes'
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
import { logger } from '@/lib/observability/logger'
import { notifyAuditCompleted } from '@/lib/email/notify-audit-completed'
import { dispatchWebhookEvent } from '@/lib/webhooks/dispatch'

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

async function resolveInput(
  audit: {
    inputType: string
    targetUrl: string | null
    uploadPath: string | null
    githubRepo: string | null
  },
  opts?: { maxSubPages?: number; timeoutMs?: number },
): Promise<PipelineContext> {
  const ctx: PipelineContext = { cleanupPaths: [] }

  if (audit.inputType === 'url' && audit.targetUrl) {
    ctx.crawl = await crawlUrl(audit.targetUrl, {
      maxSubPages: opts?.maxSubPages,
      timeoutMs: opts?.timeoutMs,
    })
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

class AuditTimeoutError extends Error {
  constructor(auditId: string, ms: number) {
    super(`Audit ${auditId} dépassé le timeout (${ms} ms)`)
    this.name = 'AuditTimeoutError'
  }
}

export async function processAudit(auditId: string): Promise<void> {
  // Read mode from DB to pick the right pipeline timeout.
  const modeRow = await db
    .select({ mode: audits.mode })
    .from(audits)
    .where(eq(audits.id, auditId))
    .limit(1)
  const mode = modeRow[0]?.mode ?? null
  const cfg = resolveModeConfig(mode)
  const timeoutMs = cfg.timeoutMs

  let timeoutHandle: ReturnType<typeof setTimeout> | null = null
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(
      () => reject(new AuditTimeoutError(auditId, timeoutMs)),
      timeoutMs,
    )
  })
  try {
    await Promise.race([runProcessAudit(auditId), timeoutPromise])
  } catch (error) {
    if (error instanceof AuditTimeoutError) {
      logger.error('audit.timeout', {
        audit_id: auditId,
        timeout_ms: timeoutMs,
        error,
      })
      await failAudit(auditId, error).catch(() => undefined)
      return
    }
    throw error
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle)
  }
}

async function runProcessAudit(auditId: string): Promise<void> {
  let cleanupPaths: string[] = []
  try {
    const rows = await db
      .select()
      .from(audits)
      .where(eq(audits.id, auditId))
      .limit(1)
    const audit = rows[0]
    if (!audit) throw new Error(`Audit ${auditId} introuvable`)

    const cfg = resolveModeConfig(audit.mode)

    const claimed = await markAuditRunning(auditId)
    if (!claimed) {
      // Another worker or handler already running this audit — skip.
      logger.info('audit.already_claimed', { audit_id: auditId })
      return
    }
    await seedAuditPhases(auditId, cfg.phases)

    // Checkpoint-resume : charger les phases déjà completées (cas requeue après timeout).
    // seedAuditPhases utilise onConflictDoNothing, donc les rows existantes sont préservées.
    const existingRows = await db
      .select({
        phaseKey: auditPhases.phaseKey,
        status: auditPhases.status,
        score: auditPhases.score,
        scoreMax: auditPhases.scoreMax,
      })
      .from(auditPhases)
      .where(eq(auditPhases.auditId, auditId))
    const completedPhaseKeys = existingRows
      .filter((r) => r.status === 'completed')
      .map((r) => r.phaseKey as PhaseKey)
    const completedSet = new Set(completedPhaseKeys)

    const ctx = await resolveInput(
      {
        inputType: audit.inputType,
        targetUrl: audit.targetUrl,
        uploadPath: audit.uploadPath,
        githubRepo: audit.githubRepo,
      },
      { maxSubPages: cfg.maxSubPages },
    )
    cleanupPaths = ctx.cleanupPaths

    const breakdown: Partial<Record<PhaseKey, number>> = {}
    const detailedBreakdown: Partial<
      Record<PhaseKey, { score: number; scoreMax: number }>
    > = {}
    const allFindings: Finding[] = []
    let effectiveScore = 0
    let effectiveScoreMax = 0

    // Pré-charger findings + scores des phases déjà complétées pour la synthèse.
    if (completedPhaseKeys.length > 0) {
      const prevFindings = await db
        .select()
        .from(findings)
        .where(
          and(
            eq(findings.auditId, auditId),
            inArray(findings.phaseKey, completedPhaseKeys),
          ),
        )
      allFindings.push(...(prevFindings as Finding[]))

      for (const row of existingRows.filter((r) => completedSet.has(r.phaseKey as PhaseKey))) {
        const key = row.phaseKey as PhaseKey
        if (row.score != null && row.scoreMax != null && row.scoreMax > 0) {
          breakdown[key] = row.score
          detailedBreakdown[key] = { score: row.score, scoreMax: row.scoreMax }
          effectiveScore += row.score
          effectiveScoreMax += row.scoreMax
        }
      }
    }

    for (const key of cfg.phases) {
      if (completedSet.has(key)) continue // checkpoint : phase déjà terminée
      try {
        await markPhaseRunning(auditId, key)
        let result: PhaseResult
        if (key === 'synthesis') {
          result = await runSynthesisPhase({
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
        // Only count phases that actually ran — skipped phases (code mode
        // gaps, not-applicable) don't penalize the final score and shouldn't
        // feed the synthesis fundamentals check either.
        if (result.status !== 'skipped') {
          detailedBreakdown[key] = {
            score: result.score,
            scoreMax: result.scoreMax,
          }
          effectiveScore += result.score
          effectiveScoreMax += result.scoreMax
        }
        allFindings.push(...result.findings)
      } catch (phaseError) {
        logger.error('audit.phase.failed', {
          audit_id: auditId,
          phase: key,
          error: phaseError,
        })
        await markPhaseFailed(auditId, key, phaseError)
      }
    }

    // Normalize to /100 based on phases that actually ran.
    const totalScore =
      effectiveScoreMax > 0
        ? (effectiveScore / effectiveScoreMax) * 100
        : 0

    await completeAudit(auditId, totalScore, breakdown)

    // Best-effort : notifier l'utilisateur via email. N'interrompt jamais le
    // pipeline — toutes les erreurs sont catchées dans notifyAuditCompleted.
    await notifyAuditCompleted(auditId)

    // Dispatch aux webhooks sortants actifs de l'org (intégration CRM / n8n
    // / Slack). Best-effort également — erreurs catchées dans dispatch.
    try {
      const [row] = await db
        .select({
          id: audits.id,
          organizationId: audits.organizationId,
          targetUrl: audits.targetUrl,
          clientName: audits.clientName,
          scoreTotal: audits.scoreTotal,
          finishedAt: audits.finishedAt,
        })
        .from(audits)
        .where(eq(audits.id, auditId))
        .limit(1)
      if (row) {
        await dispatchWebhookEvent({
          event: 'audit.completed',
          audit: {
            id: row.id,
            organizationId: row.organizationId,
            targetUrl: row.targetUrl,
            clientName: row.clientName,
            scoreTotal: row.scoreTotal,
            finishedAt: row.finishedAt?.toISOString() ?? null,
            shareUrl: null,
          },
          emittedAt: new Date().toISOString(),
        })
      }
    } catch (error) {
      logger.warn('audit.webhooks.dispatch_failed', {
        audit_id: auditId,
        error,
      })
    }
  } catch (error) {
    logger.error('audit.fatal', { audit_id: auditId, error })
    await failAudit(auditId, error).catch(() => undefined)
  } finally {
    for (const path of cleanupPaths) {
      await cleanupRoot(path)
    }
  }
}
