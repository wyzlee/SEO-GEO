import { describe, expect, it } from 'vitest'
import { __internal } from '@/lib/webhooks/dispatch'

describe('webhook signature', () => {
  it('produces deterministic HMAC-SHA256 signature with sha256= prefix', () => {
    const sig = __internal.signBody('supersecret', '{"hello":"world"}')
    expect(sig.startsWith('sha256=')).toBe(true)
    // Deterministic : same input = same output
    const sig2 = __internal.signBody('supersecret', '{"hello":"world"}')
    expect(sig).toBe(sig2)
  })

  it('signatures differ when secret differs', () => {
    const a = __internal.signBody('secret-a', '{}')
    const b = __internal.signBody('secret-b', '{}')
    expect(a).not.toBe(b)
  })

  it('signatures differ when body differs', () => {
    const a = __internal.signBody('s', '{"x":1}')
    const b = __internal.signBody('s', '{"x":2}')
    expect(a).not.toBe(b)
  })
})

describe('hashHost', () => {
  it('hashes valid URL host deterministically to 12 hex chars', () => {
    const a = __internal.hashHost('https://crm.acme.com/hook')
    const b = __internal.hashHost('https://crm.acme.com/different-path')
    expect(a).toBe(b) // same host, same hash
    expect(a).toMatch(/^[0-9a-f]{12}$/)
  })

  it('returns "invalid-url" for malformed URLs', () => {
    expect(__internal.hashHost('not-a-url')).toBe('invalid-url')
  })
})

describe('newEventId', () => {
  it('returns a UUID v4-shaped string', () => {
    const id = __internal.newEventId()
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
  })

  it('generates unique ids', () => {
    const a = __internal.newEventId()
    const b = __internal.newEventId()
    expect(a).not.toBe(b)
  })
})
