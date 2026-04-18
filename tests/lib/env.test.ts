// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('validateEnv', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.resetModules()
    // Repartir d'un env propre.
    for (const key of Object.keys(process.env)) {
      if (
        key.startsWith('DATABASE_') ||
        key.startsWith('STACK_') ||
        key.startsWith('NEXT_PUBLIC_STACK_') ||
        key.startsWith('CRON_') ||
        key.startsWith('UPSTASH_') ||
        key.startsWith('STRIPE_') ||
        key === 'NODE_ENV'
      ) {
        delete process.env[key]
      }
    }
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  function setValidRequired() {
    process.env.DATABASE_URL = 'postgresql://u:p@host/db?sslmode=require'
    process.env.NEXT_PUBLIC_STACK_PROJECT_ID = '53bd9627-69d7-485c-a76e-260275e0de0f'
    process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_KEY = 'pck_dummy_123'
    process.env.STACK_SECRET_SERVER_KEY = 'ssk_dummy_123'
    process.env.STACK_WEBHOOK_SECRET = 'a'.repeat(32)
    process.env.CRON_SECRET = 'b'.repeat(64)
  }

  it('flags missing DATABASE_URL', async () => {
    const { validateEnv } = await import('@/lib/env')
    const r = validateEnv()
    expect(r.ok).toBe(false)
    expect(r.missing.join(' ')).toMatch(/DATABASE_URL/)
  })

  it('accepte une config valide sans warnings obligatoires', async () => {
    setValidRequired()
    const { validateEnv } = await import('@/lib/env')
    const r = validateEnv()
    expect(r.ok).toBe(true)
    expect(r.missing).toHaveLength(0)
  })

  it('flag UUID invalide pour STACK_PROJECT_ID', async () => {
    setValidRequired()
    process.env.NEXT_PUBLIC_STACK_PROJECT_ID = 'not-a-uuid'
    const { validateEnv } = await import('@/lib/env')
    const r = validateEnv()
    expect(r.ok).toBe(false)
    expect(r.missing.join(' ')).toMatch(/Project ID Stack Auth invalide/)
  })

  it('flag CRON_SECRET trop court', async () => {
    setValidRequired()
    process.env.CRON_SECRET = 'short'
    const { validateEnv } = await import('@/lib/env')
    const r = validateEnv()
    expect(r.ok).toBe(false)
    expect(r.missing.join(' ')).toMatch(/CRON_SECRET/)
  })

  it('PROD + Redis absent → ajoute warning (pas missing)', async () => {
    setValidRequired()
    vi.stubEnv('NODE_ENV', 'production')
    const { validateEnv } = await import('@/lib/env')
    const r = validateEnv()
    expect(r.ok).toBe(true)
    expect(r.warnings.join(' ')).toMatch(/UPSTASH_REDIS/)
  })

  it('PROD + Stripe absent → warning', async () => {
    setValidRequired()
    vi.stubEnv('NODE_ENV', 'production')
    const { validateEnv } = await import('@/lib/env')
    const r = validateEnv()
    expect(r.warnings.join(' ')).toMatch(/STRIPE_SECRET_KEY/)
  })
})

describe('assertEnvOrThrow', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.resetModules()
    for (const key of Object.keys(process.env)) {
      if (
        key.startsWith('DATABASE_') ||
        key.startsWith('STACK_') ||
        key.startsWith('NEXT_PUBLIC_STACK_') ||
        key.startsWith('CRON_') ||
        key === 'NODE_ENV'
      ) {
        delete process.env[key]
      }
    }
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('PROD + missing → throw', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const { assertEnvOrThrow } = await import('@/lib/env')
    expect(() => assertEnvOrThrow()).toThrow(/Configuration environment invalide/)
  })

  it('DEV + missing → ne throw pas (log seulement)', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    const { assertEnvOrThrow } = await import('@/lib/env')
    expect(() => assertEnvOrThrow()).not.toThrow()
  })
})
