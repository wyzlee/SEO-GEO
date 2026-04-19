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

  if (!resolvedOrgId) {
    return NextResponse.json({ error: 'x-org-id requis pour un super-admin' }, { status: 400 })
  }

  const orgId: string = resolvedOrgId

  const org = await db
    .select({ name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1)

  if (!org.length) {
    return NextResponse.json({ error: 'Organisation introuvable' }, { status: 404 })
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
    .where(eq(audits.organizationId, orgId))
    .orderBy(desc(audits.createdAt))
    .limit(200)

  return NextResponse.json({
    organizationName: org[0].name,
    audits: rows.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
      finishedAt: a.finishedAt?.toISOString() ?? null,
    })),
  })
}
