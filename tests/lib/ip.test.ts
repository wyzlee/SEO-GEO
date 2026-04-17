import { describe, expect, it } from 'vitest'
import { getClientIp } from '@/lib/security/ip'

function h(map: Record<string, string>): Headers {
  return new Headers(map)
}

describe('getClientIp', () => {
  it('returns first IP from x-forwarded-for', () => {
    expect(
      getClientIp(h({ 'x-forwarded-for': '203.0.113.42, 198.51.100.1' })),
    ).toBe('203.0.113.42')
  })

  it('trims whitespace from x-forwarded-for', () => {
    expect(
      getClientIp(h({ 'x-forwarded-for': '  203.0.113.42  ' })),
    ).toBe('203.0.113.42')
  })

  it('falls back to x-real-ip when x-forwarded-for absent', () => {
    expect(getClientIp(h({ 'x-real-ip': '198.51.100.1' }))).toBe('198.51.100.1')
  })

  it('falls back to cf-connecting-ip when others absent', () => {
    expect(getClientIp(h({ 'cf-connecting-ip': '2001:db8::1' }))).toBe(
      '2001:db8::1',
    )
  })

  it('returns "unknown" when no proxy headers present', () => {
    expect(getClientIp(h({}))).toBe('unknown')
  })

  it('prefers x-forwarded-for over x-real-ip', () => {
    expect(
      getClientIp(
        h({
          'x-forwarded-for': '203.0.113.42',
          'x-real-ip': '198.51.100.1',
        }),
      ),
    ).toBe('203.0.113.42')
  })
})
