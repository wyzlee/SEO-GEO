/**
 * Helpers Stack Auth côté serveur — opérations administratives via REST API.
 *
 * Toutes les fonctions utilisent les headers communs Stack Auth server-side.
 * Erreurs 4xx/5xx : log structuré + throw (la route appelante gère le code HTTP).
 */

import { logger } from '@/lib/observability/logger'

const STACK_API = 'https://api.stack-auth.com/api/v1'

function getStackHeaders(): Record<string, string> {
  const projectId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID
  const secretKey = process.env.STACK_SECRET_SERVER_KEY

  if (!projectId || !secretKey) {
    throw new Error(
      'NEXT_PUBLIC_STACK_PROJECT_ID ou STACK_SECRET_SERVER_KEY manquant',
    )
  }

  return {
    'x-stack-project-id': projectId,
    'x-stack-secret-server-key': secretKey,
    'x-stack-access-type': 'server',
    'Content-Type': 'application/json',
  }
}

async function stackRequest(
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<void> {
  const res = await fetch(`${STACK_API}${path}`, {
    method,
    headers: getStackHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const responseBody = await res.text().catch(() => 'no body')
    logger.error('stack_auth.api_error', {
      method,
      path,
      status: res.status,
      body: responseBody,
    })
    throw new Error(
      `Stack Auth API error: ${res.status} on ${method} ${path}`,
    )
  }
}

/**
 * Envoie un magic link (sign-in link) à l'email d'un utilisateur.
 * POST /auth/magic-link/send-sign-in-link
 */
export async function sendMagicLink(
  email: string,
  redirectUrl: string,
): Promise<void> {
  await stackRequest('POST', '/auth/magic-link/send-sign-in-link', {
    email,
    redirect_url: redirectUrl,
  })
}

/**
 * Envoie un email de reset de mot de passe.
 * POST /auth/password/send-reset-link
 */
export async function sendPasswordResetEmail(
  email: string,
  redirectUrl: string,
): Promise<void> {
  await stackRequest('POST', '/auth/password/send-reset-link', {
    email,
    redirect_url: redirectUrl,
  })
}

/**
 * Met à jour l'email primaire d'un utilisateur Stack Auth.
 * PATCH /users/{userId}
 */
export async function updateStackAuthUserEmail(
  userId: string,
  newEmail: string,
): Promise<void> {
  await stackRequest('PATCH', `/users/${userId}`, {
    primary_email: newEmail,
  })
}

/**
 * Suspend un utilisateur Stack Auth.
 * PATCH /users/{userId} { is_suspended: true }
 * Stack Auth v2+ uniquement. Si l'API ne supporte pas, l'erreur est loggée
 * mais ne remonte pas (no-op silencieux intentionnel : la suspension DB prime).
 */
export async function suspendStackAuthUser(userId: string): Promise<void> {
  try {
    await stackRequest('PATCH', `/users/${userId}`, { is_suspended: true })
  } catch (err) {
    // No-op silencieux : la suspension locale en DB reste effective.
    // Stack Auth peut ne pas supporter is_suspended selon la version.
    logger.warn('stack_auth.suspend_noop', {
      user_id: userId,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

/**
 * Réactive un utilisateur Stack Auth.
 * PATCH /users/{userId} { is_suspended: false }
 */
export async function unsuspendStackAuthUser(userId: string): Promise<void> {
  try {
    await stackRequest('PATCH', `/users/${userId}`, { is_suspended: false })
  } catch (err) {
    logger.warn('stack_auth.unsuspend_noop', {
      user_id: userId,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}
