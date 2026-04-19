import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { authenticateRequest, AuthError } from './server'

export interface SuperAdminContext {
  userId: string
  email: string
}

export async function requireSuperAdmin(request: Request): Promise<SuperAdminContext> {
  const user = await authenticateRequest(request)

  const row = await db
    .select({ isSuperAdmin: users.isSuperAdmin })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1)

  if (!row.length || !row[0].isSuperAdmin) {
    throw new AuthError('Forbidden', 403)
  }

  return { userId: user.id, email: user.email }
}
