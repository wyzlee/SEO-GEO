/**
 * Dispatch de webhooks sortants (event `audit.completed` et cousins).
 *
 * Signature : chaque requête porte un header `X-SEOGEO-Signature` au format
 *   `sha256=<hex>` où <hex> = HMAC-SHA256(secret, body) bas niveau.
 *   Le receiver re-signe et compare en temps constant pour valider.
 *
 * Retry : 3 tentatives avec back-off exponentiel (2s, 4s, 8s). En V1 on fait
 *   les retries in-process — si le process meurt entre deux tentatives, le
 *   webhook est perdu. V2 : table `webhook_deliveries` + job queue persistante.
 *
 * Pas de PII dans les logs : on hash l'URL du receiver (host), pas l'URL
 * complète.
 */
import { createHash, createHmac } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { webhooks } from '@/lib/db/schema'
import { logger } from '@/lib/observability/logger'

export interface WebhookEventPayload {
  event: 'audit.completed' | 'audit.failed'
  audit: {
    id: string
    organizationId: string
    targetUrl: string | null
    clientName: string | null
    scoreTotal: number | null
    finishedAt: string | null
    shareUrl: string | null
  }
  // Timestamp d'émission côté app (ISO8601). Permet au receiver de rejeter
  // les replays anciens (> X minutes).
  emittedAt: string
}

const MAX_ATTEMPTS = 3
const BASE_BACKOFF_MS = 2_000
const REQUEST_TIMEOUT_MS = 10_000

function signBody(secret: string, body: string): string {
  const mac = createHmac('sha256', secret).update(body).digest('hex')
  return `sha256=${mac}`
}

function hashHost(url: string): string {
  try {
    const host = new URL(url).host
    return createHash('sha256').update(host).digest('hex').slice(0, 12)
  } catch {
    return 'invalid-url'
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

interface DeliveryResult {
  ok: boolean
  status?: number
  error?: string
}

async function deliverOnce(
  url: string,
  secret: string,
  body: string,
  attempt: number,
  eventId: string,
): Promise<DeliveryResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'user-agent': 'SEO-GEO-Webhooks/1 (+https://seo-geo.wyzlee.cloud)',
        'x-seogeo-signature': signBody(secret, body),
        'x-seogeo-event-id': eventId,
        'x-seogeo-attempt': String(attempt),
      },
      body,
      signal: controller.signal,
    })
    return res.ok
      ? { ok: true, status: res.status }
      : { ok: false, status: res.status, error: `HTTP ${res.status}` }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown'
    return { ok: false, error: message }
  } finally {
    clearTimeout(timer)
  }
}

function newEventId(): string {
  // UUIDv4 suffit côté receiver pour dédoublonner.
  return crypto.randomUUID()
}

/**
 * Envoie une copie du payload à chaque webhook actif d'une organisation
 * qui a souscrit à l'événement. Best-effort, sans blocage : appelée dans
 * un context `void` depuis `processAudit` (pas d'await qui remonte).
 */
export async function dispatchWebhookEvent(
  payload: WebhookEventPayload,
): Promise<void> {
  const rows = await db
    .select()
    .from(webhooks)
    .where(
      and(
        eq(webhooks.organizationId, payload.audit.organizationId),
        eq(webhooks.active, 1),
      ),
    )

  if (rows.length === 0) return

  const body = JSON.stringify(payload)
  const eventId = newEventId()

  await Promise.all(
    rows
      .filter((w) => w.events.split(',').map((e) => e.trim()).includes(payload.event))
      .map(async (hook) => {
        let lastError: string | undefined
        let delivered = false
        let lastStatus: number | undefined

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          const result = await deliverOnce(
            hook.url,
            hook.secret,
            body,
            attempt,
            eventId,
          )
          if (result.ok) {
            delivered = true
            lastStatus = result.status
            break
          }
          lastError = result.error
          lastStatus = result.status
          if (attempt < MAX_ATTEMPTS) {
            await sleep(BASE_BACKOFF_MS * 2 ** (attempt - 1))
          }
        }

        const now = new Date()
        if (delivered) {
          logger.info('webhook.delivered', {
            webhook_id: hook.id,
            org_id: hook.organizationId,
            host_hash: hashHost(hook.url),
            event: payload.event,
            event_id: eventId,
            status: lastStatus,
          })
          await db
            .update(webhooks)
            .set({ lastSuccessAt: now, lastErrorAt: null, lastErrorMessage: null, updatedAt: now })
            .where(eq(webhooks.id, hook.id))
        } else {
          logger.warn('webhook.failed', {
            webhook_id: hook.id,
            org_id: hook.organizationId,
            host_hash: hashHost(hook.url),
            event: payload.event,
            event_id: eventId,
            attempts: MAX_ATTEMPTS,
            last_status: lastStatus,
            last_error: lastError,
          })
          await db
            .update(webhooks)
            .set({
              lastErrorAt: now,
              lastErrorMessage: (lastError ?? 'unknown').slice(0, 300),
              updatedAt: now,
            })
            .where(eq(webhooks.id, hook.id))
        }
      }),
  )
}

// ----- Utilitaires exposés pour les tests -----
export const __internal = {
  signBody,
  newEventId,
  hashHost,
}
