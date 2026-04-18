// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { __resetRateLimits } from '@/lib/security/rate-limit'

// Mock runFlashAudit
const flashMock = vi.fn()
vi.mock('@/lib/audit/flash', () => ({
  runFlashAudit: (url: string) => flashMock(url),
}))

// Mock assertSafeUrl
const assertSafeUrlMock = vi.fn()
vi.mock('@/lib/security/url-guard', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/security/url-guard')>()
  return {
    ...actual,
    assertSafeUrl: (url: string) => assertSafeUrlMock(url),
  }
})

// Mocks Upstash : rate-limit.ts doit fonctionner avec un compteur in-memory.
vi.mock('@upstash/ratelimit', () => {
  type Win = { count: number; resetAt: number }
  const stores = new Map<string, Map<string, Win>>()
  ;(globalThis as Record<string, unknown>).__flash_rl_stores = stores

  class Ratelimit {
    private max: number
    private windowMs: number
    private store: Map<string, Win>

    constructor(opts: { redis: unknown; limiter: { max: number; windowMs: number }; prefix: string }) {
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
  class Redis { constructor(_opts: { url: string; token: string }) {} }
  return { Redis }
})

vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://test.upstash.io')
vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'test-token')

const FLASH_RESULT = {
  url: 'https://example.com',
  score: 72,
  phases: {
    technical: { score: 8, scoreMax: 12, label: 'SEO Technique' },
    geo: { score: 14, scoreMax: 18, label: 'Visibilité IA' },
    structured_data: { score: 12, scoreMax: 15, label: 'Données structurées' },
    common_mistakes: { score: 4, scoreMax: 5, label: 'Erreurs courantes' },
  },
  topFindings: [],
  totalFindings: 0,
  analysedAt: new Date().toISOString(),
}

async function loadFlashRoute() {
  const mod = await import('@/app/api/audit/flash/route')
  return mod.POST
}

function buildRequest(body: unknown, opts: { ip?: string } = {}) {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (opts.ip) headers['x-forwarded-for'] = opts.ip
  return new Request('http://test.local/api/audit/flash', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

describe('POST /api/audit/flash', () => {
  beforeEach(() => {
    flashMock.mockReset()
    assertSafeUrlMock.mockReset()
    __resetRateLimits()
    const stores = (globalThis as Record<string, unknown>).__flash_rl_stores
    if (stores instanceof Map) stores.clear()

    // Default: safe URL returns a URL object, flash returns result
    assertSafeUrlMock.mockImplementation((url: string) => new URL(url))
    flashMock.mockResolvedValue(FLASH_RESULT)
  })

  afterEach(() => {
    __resetRateLimits()
    const stores = (globalThis as Record<string, unknown>).__flash_rl_stores
    if (stores instanceof Map) stores.clear()
  })

  it('returns 400 on invalid JSON', async () => {
    const POST = await loadFlashRoute()
    const req = new Request('http://test.local/api/audit/flash', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{bad-json',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when url is missing', async () => {
    const POST = await loadFlashRoute()
    const res = await POST(buildRequest({}))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBeTruthy()
  })

  it('auto-prepends https:// when no scheme provided', async () => {
    const POST = await loadFlashRoute()
    await POST(buildRequest({ url: 'example.com' }))
    expect(assertSafeUrlMock).toHaveBeenCalledWith('https://example.com')
  })

  it('preserves https:// when already present', async () => {
    const POST = await loadFlashRoute()
    await POST(buildRequest({ url: 'https://example.com' }))
    expect(assertSafeUrlMock).toHaveBeenCalledWith('https://example.com')
  })

  it('blocks SSRF via assertSafeUrl', async () => {
    const { UnsafeUrlError } = await import('@/lib/security/url-guard')
    assertSafeUrlMock.mockImplementation(() => {
      throw new UnsafeUrlError('Adresse IP privée', 'private_ipv4')
    })
    const POST = await loadFlashRoute()
    const res = await POST(buildRequest({ url: 'http://169.254.169.254' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/private_ipv4/)
    expect(flashMock).not.toHaveBeenCalled()
  })

  it('returns 200 with flash result on happy path', async () => {
    const POST = await loadFlashRoute()
    const res = await POST(buildRequest({ url: 'https://example.com' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.score).toBe(72)
    expect(json.phases).toBeDefined()
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    expect(res.headers.get('X-Robots-Tag')).toBe('noindex')
  })

  it('returns 504 when flash runner times out', async () => {
    flashMock.mockImplementation(
      () =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 0),
        ),
    )
    const POST = await loadFlashRoute()
    const res = await POST(buildRequest({ url: 'https://example.com' }))
    expect(res.status).toBe(504)
  })

  it('returns 502 when flash runner throws unexpected error', async () => {
    flashMock.mockRejectedValue(new Error('DNS lookup failed'))
    const POST = await loadFlashRoute()
    const res = await POST(buildRequest({ url: 'https://example.com' }))
    expect(res.status).toBe(502)
  })

  it('rate limits after 5 requests per IP', async () => {
    const POST = await loadFlashRoute()
    const ip = '1.2.3.100'

    for (let i = 0; i < 5; i++) {
      const res = await POST(buildRequest({ url: 'https://example.com' }, { ip }))
      expect(res.status).toBe(200)
    }

    const blocked = await POST(buildRequest({ url: 'https://example.com' }, { ip }))
    expect(blocked.status).toBe(429)
    const json = await blocked.json()
    expect(json.error).toBeTruthy()
    expect(blocked.headers.get('Retry-After')).toBeTruthy()
  })

  it('different IPs do not share rate limit buckets', async () => {
    const POST = await loadFlashRoute()

    for (let i = 0; i < 5; i++) {
      await POST(buildRequest({ url: 'https://example.com' }, { ip: '1.2.3.200' }))
    }

    // Different IP should still be allowed
    const res = await POST(buildRequest({ url: 'https://example.com' }, { ip: '1.2.3.201' }))
    expect(res.status).toBe(200)
  })
})
