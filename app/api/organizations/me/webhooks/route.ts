import { NextResponse } from 'next/server'
import { and, desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import crypto from 'node:crypto'
import { db } from '@/lib/db'
import { webhooks } from '@/lib/db/schema'
import { authenticateAuto, AuthError } from '@/lib/auth/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SUPPORTED_EVENTS = ['audit.completed'] as const

const createWebhookBody = z.object({
  url: z
    .string()
    .trim()
    .url()
    .max(500)
    .refine((v) => /^https?:\/\//i.test(v), {
      message: 'URL doit commencer par http:// ou https://',
    }),
  events: z
    .array(z.enum(SUPPORTED_EVENTS))
    .min(1)
    .optional(),
})

function genSecret(): string {
  return crypto.randomBytes(32).toString('base64url')
}

function requireOwnerOrAdmin(role: string): boolean {
  return role === 'owner' || role === 'admin'
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
    .select({
      id: webhooks.id,
      url: webhooks.url,
      events: webhooks.events,
      active: webhooks.active,
      lastSuccessAt: webhooks.lastSuccessAt,
      lastErrorAt: webhooks.lastErrorAt,
      lastErrorMessage: webhooks.lastErrorMessage,
      createdAt: webhooks.createdAt,
    })
    .from(webhooks)
    .where(eq(webhooks.organizationId, ctx.organizationId))
    .orderBy(desc(webhooks.createdAt))

  return NextResponse.json({ webhooks: rows })
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
  if (!requireOwnerOrAdmin(ctx.role)) {
    return NextResponse.json(
      { error: 'Forbidden: seul un owner/admin peut configurer un webhook' },
      { status: 403 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const parsed = createWebhookBody.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const secret = genSecret()
  const [inserted] = await db
    .insert(webhooks)
    .values({
      organizationId: ctx.organizationId,
      url: parsed.data.url,
      secret,
      events: (parsed.data.events ?? ['audit.completed']).join(','),
      active: 1,
    })
    .returning({ id: webhooks.id, url: webhooks.url, events: webhooks.events })

  // Le secret est renvoyé UNE SEULE FOIS à la création — pas ré-affiché
  // ensuite (pattern Stripe / GitHub). L'UI doit inciter à le copier.
  return NextResponse.json(
    {
      id: inserted.id,
      url: inserted.url,
      events: inserted.events,
      secret,
    },
    { status: 201 },
  )
}

export async function DELETE(request: Request) {
  let ctx
  try {
    ctx = await authenticateAuto(request)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    throw error
  }
  if (!requireOwnerOrAdmin(ctx.role)) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 },
    )
  }

  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'Missing ?id' }, { status: 400 })
  }

  const result = await db
    .delete(webhooks)
    .where(
      and(eq(webhooks.id, id), eq(webhooks.organizationId, ctx.organizationId)),
    )
    .returning({ id: webhooks.id })

  if (result.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json({ id: result[0].id, deleted: true })
}
