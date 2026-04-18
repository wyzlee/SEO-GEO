import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { organizations } from '@/lib/db/schema'
import { authenticateAuto, AuthError } from '@/lib/auth/server'
import {
  brandingFromRecord,
  brandingInputSchema,
  type StoredBranding,
} from '@/lib/organizations/branding'
import { addDomain, removeDomain } from '@/lib/vercel/domains'
import { logger } from '@/lib/observability/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Plans autorisés pour le custom domain
const CUSTOM_DOMAIN_PLANS = ['studio', 'agency'] as const

// Validation du custom domain : format FQDN, case-insensitive (on normalise avant)
const customDomainSchema = z
  .string()
  .max(253)
  .regex(
    /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/,
    'Format de domaine invalide',
  )
  .nullable()
  .optional()

// Validation du nom d'expéditeur email : pas de caractères d'injection header
const customEmailFromNameSchema = z
  .string()
  .max(80)
  .regex(/^[^<>"\r\n]+$/, 'Caractères interdits dans le nom expéditeur')
  .nullable()
  .optional()

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
      stripeCustomerId: organizations.stripeCustomerId,
      subscriptionStatus: organizations.subscriptionStatus,
      auditUsage: organizations.auditUsage,
      customDomain: organizations.customDomain,
      customEmailFromName: organizations.customEmailFromName,
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
    stripeCustomerId: org.stripeCustomerId,
    subscriptionStatus: org.subscriptionStatus,
    auditUsage: org.auditUsage,
    customDomain: org.customDomain ?? null,
    customEmailFromName: org.customEmailFromName ?? null,
  })
}

/**
 * PATCH /api/organizations/me
 * Met à jour le branding white-label, le custom domain et le nom expéditeur
 * email de l'organisation courante.
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

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const bodyObj = body as {
    branding?: unknown
    customDomain?: unknown
    customEmailFromName?: unknown
    // flat branding keys (legacy callers : useUpdateBranding)
    companyName?: unknown
    logoUrl?: unknown
    primaryColor?: unknown
    accentColor?: unknown
  }

  // --- Validation branding ---
  // Support deux formes d'appel :
  //   1. Nested : { branding: { companyName, ... } }  — useUpdateBranding v2
  //   2. Flat   : { companyName, logoUrl, ... }        — useUpdateBranding v1 (legacy)
  // On détecte la présence de champs branding connus pour décider si le branding
  // doit être mis à jour. Sans aucun champ branding dans le body, on ne touche pas.
  const BRANDING_KEYS = ['companyName', 'logoUrl', 'primaryColor', 'accentColor'] as const
  const hasBrandingNested = 'branding' in bodyObj
  const hasBrandingFlat = BRANDING_KEYS.some((k) => k in bodyObj)

  let branding: StoredBranding | undefined
  if (hasBrandingNested || hasBrandingFlat) {
    // Si nested → utiliser bodyObj.branding ; sinon extraire le sous-objet flat
    const brandingPayload = hasBrandingNested
      ? bodyObj.branding
      : Object.fromEntries(BRANDING_KEYS.filter((k) => k in bodyObj).map((k) => [k, bodyObj[k]]))

    const parsed = brandingInputSchema.safeParse(brandingPayload)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.issues },
        { status: 400 },
      )
    }
    branding = {
      companyName: parsed.data.companyName?.trim() || null,
      logoUrl: parsed.data.logoUrl?.trim() || null,
      primaryColor: parsed.data.primaryColor?.trim() || null,
      accentColor: parsed.data.accentColor?.trim() || null,
    }
  }

  // --- Validation customDomain ---
  let newCustomDomain: string | null | undefined
  if ('customDomain' in (bodyObj as object)) {
    // Normaliser en lowercase avant validation
    const rawDomain =
      typeof bodyObj.customDomain === 'string'
        ? bodyObj.customDomain.toLowerCase().trim()
        : bodyObj.customDomain

    const parsedDomain = customDomainSchema.safeParse(
      rawDomain === '' ? null : rawDomain,
    )
    if (!parsedDomain.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsedDomain.error.issues },
        { status: 400 },
      )
    }
    newCustomDomain = parsedDomain.data ?? null
  }

  // --- Validation customEmailFromName ---
  let newCustomEmailFromName: string | null | undefined
  if ('customEmailFromName' in (bodyObj as object)) {
    const rawName =
      typeof bodyObj.customEmailFromName === 'string'
        ? bodyObj.customEmailFromName.trim()
        : bodyObj.customEmailFromName

    const parsedName = customEmailFromNameSchema.safeParse(
      rawName === '' ? null : rawName,
    )
    if (!parsedName.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsedName.error.issues },
        { status: 400 },
      )
    }
    newCustomEmailFromName = parsedName.data ?? null
  }

  // --- Gestion du custom domain ---
  let resolvedCustomDomain: string | null | undefined
  if (newCustomDomain !== undefined) {
    // Plan gate : studio ou agency requis
    const [currentOrg] = await db
      .select({
        plan: organizations.plan,
        customDomain: organizations.customDomain,
      })
      .from(organizations)
      .where(eq(organizations.id, ctx.organizationId))
      .limit(1)

    if (!currentOrg) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (!(CUSTOM_DOMAIN_PLANS as readonly string[]).includes(currentOrg.plan)) {
      return NextResponse.json(
        { error: 'plan insufficient: custom domain requires studio or agency plan' },
        { status: 403 },
      )
    }

    const oldDomain = currentOrg.customDomain ?? null

    // Ajouter le nouveau domaine sur Vercel (si non-null)
    if (newCustomDomain !== null) {
      const addResult = await addDomain(newCustomDomain)
      if (!addResult.ok) {
        logger.error('vercel.domain.add.failed', {
            orgId: ctx.organizationId,
            domain: newCustomDomain,
            error: addResult.error,
          })
        return NextResponse.json(
          { error: `Impossible d'ajouter le domaine sur Vercel : ${addResult.error}` },
          { status: 502 },
        )
      }
    }

    // Supprimer l'ancien domaine si différent (après succès de l'ajout)
    if (oldDomain && oldDomain !== newCustomDomain) {
      const removeResult = await removeDomain(oldDomain)
      if (!removeResult.ok) {
        // Non-bloquant : on log et on continue — le domaine devient orphelin
        // dans le projet Vercel, nettoyage manuel si nécessaire
        logger.warn('vercel.domain.remove.failed — orphan domain in Vercel project', {
            orgId: ctx.organizationId,
            domain: oldDomain,
          })
      }
    }

    resolvedCustomDomain = newCustomDomain
  }

  // --- Construire le set DB (uniquement les champs explicitement fournis) ---
  const updateSet: Record<string, unknown> = { updatedAt: new Date() }
  if (branding !== undefined) updateSet.branding = branding
  if (resolvedCustomDomain !== undefined) updateSet.customDomain = resolvedCustomDomain
  if (newCustomEmailFromName !== undefined) updateSet.customEmailFromName = newCustomEmailFromName

  await db
    .update(organizations)
    .set(updateSet)
    .where(eq(organizations.id, ctx.organizationId))

  return NextResponse.json({
    branding: branding !== undefined ? brandingFromRecord(branding) : undefined,
    customDomain: resolvedCustomDomain ?? undefined,
    customEmailFromName: newCustomEmailFromName ?? undefined,
  })
}
