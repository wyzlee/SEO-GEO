import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users, memberships, organizations } from '@/lib/db/schema'
import { authenticateRequest, AuthError } from './server'
import { requireSuperAdmin } from './super-admin'

export interface AdminContext {
  userId: string
  email: string
  isSuperAdmin: boolean
  /** null pour un super-admin (accès cross-org via header x-org-id) */
  orgId: string | null
  /** 'owner' | 'admin' | null (null pour super-admin) */
  orgRole: string | null
}

/**
 * Accepte un super-admin OU un org-admin (owner/admin).
 *
 * - Super-admin : orgId null, accès cross-org via header `x-org-id`.
 * - Org-admin : orgId = premier membership owner/admin de l'utilisateur.
 * - Ni l'un ni l'autre : AuthError 403.
 * - Token absent/invalide : AuthError 401 (non silencé).
 */
export async function requireAdmin(request: Request): Promise<AdminContext> {
  // Cas 1 : super-admin
  try {
    const ctx = await requireSuperAdmin(request)
    return {
      userId: ctx.userId,
      email: ctx.email,
      isSuperAdmin: true,
      orgId: null,
      orgRole: null,
    }
  } catch (superError) {
    // 401 → token manquant ou invalide → propager immédiatement
    if (superError instanceof AuthError && superError.status === 401) {
      throw superError
    }
    // 403 → authentifié mais pas super-admin → tenter org-admin
    if (!(superError instanceof AuthError && superError.status === 403)) {
      throw superError
    }
  }

  // Cas 2 : org-admin — l'user est authentifié mais pas super-admin
  const user = await authenticateRequest(request)

  const memberRows = await db
    .select({
      organizationId: memberships.organizationId,
      role: memberships.role,
    })
    .from(memberships)
    .where(eq(memberships.userId, user.id))

  const adminMembership = memberRows.find((m) => m.role === 'owner' || m.role === 'admin')

  if (!adminMembership) {
    throw new AuthError('Forbidden: org-admin role required', 403)
  }

  // Récupérer l'email depuis la table users locale (plus fiable que le JWT)
  const userRow = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1)

  const email = userRow[0]?.email ?? user.email

  return {
    userId: user.id,
    email,
    isSuperAdmin: false,
    orgId: adminMembership.organizationId,
    orgRole: adminMembership.role,
  }
}

/**
 * Résout l'orgId effectif pour la requête :
 * - Super-admin avec header `x-org-id` → valider que l'org existe, retourner son id.
 * - Super-admin sans header → null (caller doit décider quoi faire).
 * - Org-admin → ctx.orgId toujours défini.
 *
 * Retourne null si super-admin sans header (accès global).
 * Throw 404 si super-admin fournit un `x-org-id` inexistant.
 */
export async function resolveOrgId(
  request: Request,
  ctx: AdminContext,
): Promise<string | null> {
  if (!ctx.isSuperAdmin) return ctx.orgId

  const headerOrgId = request.headers.get('x-org-id')
  if (!headerOrgId) return null

  const orgRow = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.id, headerOrgId))
    .limit(1)

  if (!orgRow.length) {
    throw new AuthError('Organisation introuvable', 404)
  }

  return headerOrgId
}
