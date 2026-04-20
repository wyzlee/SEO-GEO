import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from './mocks/server'

// Activer le serveur MSW avant tous les tests.
// onUnhandledRequest: 'warn' — les appels non mockés affichent un avertissement
// mais ne cassent pas les tests existants (compatibilité tests vi.fn() existants).
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))

// Réinitialiser les handlers entre chaque test pour éviter les fuites d'état.
afterEach(() => {
  server.resetHandlers()
  cleanup()
})

// Fermer le serveur après la suite complète.
afterAll(() => server.close())
