import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { invitations, organizations, users } from '@/lib/db/schema'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Paramètre token manquant' }, { status: 400 })
  }

  const [row] = await db
    .select({
      id: invitations.id,
      email: invitations.email,
      role: invitations.role,
      acceptedAt: invitations.acceptedAt,
      expiresAt: invitations.expiresAt,
      organizationId: invitations.organizationId,
      orgName: organizations.name,
      inviterDisplayName: users.displayName,
      inviterEmail: users.email,
    })
    .from(invitations)
    .innerJoin(organizations, eq(invitations.organizationId, organizations.id))
    .innerJoin(users, eq(invitations.invitedBy, users.id))
    .where(eq(invitations.token, token))
    .limit(1)

  if (!row) {
    return NextResponse.json({ error: 'Invitation introuvable' }, { status: 404 })
  }

  if (row.acceptedAt !== null) {
    return NextResponse.json({ error: 'Invitation déjà acceptée' }, { status: 410 })
  }

  if (row.expiresAt <= new Date()) {
    return NextResponse.json({ error: 'Invitation expirée' }, { status: 410 })
  }

  return NextResponse.json({
    valid: true,
    email: row.email,
    orgName: row.orgName,
    role: row.role,
    inviterName: row.inviterDisplayName || row.inviterEmail,
    expiresAt: row.expiresAt,
  })
}
