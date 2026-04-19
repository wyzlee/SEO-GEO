/**
 * Notification d'alerte de dérive de score (score drift alert).
 *
 * Envoyé quand le score d'un audit planifié chute de plus de `alertThreshold`
 * points par rapport à l'audit précédent du même site.
 *
 * Philosophie identique à `notify-audit-completed.ts` :
 *  - Aucune exception ne remonte — un échec email ne doit pas bloquer le cron.
 *  - Retourne un booléen pour que le caller puisse décider de mettre à jour
 *    `lastAlertSentAt` uniquement si l'envoi a réussi.
 */
import { sendEmail } from './client'
import { scoreDriftEmail } from './templates'
import { logger } from '@/lib/observability/logger'

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://seo-geo-orcin.vercel.app'
}

export interface NotifyScoreDriftParams {
  email: string
  domain: string
  auditId: string
  previousScore: number
  currentScore: number
  drift: number
  phasesImpacted: Array<{
    phaseKey: string
    previousScore: number
    currentScore: number
    delta: number
  }>
}

/**
 * Envoie l'email d'alerte de dérive de score.
 *
 * @returns `true` si l'email a été envoyé avec succès, `false` sinon.
 *          Le caller doit mettre à jour `lastAlertSentAt` uniquement si `true`.
 */
export async function notifyScoreDrift(
  params: NotifyScoreDriftParams,
): Promise<boolean> {
  try {
    const base = appUrl()

    const { subject, html, text } = scoreDriftEmail({
      domain: params.domain,
      auditId: params.auditId,
      previousScore: params.previousScore,
      currentScore: params.currentScore,
      drift: params.drift,
      phasesImpacted: params.phasesImpacted,
      auditUrl: `${base}/dashboard/audits/${params.auditId}`,
      appUrl: base,
    })

    const result = await sendEmail({
      to: params.email,
      subject,
      html,
      text,
      tag: 'audit.score_drift',
    })

    if (result.sent) {
      logger.info('audit.drift.alert_sent', {
        audit_id: params.auditId,
        domain: params.domain,
        drift: params.drift,
        provider_id: result.providerId,
      })
      return true
    }

    logger.warn('audit.drift.alert_failed', {
      audit_id: params.auditId,
      domain: params.domain,
      reason: result.reason,
    })
    return false
  } catch (error) {
    logger.error('audit.drift.exception', {
      audit_id: params.auditId,
      domain: params.domain,
      error,
    })
    return false
  }
}
