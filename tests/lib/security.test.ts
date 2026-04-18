import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import dns from 'node:dns'
import {
  assertSafeDnsUrl,
  assertSafeUrl,
  UnsafeUrlError,
} from '@/lib/security/url-guard'
import {
  rateLimit,
  __resetRateLimits,
} from '@/lib/security/rate-limit'

vi.mock('node:dns', () => {
  const lookup = vi.fn()
  return {
    default: { promises: { lookup } },
    promises: { lookup },
  }
})

// vi.mock est hoisted avant toute déclaration — les classes sont inlinées dans
// la factory pour éviter la ReferenceError au hoist.

type MockWindow = { count: number; resetAt: number }
const mockStores = new Map<string, Map<string, MockWindow>>()

vi.mock('@upstash/ratelimit', () => {
  type Opts = { redis: unknown; limiter: { max: number; windowMs: number }; prefix: string }
  type Win = { count: number; resetAt: number }
  const stores = new Map<string, Map<string, Win>>()

  // Exposer le registre sur globalThis pour que afterEach puisse le vider.
  ;(globalThis as Record<string, unknown>).__rl_mock_stores = stores

  class Ratelimit {
    private max: number
    private windowMs: number
    private store: Map<string, Win>

    constructor(opts: Opts) {
      this.max = opts.limiter.max
      this.windowMs = opts.limiter.windowMs
      if (!stores.has(opts.prefix)) stores.set(opts.prefix, new Map())
      this.store = stores.get(opts.prefix)!
    }

    async limit(identifier: string) {
      const now = Date.now()
      const win = this.store.get(identifier)
      if (!win || win.resetAt <= now) {
        const resetAt = now + this.windowMs
        this.store.set(identifier, { count: 1, resetAt })
        return { success: true, remaining: this.max - 1, reset: resetAt, pending: Promise.resolve() }
      }
      if (win.count >= this.max) {
        return { success: false, remaining: 0, reset: win.resetAt, pending: Promise.resolve() }
      }
      win.count += 1
      return { success: true, remaining: this.max - win.count, reset: win.resetAt, pending: Promise.resolve() }
    }

    static slidingWindow(max: number, windowStr: string) {
      return { max, windowMs: parseInt(windowStr, 10) }
    }
  }

  return { Ratelimit }
})

vi.mock('@upstash/redis', () => {
  class Redis {
    constructor(_opts: { url: string; token: string }) {}
  }
  return { Redis }
})

// Env vars fictives pour activer le chemin Redis dans rate-limit.ts.
vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://test.upstash.io')
vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'test-token')

// -----------------------------------------------------------------------------

describe('assertSafeUrl', () => {
  it('accepts public https URLs', () => {
    const u = assertSafeUrl('https://example.com/path?q=1')
    expect(u.hostname).toBe('example.com')
  })

  it('accepts public http URLs', () => {
    const u = assertSafeUrl('http://example.com')
    expect(u.hostname).toBe('example.com')
  })

  it('rejects non-http schemes', () => {
    expect(() => assertSafeUrl('file:///etc/passwd')).toThrow(UnsafeUrlError)
    expect(() => assertSafeUrl('javascript:alert(1)')).toThrow(UnsafeUrlError)
    expect(() => assertSafeUrl('ftp://example.com')).toThrow(UnsafeUrlError)
  })

  it('rejects loopback literal hostnames', () => {
    for (const host of ['http://localhost/', 'http://127.0.0.1/']) {
      expect(() => assertSafeUrl(host)).toThrow(UnsafeUrlError)
    }
  })

  it('rejects RFC1918 private IPs', () => {
    for (const host of [
      'http://10.0.0.1/',
      'http://172.16.0.5/',
      'http://192.168.1.1/',
    ]) {
      expect(() => assertSafeUrl(host)).toThrow(UnsafeUrlError)
    }
  })

  it('rejects AWS metadata endpoint 169.254.169.254', () => {
    expect(() => assertSafeUrl('http://169.254.169.254/latest/')).toThrow(
      UnsafeUrlError,
    )
  })

  it('rejects IPv6 loopback and link-local', () => {
    expect(() => assertSafeUrl('http://[::1]/')).toThrow(UnsafeUrlError)
    expect(() => assertSafeUrl('http://[fe80::1]/')).toThrow(UnsafeUrlError)
  })

  it('rejects .local / .internal TLDs', () => {
    expect(() => assertSafeUrl('http://app.local/')).toThrow(UnsafeUrlError)
    expect(() => assertSafeUrl('http://api.internal/')).toThrow(UnsafeUrlError)
  })

  it('rejects malformed URLs', () => {
    expect(() => assertSafeUrl('not a url')).toThrow(UnsafeUrlError)
  })

  it('accepts public IP (not private)', () => {
    const u = assertSafeUrl('http://8.8.8.8/')
    expect(u.hostname).toBe('8.8.8.8')
  })
})

describe('assertSafeDnsUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws UnsafeUrlError when DNS resolves to a private IPv4', async () => {
    vi.mocked(dns.promises.lookup).mockResolvedValue(
      [{ address: '10.0.0.1', family: 4 }] as unknown as dns.LookupAddress,
    )
    const err = await assertSafeDnsUrl('https://evil-rebind.example.com/').catch(
      (e: unknown) => e,
    )
    expect(err).toBeInstanceOf(UnsafeUrlError)
    expect((err as UnsafeUrlError).reason).toBe('dns_resolves_private')
  })

  it('does not throw when DNS resolves to a public IP', async () => {
    vi.mocked(dns.promises.lookup).mockResolvedValueOnce(
      [{ address: '93.184.216.34', family: 4 }] as unknown as dns.LookupAddress,
    )
    await expect(
      assertSafeDnsUrl('https://example.com/'),
    ).resolves.toBeUndefined()
  })

  it('skips DNS resolution for a literal IP hostname', async () => {
    await expect(
      assertSafeDnsUrl('http://8.8.8.8/'),
    ).resolves.toBeUndefined()
    expect(dns.promises.lookup).not.toHaveBeenCalled()
  })

  it('does not throw UnsafeUrlError when lookup raises ENOTFOUND', async () => {
    const err = Object.assign(new Error('getaddrinfo ENOTFOUND no-such-host.example'), {
      code: 'ENOTFOUND',
    })
    vi.mocked(dns.promises.lookup).mockRejectedValueOnce(err)
    await expect(
      assertSafeDnsUrl('https://no-such-host.example/'),
    ).resolves.toBeUndefined()
  })
})

describe('rateLimit', () => {
  afterEach(() => {
    __resetRateLimits()
    // Vider les stores du mock pour isoler les tests
    const stores = (globalThis as Record<string, unknown>).__rl_mock_stores
    if (stores instanceof Map) stores.clear()
    mockStores.clear()
  })

  it('allows under the limit', async () => {
    const cfg = { name: 'test1', max: 3, windowMs: 60_000 }
    const r1 = await rateLimit(cfg, 'user-a')
    const r2 = await rateLimit(cfg, 'user-a')
    const r3 = await rateLimit(cfg, 'user-a')
    expect(r1.allowed).toBe(true)
    expect(r2.allowed).toBe(true)
    expect(r3.allowed).toBe(true)
    expect(r3.remaining).toBe(0)
  })

  it('blocks when over the limit', async () => {
    const cfg = { name: 'test2', max: 2, windowMs: 60_000 }
    await rateLimit(cfg, 'user-b')
    await rateLimit(cfg, 'user-b')
    const r3 = await rateLimit(cfg, 'user-b')
    expect(r3.allowed).toBe(false)
    expect(r3.retryAfterSeconds).toBeGreaterThan(0)
  })

  it('isolates identities', async () => {
    const cfg = { name: 'test3', max: 1, windowMs: 60_000 }
    const a = await rateLimit(cfg, 'alice')
    const b = await rateLimit(cfg, 'bob')
    expect(a.allowed).toBe(true)
    expect(b.allowed).toBe(true)
  })

  it('isolates bucket names', async () => {
    const burst = { name: 'burst', max: 1, windowMs: 60_000 }
    const daily = { name: 'daily', max: 10, windowMs: 86_400_000 }
    const a = await rateLimit(burst, 'alice')
    const b = await rateLimit(daily, 'alice')
    expect(a.allowed).toBe(true)
    expect(b.allowed).toBe(true)
    const c = await rateLimit(burst, 'alice')
    expect(c.allowed).toBe(false)
  })

  it('resets after window expires', async () => {
    const cfg = { name: 'test5', max: 1, windowMs: 50 }
    const r1 = await rateLimit(cfg, 'alice')
    const r2 = await rateLimit(cfg, 'alice')
    expect(r1.allowed).toBe(true)
    expect(r2.allowed).toBe(false)
    await new Promise((res) => setTimeout(res, 60))
    const r3 = await rateLimit(cfg, 'alice')
    expect(r3.allowed).toBe(true)
  })

  it('falls back gracefully when Redis is not configured', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '')
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '')
    __resetRateLimits()

    const cfg = { name: 'fallback', max: 1, windowMs: 60_000 }
    const r = await rateLimit(cfg, 'anyone')
    expect(r.allowed).toBe(true)
    expect(r.remaining).toBe(999)
    expect(r.retryAfterSeconds).toBe(0)

    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://test.upstash.io')
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'test-token')
  })
})
