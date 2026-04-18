/**
 * Notification post-audit : charge l'audit + l'utilisateur qui l'a créé +
 * le branding de l'organisation, et envoie un email transactionnel via
 * `sendEmail`. Aucune exception ne remonte : un échec email ne doit PAS
 * repasser l'audit en `failed`.
 */
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { audits, users, organizations } from '@/lib/db/schema'
import { sendEmail } from './client'
import { auditCompletedEmail } from './templates'
import {
  brandingFromRecord,
  type StoredBranding,
} from '@/lib/organizations/branding'
import { logger } from '@/lib/observability/logger'

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://seo-geo-orcin.vercel.app'
}

export async function notifyAuditCompleted(auditId: string): Promise<void> {
  try {
    const [row] = await db
      .select({
        auditId: audits.id,
        targetUrl: audits.targetUrl,
        clientName: audits.clientName,
        scoreTotal: audits.scoreTotal,
        createdBy: audits.createdBy,
        organizationId: audits.organizationId,
        userEmail: users.email,
        userDisplayName: users.displayName,
        orgBranding: organizations.branding,
        orgCustomEmailFromName: organizations.customEmailFromName,
      })
      .from(audits)
      .innerJoin(users, eq(users.id, audits.createdBy))
      .innerJoin(organizations, eq(organizations.id, audits.organizationId))
      .where(eq(audits.id, auditId))
      .limit(1)

    if (!row || !row.userEmail) {
      logger.warn('audit.notify.missing_recipient', { audit_id: auditId })
      return
    }

    const branding = brandingFromRecord(
      row.orgBranding as StoredBranding | null,
    )
    const base = appUrl()

    const { subject, html, text } = auditCompletedEmail({
      recipientName: row.userDisplayName,
      auditId: row.auditId,
      clientName: row.clientName,
      targetUrl: row.targetUrl,
      scoreTotal: row.scoreTotal ?? 0,
      auditUrl: `${base}/dashboard/audits/${row.auditId}`,
      shareUrl: null, // pas encore de rapport share au moment de completeAudit
      companyName: branding?.companyName ?? null,
      appUrl: base,
    })

    const from = row.orgCustomEmailFromName
      ? `${row.orgCustomEmailFromName} <notifications@wyzlee.cloud>`
      : undefined

    await sendEmail({
      to: row.userEmail,
      subject,
      html,
      text,
      tag: 'audit.completed',
      ...(from ? { from } : {}),
    })
  } catch (error) {
    logger.error('audit.notify.exception', { audit_id: auditId, error })
  }
}
