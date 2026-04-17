/**
 * Database write helpers for the audit engine.
 * Kept separate from engine.ts so the engine stays pure (unit-testable without DB).
 */
import { eq, and, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { audits, auditPhases, findings } from '@/lib/db/schema'
import type { Finding, PhaseKey, PhaseResult } from './types'
import { PHASE_ORDER, PHASE_SCORE_MAX } from './engine'

/**
 * Atomic claim : transitionne `queued` → `running` exactement une fois.
 *
 * Ce UPDATE conditionnel garantit qu'un seul appelant gagne le claim, même
 * si plusieurs processus concurrents tentent de traiter le même audit (API
 * `after()` handler + worker poll). Le perdant reçoit `false` et doit
 * abandonner — le gagnant reçoit `true` et peut exécuter le pipeline.
 *
 * Pattern intentionnel : pas de FOR UPDATE / SKIP LOCKED car non supporté
 * par le HTTP driver Neon. Le UPDATE atomique sur la condition `status =
 * 'queued'` joue le même rôle pour notre charge (pas de session requise).
 */
export async function markAuditRunning(auditId: string): Promise<boolean> {
  const result = await db
    .update(audits)
    .set({
      status: 'running',
      startedAt: sql`COALESCE(${audits.startedAt}, now())`,
    })
    .where(and(eq(audits.id, auditId), eq(audits.status, 'queued')))
    .returning({ id: audits.id })
  return result.length > 0
}

export async function seedAuditPhases(
  auditId: string,
  phases: PhaseKey[] = PHASE_ORDER,
): Promise<void> {
  const rows = phases.map((key, index) => ({
    auditId,
    phaseKey: key,
    phaseOrder: index + 1,
    scoreMax: PHASE_SCORE_MAX[key],
    status: 'pending' as const,
  }))
  await db.insert(auditPhases).values(rows).onConflictDoNothing()
}

export async function markPhaseRunning(
  auditId: string,
  phaseKey: PhaseKey,
): Promise<void> {
  await db
    .update(auditPhases)
    .set({ status: 'running', startedAt: new Date() })
    .where(
      and(eq(auditPhases.auditId, auditId), eq(auditPhases.phaseKey, phaseKey)),
    )
}

export async function persistPhaseResult(
  auditId: string,
  result: PhaseResult,
): Promise<void> {
  await db
    .update(auditPhases)
    .set({
      status: result.status,
      score: result.score,
      summary: result.summary,
      finishedAt: new Date(),
    })
    .where(
      and(
        eq(auditPhases.auditId, auditId),
        eq(auditPhases.phaseKey, result.phaseKey),
      ),
    )

  if (result.findings.length > 0) {
    const rows = result.findings.map((f: Finding) => ({
      auditId,
      phaseKey: f.phaseKey,
      severity: f.severity,
      category: f.category ?? null,
      title: f.title,
      description: f.description,
      recommendation: f.recommendation,
      locationUrl: f.locationUrl ?? null,
      locationFile: f.locationFile ?? null,
      locationLine: f.locationLine ?? null,
      metricValue: f.metricValue ?? null,
      metricTarget: f.metricTarget ?? null,
      pointsLost: Math.round(f.pointsLost * 10) / 10,
      effort: f.effort ?? null,
    }))
    await db.insert(findings).values(rows)
  }
}

export async function markPhaseFailed(
  auditId: string,
  phaseKey: PhaseKey,
  error: unknown,
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error)
  await db
    .update(auditPhases)
    .set({
      status: 'failed',
      summary: `Phase en échec : ${message.slice(0, 200)}`,
      finishedAt: new Date(),
    })
    .where(
      and(eq(auditPhases.auditId, auditId), eq(auditPhases.phaseKey, phaseKey)),
    )
}

export async function completeAudit(
  auditId: string,
  totalScore: number,
  breakdown: Partial<Record<PhaseKey, number>>,
): Promise<void> {
  await db
    .update(audits)
    .set({
      status: 'completed',
      scoreTotal: Math.round(totalScore * 10) / 10,
      scoreBreakdown: breakdown,
      finishedAt: new Date(),
    })
    .where(eq(audits.id, auditId))
}

export async function failAudit(
  auditId: string,
  error: unknown,
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error)
  await db
    .update(audits)
    .set({
      status: 'failed',
      errorMessage: message.slice(0, 500),
      finishedAt: new Date(),
    })
    .where(eq(audits.id, auditId))
}
