import { NextResponse } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { audits, organizations } from '@/lib/db/schema'
import { requireAdmin, resolveOrgId } from '@/lib/auth/require-admin'
import { AuthError } from '@/lib/auth/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  let ctx
  try {
    ctx = await requireAdmin(request)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    throw error
  }

  let resolvedOrgId: string | null
  try {
    resolvedOrgId = await resolveOrgId(request, ctx)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    throw error
  }

  // Super-admin sans header x-org-id → accès global (toutes les orgs)
  // Org-admin → resolvedOrgId est toujours défini (scopé à son org)
  const orgId: string | null = resolvedOrgId

  // Lookup du nom d'org uniquement si scopé à une org
  let organizationName: string | null = null
  if (orgId) {
    const org = await db
      .select({ name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1)

    if (!org.length) {
      return NextResponse.json({ error: 'Organisation introuvable' }, { status: 404 })
    }
    organizationName = org[0].name
  }

  const rows = await db
    .select({
      id: audits.id,
      targetUrl: audits.targetUrl,
      status: audits.status,
      scoreTotal: audits.scoreTotal,
      mode: audits.mode,
      createdAt: audits.createdAt,
      finishedAt: audits.finishedAt,
      errorMessage: audits.errorMessage,
    })
    .from(audits)
    .where(orgId ? eq(audits.organizationId, orgId) : undefined)
    .orderBy(desc(audits.createdAt))
    .limit(200)

  return NextResponse.json({
    organizationName,
    audits: rows.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
      finishedAt: a.finishedAt?.toISOString() ?? null,
    })),
  })
}
