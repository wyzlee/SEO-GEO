/**
 * Factories de mock pour l'authentification dans les tests d'API routes.
 * Centralise le pattern vi.mock('@/lib/auth/server') pour éviter de le
 * dupliquer dans chaque fichier de test.
 */
import { vi } from 'vitest'

export interface MockAuthContext {
  user: { id: string; email: string }
  organizationId: string
  role: 'owner' | 'admin' | 'member'
}

export function makeMockAuth(
  overrides: Partial<MockAuthContext> = {},
): MockAuthContext {
  return {
    user: { id: 'user-test-1', email: 'test@wyzlee.cloud' },
    organizationId: 'org-test-1',
    role: 'owner',
    ...overrides,
  }
}

/**
 * Helper pour mock rapide de `authenticateAuto` dans vi.mock().
 *
 * Usage :
 *   const mockAuth = makeAuthMock()
 *   vi.mock('@/lib/auth/server', () => mockAuth.moduleMock)
 *   // dans beforeEach :
 *   mockAuth.authenticateAutoMock.mockResolvedValue(makeMockAuth())
 */
export function makeAuthMock() {
  const authenticateAutoMock = vi.fn()
  const authenticateRequestMock = vi.fn()

  // Retourner les mocks + une factory pour la config vi.mock.
  return {
    authenticateAutoMock,
    authenticateRequestMock,
    /** À passer à vi.mock('@/lib/auth/server', () => ...) */
    moduleMock: async (importOriginal: () => Promise<unknown>) => {
      const actual = (await importOriginal()) as Record<string, unknown>
      return {
        ...actual,
        authenticateAuto: (req: Request) => authenticateAutoMock(req),
        authenticateRequest: (req: Request) => authenticateRequestMock(req),
      }
    },
  }
}
