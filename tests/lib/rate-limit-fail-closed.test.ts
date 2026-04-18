// @vitest-environment node
/**
 * Vérifie le comportement fail-closed du rate limiter quand Upstash Redis
 * n'est pas configuré :
 * - en production → allowed=false (refus), retryAfter calculé
 * - en dev/test → allowed=true (passthrough, pour ne pas bloquer le dev)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('rateLimit — fail-closed sans Upstash Redis', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.resetModules()
    // S'assurer que les vars Redis sont ABSENTES pour ce test.
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.resetModules()
  })

  it('PROD: refuse (fail-closed) quand Redis absent', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const { rateLimit } = await import('@/lib/security/rate-limit')
    const res = await rateLimit(
      { name: 'test.prod', max: 3, windowMs: 60_000 },
      'user-1',
    )
    expect(res.allowed).toBe(false)
    expect(res.remaining).toBe(0)
    expect(res.retryAfterSeconds).toBeGreaterThan(0)
    expect(res.resetAt).toBeGreaterThan(Date.now())
  })

  it('DEV: passthrough (allowed=true) quand Redis absent', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    const { rateLimit } = await import('@/lib/security/rate-limit')
    const res = await rateLimit(
      { name: 'test.dev', max: 3, windowMs: 60_000 },
      'user-1',
    )
    expect(res.allowed).toBe(true)
    expect(res.remaining).toBe(999)
  })

  it('TEST: passthrough (allowed=true) quand Redis absent', async () => {
    vi.stubEnv('NODE_ENV', 'test')
    const { rateLimit } = await import('@/lib/security/rate-limit')
    const res = await rateLimit(
      { name: 'test.test', max: 3, windowMs: 60_000 },
      'user-1',
    )
    expect(res.allowed).toBe(true)
  })

  it('PROD: calcule retryAfter = ceil(windowMs / 1000)', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const { rateLimit } = await import('@/lib/security/rate-limit')
    const res = await rateLimit(
      { name: 'test.prod.retry', max: 10, windowMs: 45_000 },
      'user-1',
    )
    expect(res.retryAfterSeconds).toBe(45)
  })
})
