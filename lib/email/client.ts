/**
 * Client email transactionnel (Resend via HTTP — pas de SDK, pas de dép).
 *
 * Philosophie :
 *  - Pas de crash si `RESEND_API_KEY` absent : log.warn + early return.
 *    En dev sans DNS configuré, ça évite de casser le pipeline audit.
 *  - Pas de retry ici : la couche appelante décide si un échec doit bloquer.
 *    Un audit "completed" + email échoué ne doit PAS repasser en failed.
 *  - Pas de PII dans les logs (email user hashé sha256 first-8-chars).
 */
import { createHash } from 'node:crypto'
import { logger } from '@/lib/observability/logger'

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

export interface SendEmailInput {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
  tag?: string
}

export interface SendEmailResult {
  sent: boolean
  providerId?: string
  reason?: string
}

function hashEmail(email: string): string {
  return createHash('sha256').update(email).digest('hex').slice(0, 8)
}

export async function sendEmail(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM || 'SEO-GEO <no-reply@wyzlee.cloud>'
  const replyTo = input.replyTo || process.env.EMAIL_REPLY_TO

  const recipients = Array.isArray(input.to) ? input.to : [input.to]
  const recipientHashes = recipients.map(hashEmail)

  if (!apiKey) {
    logger.warn('email.skipped.no_api_key', {
      tag: input.tag,
      recipient_hashes: recipientHashes,
    })
    return { sent: false, reason: 'RESEND_API_KEY missing' }
  }

  const body: Record<string, unknown> = {
    from,
    to: recipients,
    subject: input.subject,
    html: input.html,
  }
  if (input.text) body.text = input.text
  if (replyTo) body.reply_to = replyTo

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      logger.error('email.send.failed', {
        tag: input.tag,
        status: res.status,
        recipient_hashes: recipientHashes,
        error: text.slice(0, 300),
      })
      return { sent: false, reason: `HTTP ${res.status}` }
    }
    const json = (await res.json().catch(() => ({}))) as { id?: string }
    logger.info('email.sent', {
      tag: input.tag,
      provider_id: json.id,
      recipient_hashes: recipientHashes,
    })
    return { sent: true, providerId: json.id }
  } catch (error) {
    logger.error('email.send.exception', {
      tag: input.tag,
      recipient_hashes: recipientHashes,
      error,
    })
    return { sent: false, reason: 'network error' }
  }
}
