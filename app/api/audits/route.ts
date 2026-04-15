import { NextResponse, after } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { audits } from '@/lib/db/schema'
import { authenticateAuto, AuthError } from '@/lib/auth/server'
import { processAudit } from '@/lib/audit/process'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const createAuditBody = z.object({
  targetUrl: z.string().url().max(2048),
  clientName: z.string().max(200).optional(),
  consultantName: z.string().max(200).optional(),
  mode: z.enum(['full', 'quick']).optional().default('full'),
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

  const inserted = await db
    .insert(audits)
    .values({
      organizationId: ctx.organizationId,
      createdBy: ctx.user.id,
      inputType: 'url',
      targetUrl: parsed.data.targetUrl,
      mode: parsed.data.mode,
      clientName: parsed.data.clientName ?? null,
      consultantName: parsed.data.consultantName ?? null,
      status: 'queued',
    })
    .returning({ id: audits.id })

  const auditId = inserted[0].id

  // Fire-and-forget: Next.js `after()` runs the callback after the response
  // is sent, keeping the process alive until it resolves. Replaces the worker
  // loop for the single-user dev flow; the worker will take over in prod.
  after(async () => {
    try {
      await processAudit(auditId)
    } catch (error) {
      console.error(`[audit ${auditId}] after() handler error`, error)
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
