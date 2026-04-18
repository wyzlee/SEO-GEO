import { NextResponse } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { scheduledAudits } from '@/lib/db/schema'
import { authenticateAuto, AuthError } from '@/lib/auth/server'
import { assertSafeUrl, UnsafeUrlError } from '@/lib/security/url-guard'
import { computeNextRunAt } from '@/lib/audit/schedule'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const createScheduledAuditBody = z.object({
  targetUrl: z.string().url().max(2048),
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  mode: z.enum(['standard', 'full']).default('standard'),
})

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
    .from(scheduledAudits)
    .where(eq(scheduledAudits.organizationId, ctx.organizationId))
    .orderBy(desc(scheduledAudits.createdAt))

  return NextResponse.json({ scheduledAudits: rows })
}

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

  const parsed = createScheduledAuditBody.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.issues },
      { status: 400 },
    )
  }

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

  const nextRunAt = computeNextRunAt(parsed.data.frequency, new Date())

  const [scheduledAudit] = await db
    .insert(scheduledAudits)
    .values({
      organizationId: ctx.organizationId,
      createdBy: ctx.user.id,
      targetUrl: parsed.data.targetUrl,
      mode: parsed.data.mode,
      frequency: parsed.data.frequency,
      nextRunAt,
    })
    .returning()

  return NextResponse.json({ scheduledAudit }, { status: 201 })
}
