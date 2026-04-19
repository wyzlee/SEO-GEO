import { NextResponse } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { audits, organizations, users } from '@/lib/db/schema'
import { requireSuperAdmin } from '@/lib/auth/super-admin'
import { AuthError } from '@/lib/auth/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    await requireSuperAdmin(request)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    throw error
  }

  const rows = await db
    .select({
      id: audits.id,
      organizationId: audits.organizationId,
      organizationName: organizations.name,
      createdByEmail: users.email,
      inputType: audits.inputType,
      targetUrl: audits.targetUrl,
      status: audits.status,
      scoreTotal: audits.scoreTotal,
      mode: audits.mode,
      createdAt: audits.createdAt,
      finishedAt: audits.finishedAt,
      errorMessage: audits.errorMessage,
    })
    .from(audits)
    .innerJoin(organizations, eq(audits.organizationId, organizations.id))
    .innerJoin(users, eq(audits.createdBy, users.id))
    .orderBy(desc(audits.createdAt))
    .limit(200)

  return NextResponse.json({ audits: rows })
}
