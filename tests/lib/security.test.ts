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
    default: {
      promises: { lookup },
    },
    promises: { lookup },
  }
})

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
  })

  it('allows under the limit', () => {
    const cfg = { name: 'test1', max: 3, windowMs: 60_000 }
    const r1 = rateLimit(cfg, 'user-a')
    const r2 = rateLimit(cfg, 'user-a')
    const r3 = rateLimit(cfg, 'user-a')
    expect(r1.allowed).toBe(true)
    expect(r2.allowed).toBe(true)
    expect(r3.allowed).toBe(true)
    expect(r3.remaining).toBe(0)
  })

  it('blocks when over the limit', () => {
    const cfg = { name: 'test2', max: 2, windowMs: 60_000 }
    rateLimit(cfg, 'user-b')
    rateLimit(cfg, 'user-b')
    const r3 = rateLimit(cfg, 'user-b')
    expect(r3.allowed).toBe(false)
    expect(r3.retryAfterSeconds).toBeGreaterThan(0)
  })

  it('isolates identities', () => {
    const cfg = { name: 'test3', max: 1, windowMs: 60_000 }
    const a = rateLimit(cfg, 'alice')
    const b = rateLimit(cfg, 'bob')
    expect(a.allowed).toBe(true)
    expect(b.allowed).toBe(true)
  })

  it('isolates bucket names', () => {
    const burst = { name: 'burst', max: 1, windowMs: 60_000 }
    const daily = { name: 'daily', max: 10, windowMs: 86_400_000 }
    const a = rateLimit(burst, 'alice')
    const b = rateLimit(daily, 'alice')
    expect(a.allowed).toBe(true)
    expect(b.allowed).toBe(true)
    const c = rateLimit(burst, 'alice')
    expect(c.allowed).toBe(false)
  })

  it('resets after window expires', async () => {
    const cfg = { name: 'test5', max: 1, windowMs: 50 }
    const r1 = rateLimit(cfg, 'alice')
    const r2 = rateLimit(cfg, 'alice')
    expect(r1.allowed).toBe(true)
    expect(r2.allowed).toBe(false)
    await new Promise((res) => setTimeout(res, 60))
    const r3 = rateLimit(cfg, 'alice')
    expect(r3.allowed).toBe(true)
  })
})
