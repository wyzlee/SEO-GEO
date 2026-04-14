import { headers, cookies } from 'next/headers'
import { authenticateRequest, AuthError } from './server'
import type { StackAuthUser } from './server'

/**
 * Get authenticated Stack Auth user in a Server Component or Server Action.
 * Returns null if not authenticated.
 */
export async function getSessionUser(): Promise<StackAuthUser | null> {
  try {
    const headersList = await headers()
    const cookieStore = await cookies()

    const authorization = headersList.get('authorization') || ''
    const cookieHeader = cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join('; ')

    const mockRequest = new Request('http://localhost', {
      headers: {
        ...(authorization ? { authorization } : {}),
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
    })
    return await authenticateRequest(mockRequest)
  } catch (error) {
    if (error instanceof AuthError) return null
    return null
  }
}

export async function requireSessionUser(): Promise<StackAuthUser> {
  const user = await getSessionUser()
  if (!user) throw new AuthError('Unauthorized')
  return user
}
