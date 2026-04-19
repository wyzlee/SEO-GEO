import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { audits, auditPhases, scheduledAudits, users } from '@/lib/db/schema'
import { notifyScoreDrift } from '@/lib/email/notify-score-drift'
import { logger } from '@/lib/observability/logger'

export type Frequency = 'daily' | 'weekly' | 'monthly'

export function computeNextRunAt(frequency: Frequency, fromDate: Date): Date {
  const d = new Date(fromDate)
  if (frequency === 'daily') d.setDate(d.getDate() + 1)
  else if (frequency === 'weekly') d.setDate(d.getDate() + 7)
  else d.setMonth(d.getMonth() + 1)
  return d
}

/**
 * Vérifie si le score d'un audit planifié a suffisamment chuté pour
 * déclencher une alerte email.
 *
 * Règles :
 *  1. Pas d'alerte si c'est le premier audit (previousAuditId null).
 *  2. Pas d'alerte si l'audit précédent n'a pas de score valide.
 *  3. Pas d'alerte si alertThreshold ≤ 0 (désactivé).
 *  4. Alerte uniquement si drift ≤ -alertThreshold.
 *  5. Rate-limit : max 1 alerte par scheduled_audit par 24h (lastAlertSentAt).
 *  6. `lastAlertSentAt` n'est mis à jour que si l'email est bien envoyé.
 *  7. Toutes les queries portent un filtre `organizationId` (multi-tenant).
 */
export async function checkScheduledAuditDrift({
  auditId,
  scheduledId,
  organizationId,
}: {
  auditId: string
  scheduledId: string
  organizationId: string
}): Promise<void> {
  try {
    // --- Charger le scheduled audit (alertThreshold, lastAlertSentAt, createdBy)
    const [scheduled] = await db
      .select({
        id: scheduledAudits.id,
        alertThreshold: scheduledAudits.alertThreshold,
        lastAlertSentAt: scheduledAudits.lastAlertSentAt,
        createdBy: scheduledAudits.createdBy,
        organizationId: scheduledAudits.organizationId,
      })
      .from(scheduledAudits)
      .where(
        and(
          eq(scheduledAudits.id, scheduledId),
          eq(scheduledAudits.organizationId, organizationId),
        ),
      )
      .limit(1)

    if (!scheduled) {
      logger.warn('audit.drift.skipped', {
        audit_id: auditId,
        scheduled_id: scheduledId,
        reason: 'scheduled_not_found',
      })
      return
    }

    // Désactivé si seuil ≤ 0
    if (scheduled.alertThreshold <= 0) {
      logger.info('audit.drift.skipped', {
        audit_id: auditId,
        scheduled_id: scheduledId,
        reason: 'threshold_disabled',
      })
      return
    }

    // --- Charger l'audit courant (score, previousAuditId, targetUrl)
    const [currentAudit] = await db
      .select({
        id: audits.id,
        scoreTotal: audits.scoreTotal,
        previousAuditId: audits.previousAuditId,
        targetUrl: audits.targetUrl,
        organizationId: audits.organizationId,
      })
      .from(audits)
      .where(
        and(
          eq(audits.id, auditId),
          eq(audits.organizationId, organizationId),
        ),
      )
      .limit(1)

    if (!currentAudit) {
      logger.warn('audit.drift.skipped', {
        audit_id: auditId,
        scheduled_id: scheduledId,
        reason: 'audit_not_found',
      })
      return
    }

    // Pas d'alerte sur le premier audit (pas de précédent à comparer)
    if (!currentAudit.previousAuditId) {
      logger.info('audit.drift.skipped', {
        audit_id: auditId,
        scheduled_id: scheduledId,
        reason: 'no_previous_audit',
      })
      return
    }

    if (currentAudit.scoreTotal == null) {
      logger.info('audit.drift.skipped', {
        audit_id: auditId,
        scheduled_id: scheduledId,
        reason: 'current_score_null',
      })
      return
    }

    // --- Charger l'audit précédent (score uniquement)
    const [previousAudit] = await db
      .select({
        id: audits.id,
        scoreTotal: audits.scoreTotal,
      })
      .from(audits)
      .where(
        and(
          eq(audits.id, currentAudit.previousAuditId),
          eq(audits.organizationId, organizationId),
        ),
      )
      .limit(1)

    if (!previousAudit || previousAudit.scoreTotal == null) {
      logger.info('audit.drift.skipped', {
        audit_id: auditId,
        scheduled_id: scheduledId,
        reason: 'previous_score_unavailable',
      })
      return
    }

    // --- Calcul du drift (arrondi 0.1 comme dans compare.ts)
    const round1 = (n: number) => Math.round(n * 10) / 10
    const currentScore = round1(currentAudit.scoreTotal)
    const previousScore = round1(previousAudit.scoreTotal)
    const drift = round1(currentScore - previousScore)

    logger.info('audit.drift.checked', {
      audit_id: auditId,
      scheduled_id: scheduledId,
      current_score: currentScore,
      previous_score: previousScore,
      drift,
      threshold: scheduled.alertThreshold,
    })

    // Alerte uniquement si drift ≤ -threshold
    if (drift > -scheduled.alertThreshold) {
      return
    }

    // --- Rate-limit : max 1 alerte par 24h
    if (scheduled.lastAlertSentAt) {
      const hoursElapsed =
        (Date.now() - new Date(scheduled.lastAlertSentAt).getTime()) /
        (1000 * 60 * 60)
      if (hoursElapsed < 24) {
        logger.info('audit.drift.skipped', {
          audit_id: auditId,
          scheduled_id: scheduledId,
          reason: 'rate_limited_24h',
          hours_since_last: Math.round(hoursElapsed * 10) / 10,
        })
        return
      }
    }

    // --- Phases impactées : charger les deux audits en une seule query
    const phaseRows = await db
      .select({
        auditId: auditPhases.auditId,
        phaseKey: auditPhases.phaseKey,
        score: auditPhases.score,
      })
      .from(auditPhases)
      .where(
        inArray(auditPhases.auditId, [auditId, currentAudit.previousAuditId]),
      )

    // Construire les maps par auditId → phaseKey → score
    const currentPhaseMap = new Map<string, number>()
    const previousPhaseMap = new Map<string, number>()
    for (const row of phaseRows) {
      if (row.score == null) continue
      if (row.auditId === auditId) {
        currentPhaseMap.set(row.phaseKey, row.score)
      } else {
        previousPhaseMap.set(row.phaseKey, row.score)
      }
    }

    // Calculer les deltas par phase (hors synthesis)
    const phasesImpacted: Array<{
      phaseKey: string
      previousScore: number
      currentScore: number
      delta: number
    }> = []

    for (const [phaseKey, currPhaseScore] of currentPhaseMap) {
      if (phaseKey === 'synthesis') continue
      const prevPhaseScore = previousPhaseMap.get(phaseKey)
      if (prevPhaseScore == null) continue
      const delta = round1(currPhaseScore - prevPhaseScore)
      if (delta < 0) {
        phasesImpacted.push({
          phaseKey,
          previousScore: round1(prevPhaseScore),
          currentScore: round1(currPhaseScore),
          delta,
        })
      }
    }

    // Trier par delta croissant (plus forte chute en premier)
    phasesImpacted.sort((a, b) => a.delta - b.delta)

    // --- Récupérer l'email du créateur du scheduled audit
    const [userRow] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, scheduled.createdBy))
      .limit(1)

    if (!userRow?.email) {
      logger.warn('audit.drift.skipped', {
        audit_id: auditId,
        scheduled_id: scheduledId,
        reason: 'recipient_email_missing',
      })
      return
    }

    // --- Domaine pour le sujet de l'email
    let domain = currentAudit.targetUrl ?? ''
    try {
      if (currentAudit.targetUrl) {
        domain = new URL(currentAudit.targetUrl).hostname
      }
    } catch {
      // fallback sur l'URL brute si parsing échoue
    }

    // --- Envoi de l'alerte
    const sent = await notifyScoreDrift({
      email: userRow.email,
      domain,
      auditId,
      previousScore,
      currentScore,
      drift,
      phasesImpacted,
    })

    // Mettre à jour lastAlertSentAt uniquement si l'email a été envoyé
    if (sent) {
      const now = new Date()
      await db
        .update(scheduledAudits)
        .set({ lastAlertSentAt: now, updatedAt: now })
        .where(
          and(
            eq(scheduledAudits.id, scheduledId),
            eq(scheduledAudits.organizationId, organizationId),
          ),
        )
    }
  } catch (error) {
    logger.error('audit.drift.exception', {
      audit_id: auditId,
      scheduled_id: scheduledId,
      error,
    })
  }
}
