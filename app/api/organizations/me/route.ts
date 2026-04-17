import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { organizations } from '@/lib/db/schema'
import { authenticateAuto, AuthError } from '@/lib/auth/server'
import {
  brandingFromRecord,
  brandingInputSchema,
  type StoredBranding,
} from '@/lib/organizations/branding'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/organizations/me
 * Retourne l'organisation courante (résolue via `authenticateAuto`) avec son
 * branding normalisé. Scope multi-tenant : l'utilisateur ne peut accéder
 * qu'à sa propre organisation.
 */
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
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      plan: organizations.plan,
      branding: organizations.branding,
    })
    .from(organizations)
    .where(eq(organizations.id, ctx.organizationId))
    .limit(1)

  if (!org) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({
    id: org.id,
    name: org.name,
    slug: org.slug,
    plan: org.plan,
    role: ctx.role,
    branding: brandingFromRecord(org.branding as StoredBranding | null),
  })
}

/**
 * PATCH /api/organizations/me
 * Met à jour le branding white-label de l'organisation courante.
 * Réservé aux rôles `owner` et `admin`.
 */
export async function PATCH(request: Request) {
  let ctx
  try {
    ctx = await authenticateAuto(request)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    throw error
  }

  if (ctx.role !== 'owner' && ctx.role !== 'admin') {
    return NextResponse.json(
      { error: 'Forbidden: seul un owner ou admin peut modifier le branding' },
      { status: 403 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const bodyObj = body as { branding?: unknown }
  const parsed = brandingInputSchema.safeParse(bodyObj.branding ?? body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  // Normalise : champs vides → null (plutôt que de persister des chaînes vides)
  const branding: StoredBranding = {
    companyName: parsed.data.companyName?.trim() || null,
    logoUrl: parsed.data.logoUrl?.trim() || null,
    primaryColor: parsed.data.primaryColor?.trim() || null,
    accentColor: parsed.data.accentColor?.trim() || null,
  }

  await db
    .update(organizations)
    .set({ branding, updatedAt: new Date() })
    .where(eq(organizations.id, ctx.organizationId))

  return NextResponse.json({
    branding: brandingFromRecord(branding),
  })
}
