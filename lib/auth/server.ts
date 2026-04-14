import { jwtVerify, createRemoteJWKSet } from 'jose'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users, memberships } from '@/lib/db/schema'

const JWKS_URL = `https://api.stack-auth.com/api/v1/projects/${process.env.NEXT_PUBLIC_STACK_PROJECT_ID}/.well-known/jwks.json`

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null

function getJwks() {
  if (!jwks) jwks = createRemoteJWKSet(new URL(JWKS_URL))
  return jwks
}

export interface StackAuthUser {
  id: string
  email: string
}

export interface AuthenticatedContext {
  user: StackAuthUser
  organizationId: string
  role: string
}

export class AuthError extends Error {
  status: number
  constructor(message: string, status = 401) {
    super(message)
    this.name = 'AuthError'
    this.status = status
  }
}

async function verifyJwt(token: string): Promise<StackAuthUser> {
  try {
    const { payload } = await jwtVerify(token, getJwks(), {
      issuer: `https://api.stack-auth.com/api/v1/projects/${process.env.NEXT_PUBLIC_STACK_PROJECT_ID}`,
    })
    const userId = payload.sub
    const email = ((payload as Record<string, unknown>).email as string) || ''
    if (!userId) throw new AuthError('Invalid token: missing subject')
    return { id: userId, email }
  } catch (error) {
    if (error instanceof AuthError) throw error
    throw new AuthError('Invalid or expired token')
  }
}

function extractBearer(request: Request): string | null {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  return authHeader.slice(7)
}

function extractCookieToken(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie')
  if (!cookieHeader) return null
  const projectId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID
  const candidates = [`stack-access-${projectId}`, 'stack-access']
  for (const name of candidates) {
    const match = cookieHeader.match(new RegExp(`${name}=([^;]+)`))
    if (match) return decodeURIComponent(match[1])
  }
  return null
}

/**
 * Authenticate a Route Handler request. Reads Bearer header first, falls back
 * to Stack Auth cookie. Returns StackAuthUser only (no org scope).
 */
export async function authenticateRequest(
  request: Request,
): Promise<StackAuthUser> {
  const token = extractBearer(request) || extractCookieToken(request)
  if (!token) throw new AuthError('Missing authentication token')
  return verifyJwt(token)
}

/**
 * Authenticate + load org scope. Expects `x-org-id` header or `organization_id`
 * in body. Throws 403 if user is not a member.
 */
export async function authenticateWithOrg(
  request: Request,
  orgIdInput?: string,
): Promise<AuthenticatedContext> {
  const user = await authenticateRequest(request)
  const orgId = orgIdInput || request.headers.get('x-org-id') || null
  if (!orgId) throw new AuthError('Missing organization_id', 400)

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1)

  if (existing.length === 0) {
    throw new AuthError('User not provisioned locally', 403)
  }

  const memberRows = await db
    .select()
    .from(memberships)
    .where(eq(memberships.userId, user.id))
    .limit(20)

  const match = memberRows.find((m) => m.organizationId === orgId)
  if (!match) throw new AuthError('Not a member of this organization', 403)

  return { user, organizationId: orgId, role: match.role }
}
