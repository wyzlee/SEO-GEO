/**
 * GET /api/organizations/me/domain-status
 * Retourne le statut de vérification DNS du domaine custom de l'organisation.
 * Appelle l'API Vercel REST pour vérifier si le CNAME est correctement configuré.
 */
import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { organizations } from '@/lib/db/schema'
import { authenticateAuto, AuthError } from '@/lib/auth/server'
import { getDomainStatus } from '@/lib/vercel/domains'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

  const [org] = await db
    .select({ customDomain: organizations.customDomain })
    .from(organizations)
    .where(eq(organizations.id, ctx.organizationId))
    .limit(1)

  if (!org || !org.customDomain) {
    return NextResponse.json(
      { error: 'Aucun domaine custom configuré pour cette organisation' },
      { status: 404 },
    )
  }

  const raw = await getDomainStatus(org.customDomain)

  return NextResponse.json({
    domain: raw.domain,
    status: raw.error ? 'error' : raw.verified ? 'verified' : 'pending',
    cname: raw.cname ?? null,
    error: raw.error ?? null,
  })
}
