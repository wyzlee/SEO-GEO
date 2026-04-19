import { jwtVerify, createRemoteJWKSet } from 'jose'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users, memberships, organizations } from '@/lib/db/schema'

const JWKS_URL = `https://api.stack-auth.com/api/v1/projects/${process.env.NEXT_PUBLIC_STACK_PROJECT_ID}/.well-known/jwks.json`

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null

function getJwks() {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(JWKS_URL), {
      timeoutDuration: 8_000,
      cooldownDuration: 15_000,
    })
  }
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

  await ensureUserProvisioned(user)

  const memberRows = await db
    .select()
    .from(memberships)
    .where(eq(memberships.userId, user.id))
    .limit(20)

  const match = memberRows.find((m) => m.organizationId === orgId)
  if (!match) throw new AuthError('Not a member of this organization', 403)

  return { user, organizationId: orgId, role: match.role }
}

async function ensureUserProvisioned(user: StackAuthUser): Promise<void> {
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1)
  if (existing.length > 0) return

  // Webhook hasn't fired yet (dev without webhook configured). Insert minimal row.
  await db
    .insert(users)
    .values({
      id: user.id,
      email: user.email || `${user.id}@unknown.local`,
      displayName: null,
      avatarUrl: null,
    })
    .onConflictDoNothing()
}

/**
 * Resolve the default organization for the current user : the first membership
 * (ordered by creation). Falls back to `x-org-id` header if provided.
 * Designed for single-org users. Multi-org users will get a selector in V2.
 */
export async function authenticateAuto(
  request: Request,
): Promise<AuthenticatedContext> {
  const explicit = request.headers.get('x-org-id')
  if (explicit) return authenticateWithOrg(request, explicit)

  const user = await authenticateRequest(request)
  await ensureUserProvisioned(user)

  const memberRows = await db
    .select({
      organizationId: memberships.organizationId,
      role: memberships.role,
    })
    .from(memberships)
    .where(eq(memberships.userId, user.id))
    .limit(1)

  if (!memberRows.length) {
    throw new AuthError('No organization membership', 403)
  }

  return {
    user,
    organizationId: memberRows[0].organizationId,
    role: memberRows[0].role,
  }
}

export interface UserOrgsSummary {
  user: StackAuthUser
  memberships: Array<{
    organizationId: string
    organizationName: string
    organizationSlug: string
    role: string
  }>
}

export async function getUserOrgsSummary(
  request: Request,
): Promise<UserOrgsSummary> {
  const user = await authenticateRequest(request)
  await ensureUserProvisioned(user)

  const rows = await db
    .select({
      organizationId: memberships.organizationId,
      organizationName: organizations.name,
      organizationSlug: organizations.slug,
      role: memberships.role,
    })
    .from(memberships)
    .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
    .where(eq(memberships.userId, user.id))

  return { user, memberships: rows }
}
