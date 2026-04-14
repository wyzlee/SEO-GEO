import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function verifySignature(payload: string, signature: string | null) {
  const secret = process.env.STACK_WEBHOOK_SECRET
  if (!secret || !signature) return false
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected),
    )
  } catch {
    return false
  }
}

interface WebhookEvent {
  type: string
  data?: {
    id?: string
    primaryEmail?: string
    displayName?: string | null
    profileImageUrl?: string | null
  }
}

export async function POST(request: Request) {
  const raw = await request.text()
  const sig =
    request.headers.get('x-stack-signature') ||
    request.headers.get('x-webhook-signature')

  if (!verifySignature(raw, sig)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  }

  let event: WebhookEvent
  try {
    event = JSON.parse(raw) as WebhookEvent
  } catch {
    return NextResponse.json({ error: 'invalid payload' }, { status: 400 })
  }

  const { type, data } = event
  if (!data?.id || !data.primaryEmail) {
    return NextResponse.json({ ok: true })
  }

  if (type === 'user.created' || type === 'user.updated') {
    const now = new Date()
    await db
      .insert(users)
      .values({
        id: data.id,
        email: data.primaryEmail,
        displayName: data.displayName ?? null,
        avatarUrl: data.profileImageUrl ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: data.primaryEmail,
          displayName: data.displayName ?? null,
          avatarUrl: data.profileImageUrl ?? null,
          updatedAt: now,
        },
      })
  }

  if (type === 'user.deleted') {
    await db.delete(users).where(eq(users.id, data.id))
  }

  return NextResponse.json({ ok: true })
}
