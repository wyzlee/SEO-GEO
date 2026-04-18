import { NextResponse } from 'next/server'
import { and, eq, gt, isNull, count } from 'drizzle-orm'
import { z } from 'zod'
import crypto from 'node:crypto'
import { db } from '@/lib/db'
import { invitations, memberships, organizations, users } from '@/lib/db/schema'
import { authenticateAuto, AuthError } from '@/lib/auth/server'
import { sendEmail } from '@/lib/email/client'
import { logger } from '@/lib/observability/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const INVITE_TTL_DAYS = 7
const MAX_PENDING_INVITATIONS = 20

const inviteBodySchema = z.object({
  email: z.string().email().max(254),
  role: z.enum(['member', 'admin']).default('member'),
})

function requireOwnerOrAdmin(role: string): boolean {
  return role === 'owner' || role === 'admin'
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
      { error: 'Forbidden: seul un owner ou admin peut inviter des membres' },
      { status: 403 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = inviteBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const email = parsed.data.email.toLowerCase().trim()
  const role = parsed.data.role
  const now = new Date()

  // Vérifier que l'email n'est pas déjà membre de l'org
  const existingMember = await db
    .select({ id: memberships.id })
    .from(memberships)
    .innerJoin(users, eq(memberships.userId, users.id))
    .where(
      and(
        eq(memberships.organizationId, ctx.organizationId),
        eq(users.email, email),
      ),
    )
    .limit(1)

  if (existingMember.length > 0) {
    return NextResponse.json(
      { error: "Cet email est déjà membre de l'organisation" },
      { status: 409 },
    )
  }

  // Vérifier qu'il n'existe pas d'invitation pending pour cet email
  const existingInvite = await db
    .select({ id: invitations.id })
    .from(invitations)
    .where(
      and(
        eq(invitations.organizationId, ctx.organizationId),
        eq(invitations.email, email),
        isNull(invitations.acceptedAt),
        gt(invitations.expiresAt, now),
      ),
    )
    .limit(1)

  if (existingInvite.length > 0) {
    return NextResponse.json(
      { error: 'Une invitation en attente existe déjà pour cet email' },
      { status: 409 },
    )
  }

  // Quota : max 20 invitations pending par org
  const [{ value: pendingCount }] = await db
    .select({ value: count() })
    .from(invitations)
    .where(
      and(
        eq(invitations.organizationId, ctx.organizationId),
        isNull(invitations.acceptedAt),
        gt(invitations.expiresAt, now),
      ),
    )

  if (pendingCount >= MAX_PENDING_INVITATIONS) {
    return NextResponse.json(
      { error: `Quota d'invitations atteint (max ${MAX_PENDING_INVITATIONS} en attente)` },
      { status: 429 },
    )
  }

  // Charger l'org et l'invitant pour l'email
  const [org] = await db
    .select({ name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, ctx.organizationId))
    .limit(1)

  const [inviter] = await db
    .select({ displayName: users.displayName, email: users.email })
    .from(users)
    .where(eq(users.id, ctx.user.id))
    .limit(1)

  const inviterName = inviter?.displayName || inviter?.email || 'Un administrateur'
  const orgName = org?.name || 'votre organisation'

  const token = crypto.randomBytes(32).toString('base64url')
  const expiresAt = new Date(now.getTime() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000)

  const [invitation] = await db
    .insert(invitations)
    .values({
      organizationId: ctx.organizationId,
      invitedBy: ctx.user.id,
      email,
      role,
      token,
      expiresAt,
    })
    .returning({
      id: invitations.id,
      email: invitations.email,
      role: invitations.role,
      expiresAt: invitations.expiresAt,
    })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${process.env.NEXT_PUBLIC_APP_HOST}`
  const acceptUrl = `${appUrl}/invite/accept?token=${token}`

  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
  <h2 style="color:#4F46E5">Invitation à rejoindre ${orgName}</h2>
  <p>Bonjour,</p>
  <p><strong>${inviterName}</strong> vous invite à rejoindre <strong>${orgName}</strong> sur SEO-GEO en tant que <strong>${role}</strong>.</p>
  <p style="margin:32px 0">
    <a href="${acceptUrl}" style="background:#4F46E5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">
      Accepter l'invitation
    </a>
  </p>
  <p style="color:#666;font-size:14px">Ce lien est valable 7 jours. Si vous n'attendiez pas cette invitation, vous pouvez ignorer cet email.</p>
</body>
</html>`

  const text = [
    `Invitation à rejoindre ${orgName} sur SEO-GEO`,
    '',
    `${inviterName} vous invite à rejoindre ${orgName} en tant que ${role}.`,
    '',
    `Acceptez l'invitation ici :`,
    acceptUrl,
    '',
    'Ce lien est valable 7 jours.',
  ].join('\n')

  await sendEmail({
    to: email,
    subject: `Invitation à rejoindre ${orgName} sur SEO-GEO`,
    html,
    text,
    tag: 'organization.invitation',
  })

  logger.info('invitation.created', {
    orgId: ctx.organizationId,
    invitedBy: ctx.user.id,
    invitationId: invitation.id,
    role,
  })

  return NextResponse.json(invitation, { status: 201 })
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

  if (!requireOwnerOrAdmin(ctx.role)) {
    return NextResponse.json(
      { error: 'Forbidden: seul un owner ou admin peut voir les invitations' },
      { status: 403 },
    )
  }

  const now = new Date()

  const rows = await db
    .select({
      id: invitations.id,
      email: invitations.email,
      role: invitations.role,
      expiresAt: invitations.expiresAt,
      createdAt: invitations.createdAt,
    })
    .from(invitations)
    .where(
      and(
        eq(invitations.organizationId, ctx.organizationId),
        isNull(invitations.acceptedAt),
        gt(invitations.expiresAt, now),
      ),
    )

  return NextResponse.json({ invitations: rows })
}
