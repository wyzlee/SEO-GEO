import { NextResponse, after } from 'next/server'
import { and, count, desc, eq, gte, ne } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { audits, organizations } from '@/lib/db/schema'
import { authenticateAuto, AuthError } from '@/lib/auth/server'
import { processAudit } from '@/lib/audit/process'
import { assertSafeUrl, UnsafeUrlError } from '@/lib/security/url-guard'
import { rateLimit } from '@/lib/security/rate-limit'
import { logger } from '@/lib/observability/logger'
import { PLANS } from '@/lib/billing/stripe'

/**
 * Trouve le dernier audit `completed` de la même org + même cible (targetUrl
 * ou githubRepo) pour auto-lier le nouvel audit en tant que successeur.
 * Retourne null si aucun antérieur — l'audit créé sera `previousAuditId = null`.
 */
async function findPreviousAudit(
  organizationId: string,
  targetUrl: string | null,
  githubRepo: string | null,
): Promise<string | null> {
  if (!targetUrl && !githubRepo) return null
  const conditions = [
    eq(audits.organizationId, organizationId),
    eq(audits.status, 'completed'),
  ]
  if (targetUrl) conditions.push(eq(audits.targetUrl, targetUrl))
  else if (githubRepo) conditions.push(eq(audits.githubRepo, githubRepo))

  const rows = await db
    .select({ id: audits.id })
    .from(audits)
    .where(and(...conditions))
    .orderBy(desc(audits.finishedAt))
    .limit(1)
  return rows[0]?.id ?? null
}

const BURST_LIMIT = { name: 'audits.post.burst', max: 3, windowMs: 60_000 }
const DAILY_LIMIT = { name: 'audits.post.daily', max: 50, windowMs: 86_400_000 }

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 800

const createAuditBody = z
  .object({
    targetUrl: z.string().url().max(2048).optional(),
    uploadPath: z.string().max(400).optional(),
    githubRepo: z
      .string()
      .max(400)
      .regex(
        /^([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:@[\w./-]+)?|https?:\/\/github\.com\/[^\s]+)$/,
      )
      .optional(),
    clientName: z.string().max(200).optional(),
    consultantName: z.string().max(200).optional(),
    mode: z.enum(['full', 'standard']).optional().default('full'),
  })
  .refine((data) => !!(data.targetUrl || data.uploadPath || data.githubRepo), {
    message: 'Renseigner targetUrl OU uploadPath OU githubRepo',
  })

export async function POST(request: Request) {
  let ctx
  try {
    ctx = await authenticateAuto(request)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    throw error
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = createAuditBody.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  if (parsed.data.targetUrl) {
    try {
      assertSafeUrl(parsed.data.targetUrl)
    } catch (error) {
      if (error instanceof UnsafeUrlError) {
        return NextResponse.json(
          { error: error.message, reason: error.reason },
          { status: 400 },
        )
      }
      throw error
    }
  }

  // Plan gating : récupérer l'org pour quota + mode
  const orgRow = await db
    .select({ plan: organizations.plan, id: organizations.id })
    .from(organizations)
    .where(eq(organizations.id, ctx.organizationId))
    .limit(1)
  const org = orgRow[0]
  const planId = (org?.plan ?? 'discovery') as keyof typeof PLANS
  const planConfig = PLANS[planId] ?? PLANS.discovery

  // Vérification du quota mensuel
  if (planConfig.auditLimit !== -1) {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    // On exclut les audits failed : un audit crashé ne consomme pas de quota.
    const [usageRow] = await db
      .select({ total: count() })
      .from(audits)
      .where(
        and(
          eq(audits.organizationId, ctx.organizationId),
          gte(audits.createdAt, startOfMonth),
          ne(audits.status, 'failed'),
        ),
      )

    const usedThisMonth = usageRow?.total ?? 0
    if (usedThisMonth >= planConfig.auditLimit) {
      return NextResponse.json(
        {
          error: `Limite du plan ${planId} atteinte (${planConfig.auditLimit} audit(s)/mois). Passez au plan supérieur.`,
        },
        { status: 402 },
      )
    }
  }

  // Mode full uniquement pour studio et agency
  const requestedMode = parsed.data.mode
  const resolvedMode =
    planId === 'studio' || planId === 'agency' ? requestedMode : 'standard'

  const userBurst = rateLimit(BURST_LIMIT, `u:${ctx.user.id}`)
  if (!userBurst.allowed) {
    return NextResponse.json(
      {
        error: 'Trop de requêtes. Réessayez dans un instant.',
        retryAfterSeconds: userBurst.retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(userBurst.retryAfterSeconds),
        },
      },
    )
  }
  const orgDaily = rateLimit(DAILY_LIMIT, `o:${ctx.organizationId}`)
  if (!orgDaily.allowed) {
    return NextResponse.json(
      {
        error:
          'Quota quotidien atteint pour cette organisation. Contactez votre admin.',
        retryAfterSeconds: orgDaily.retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(orgDaily.retryAfterSeconds),
        },
      },
    )
  }

  const inputType: 'url' | 'zip' | 'github' = parsed.data.githubRepo
    ? 'github'
    : parsed.data.uploadPath
      ? 'zip'
      : 'url'

  const previousAuditId = await findPreviousAudit(
    ctx.organizationId,
    parsed.data.targetUrl ?? null,
    parsed.data.githubRepo ?? null,
  )

  const inserted = await db
    .insert(audits)
    .values({
      organizationId: ctx.organizationId,
      createdBy: ctx.user.id,
      inputType,
      targetUrl: parsed.data.targetUrl ?? null,
      githubRepo: parsed.data.githubRepo ?? null,
      uploadPath: parsed.data.uploadPath ?? null,
      mode: resolvedMode,
      clientName: parsed.data.clientName ?? null,
      consultantName: parsed.data.consultantName ?? null,
      status: 'queued',
      previousAuditId,
    })
    .returning({ id: audits.id })

  const auditId = inserted[0].id

  after(async () => {
    try {
      await processAudit(auditId)
    } catch (error) {
      logger.error('audit.after_handler.error', { audit_id: auditId, error })
    }
  })

  return NextResponse.json({ id: auditId, status: 'queued' }, { status: 202 })
}

export async function GET(request: Request) {
  let ctx
  try {
    ctx = await authenticateAuto(request)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    throw error
  }

  const rows = await db
    .select()
    .from(audits)
    .where(eq(audits.organizationId, ctx.organizationId))
    .orderBy(desc(audits.createdAt))
    .limit(100)

  return NextResponse.json({ audits: rows })
}
