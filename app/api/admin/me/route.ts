import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { authenticateRequest, AuthError } from '@/lib/auth/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  let user
  try {
    user = await authenticateRequest(request)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ isSuperAdmin: false })
    }
    throw error
  }

  const row = await db
    .select({ isSuperAdmin: users.isSuperAdmin })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1)

  return NextResponse.json({ isSuperAdmin: row[0]?.isSuperAdmin ?? false })
}
