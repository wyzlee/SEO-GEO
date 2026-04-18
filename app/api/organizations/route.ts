import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { organizations, users, memberships } from '@/lib/db/schema'
import { authenticateRequest, getUserOrgsSummary, AuthError } from '@/lib/auth/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CreateOrgSchema = z.object({
  name: z.string().min(2).max(100),
})

export async function GET(request: Request) {
  try {
    const summary = await getUserOrgsSummary(request)
    return NextResponse.json({ memberships: summary.memberships })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    throw error
  }
}

export async function POST(request: Request) {
  let user
  try {
    user = await authenticateRequest(request)
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
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = CreateOrgSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    )
  }

  const slugBase = parsed.data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const slug = `${slugBase}-${crypto.randomUUID().slice(0, 6)}`

  // 1. Provisionner l'utilisateur local (la FK memberships.userId → users.id
  //    échouerait sinon si le webhook Stack Auth n'a pas encore tiré)
  await db
    .insert(users)
    .values({
      id: user.id,
      email: user.email || `${user.id}@unknown.local`,
      displayName: null,
      avatarUrl: null,
    })
    .onConflictDoNothing()

  // 2. Créer l'organisation
  const [org] = await db
    .insert(organizations)
    .values({
      name: parsed.data.name,
      slug,
      plan: 'free',
    })
    .returning()

  // 3. Créer la membership owner (le Neon HTTP driver ne supporte pas les
  //    transactions — les insertions sont séquentielles)
  await db
    .insert(memberships)
    .values({
      userId: user.id,
      organizationId: org.id,
      role: 'owner',
    })
    .onConflictDoNothing()

  return NextResponse.json({ org }, { status: 201 })
}
