import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { requireSuperAdmin } from '@/lib/auth/super-admin'
import { AuthError } from '@/lib/auth/server'
import { logger } from '@/lib/observability/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface StackAuthUser {
  id: string
  primary_email: string | null
  display_name: string | null
  profile_image_url: string | null
}

interface StackAuthResponse {
  is_paginated?: boolean
  items: StackAuthUser[]
  // Stack Auth peut retourner le curseur sous différentes formes selon la version
  cursor?: string
  next_cursor?: string
  pagination?: { next_cursor?: string }
}

/** Erreur enrichie avec le body réel de Stack Auth pour diagnostiquer en prod. */
class StackAuthFetchError extends Error {
  status: number
  body: string
  constructor(status: number, body: string) {
    super(`Stack Auth API error: ${status}`)
    this.name = 'StackAuthFetchError'
    this.status = status
    this.body = body
  }
}

const STACK_API_BASE = 'https://api.stack-auth.com/api/v1'
const MAX_PAGES = 50 // garde-fou contre boucle infinie

async function fetchStackAuthUsers(): Promise<StackAuthUser[]> {
  const projectId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID
  const secretKey = process.env.STACK_SECRET_SERVER_KEY

  if (!projectId || !secretKey) {
    throw new Error('NEXT_PUBLIC_STACK_PROJECT_ID ou STACK_SECRET_SERVER_KEY manquant')
  }

  const baseHeaders = {
    'x-stack-project-id': projectId,
    'x-stack-secret-server-key': secretKey,
    'x-stack-access-type': 'server',
    'Content-Type': 'application/json',
  }

  const allUsers: StackAuthUser[] = []
  let cursor: string | undefined = undefined
  let page = 0

  while (true) {
    if (page >= MAX_PAGES) {
      logger.warn('admin.sync_users_max_pages_reached', { page, count: allUsers.length })
      break
    }

    const url = new URL(`${STACK_API_BASE}/users`)
    url.searchParams.set('limit', '100')
    if (cursor) url.searchParams.set('cursor', cursor)

    const response = await fetch(url.toString(), { headers: baseHeaders })

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'no body')
      throw new StackAuthFetchError(response.status, errorBody)
    }

    const data: StackAuthResponse = await response.json()

    // Stack Auth peut retourner items vide sans erreur (liste vide ou fin de pagination)
    if (!data.items || data.items.length === 0) break

    allUsers.push(...data.items)
    page++

    // Gérer les différents formats de curseur selon la version Stack Auth
    const nextCursor =
      data.next_cursor ??
      data.cursor ??
      data.pagination?.next_cursor

    if (!nextCursor) break
    cursor = nextCursor
  }

  return allUsers
}

export async function POST(request: Request) {
  let ctx
  try {
    ctx = await requireSuperAdmin(request)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    throw error
  }

  let stackUsers: StackAuthUser[]
  try {
    stackUsers = await fetchStackAuthUsers()
  } catch (error) {
    if (error instanceof StackAuthFetchError) {
      logger.error('admin.sync_users_fetch_failed', {
        by: ctx.email,
        status: error.status,
        body: error.body,
      })
      return NextResponse.json(
        { error: `Stack Auth ${error.status}`, detail: error.body },
        { status: 502 },
      )
    }
    logger.error('admin.sync_users_fetch_failed', {
      by: ctx.email,
      error: error instanceof Error ? error : new Error(String(error)),
    })
    return NextResponse.json({ error: 'Erreur lors de la récupération des utilisateurs Stack Auth' }, { status: 502 })
  }

  // Filtrer les users sans email (non exploitables en DB)
  const validUsers = stackUsers.filter((u) => u.primary_email)

  // Upsert par batch — onConflictDoUpdate sur users.id
  // Note V1 : si un user change d'ID Stack Auth en gardant le même email,
  // l'upsert sur `id` crée un doublon email. Cas improbable en prod.
  let synced = 0
  for (const u of validUsers) {
    await db
      .insert(users)
      .values({
        id: u.id,
        email: u.primary_email!,
        displayName: u.display_name ?? null,
        avatarUrl: u.profile_image_url ?? null,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: u.primary_email!,
          displayName: u.display_name ?? null,
          avatarUrl: u.profile_image_url ?? null,
          updatedAt: new Date(),
        },
      })
    synced++
  }

  logger.info('admin.users_synced', { count: synced, by: ctx.email })

  return NextResponse.json({ synced })
}
