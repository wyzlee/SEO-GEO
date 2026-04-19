import { NextResponse } from 'next/server'
import { count } from 'drizzle-orm'
import { db } from '@/lib/db'
import { organizations, users, audits } from '@/lib/db/schema'
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

  const [[orgCount], [userCount], [auditCount]] = await Promise.all([
    db.select({ count: count() }).from(organizations),
    db.select({ count: count() }).from(users),
    db.select({ count: count() }).from(audits),
  ])

  return NextResponse.json({
    organizations: orgCount.count,
    users: userCount.count,
    audits: auditCount.count,
  })
}
