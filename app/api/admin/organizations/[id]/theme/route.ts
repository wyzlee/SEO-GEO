import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { organizations } from '@/lib/db/schema'
import { requireSuperAdmin } from '@/lib/auth/super-admin'
import { AuthError } from '@/lib/auth/server'
import { logger } from '@/lib/observability/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const themeBody = z.object({
  primary: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Couleur hex invalide').optional(),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Couleur hex invalide').optional(),
  background: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Couleur hex invalide').optional(),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  let ctx
  try {
    ctx = await requireSuperAdmin(request)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    throw error
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = themeBody.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid body' }, { status: 422 })
  }

  const orgRows = await db
    .select({ id: organizations.id, branding: organizations.branding })
    .from(organizations)
    .where(eq(organizations.id, id))
    .limit(1)

  if (!orgRows.length) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Merge incoming theme values with existing branding
  const existingBranding = (orgRows[0].branding as Record<string, unknown> | null) ?? {}
  const existingTheme = (existingBranding.theme as Record<string, string> | undefined) ?? {}

  const newTheme = {
    ...existingTheme,
    ...(parsed.data.primary !== undefined && { primary: parsed.data.primary }),
    ...(parsed.data.accent !== undefined && { accent: parsed.data.accent }),
    ...(parsed.data.background !== undefined && { background: parsed.data.background }),
  }

  const newBranding = { ...existingBranding, theme: newTheme }

  const [updated] = await db
    .update(organizations)
    .set({ branding: newBranding, updatedAt: new Date() })
    .where(eq(organizations.id, id))
    .returning()

  logger.info('admin.org_theme_updated', {
    org_id: id,
    theme: newTheme,
    by: ctx.email,
  })

  return NextResponse.json({ branding: updated.branding })
}
