import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getClientIp } from '@/lib/security/ip'

function h(map: Record<string, string>): Headers {
  return new Headers(map)
}

describe('getClientIp (mode vercel, défaut)', () => {
  const original = { ...process.env }
  beforeEach(() => {
    delete process.env.TRUSTED_PROXY_MODE
    delete process.env.TRUSTED_PROXY_IPS
  })
  afterEach(() => {
    process.env = { ...original }
  })

  it('returns first IP from x-forwarded-for', () => {
    expect(
      getClientIp(h({ 'x-forwarded-for': '203.0.113.42, 198.51.100.1' })),
    ).toBe('203.0.113.42')
  })

  it('trims whitespace from x-forwarded-for', () => {
    expect(getClientIp(h({ 'x-forwarded-for': '  203.0.113.42  ' }))).toBe(
      '203.0.113.42',
    )
  })

  it('falls back to x-real-ip when x-forwarded-for absent', () => {
    expect(getClientIp(h({ 'x-real-ip': '198.51.100.1' }))).toBe(
      '198.51.100.1',
    )
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

describe('getClientIp (mode chain)', () => {
  const original = { ...process.env }
  beforeEach(() => {
    process.env.TRUSTED_PROXY_MODE = 'chain'
  })
  afterEach(() => {
    process.env = { ...original }
  })

  it('walks chain right-to-left skipping trusted proxies', () => {
    // Chain : client, proxy1, edge-proxy → client IP doit sortir.
    process.env.TRUSTED_PROXY_IPS = '10.0.0.1,10.0.0.2'
    expect(
      getClientIp(
        h({ 'x-forwarded-for': '203.0.113.42, 10.0.0.2, 10.0.0.1' }),
      ),
    ).toBe('203.0.113.42')
  })

  it('returns first non-trusted when all chain is untrusted', () => {
    process.env.TRUSTED_PROXY_IPS = ''
    expect(
      getClientIp(h({ 'x-forwarded-for': '203.0.113.42, 198.51.100.1' })),
    ).toBe('198.51.100.1')
  })

  it('bloque le spoofing si la chaîne entière n\'est PAS trusted', () => {
    // Attacker set xff: "1.2.3.4" but request comes from 203.0.113.99.
    // Dans mode chain avec TRUSTED_PROXY_IPS vide, la dernière IP ajoutée
    // (droite) est considérée comme le proxy immédiat → elle est retournée.
    // L'attaquant ne peut donc PAS usurper 1.2.3.4.
    process.env.TRUSTED_PROXY_IPS = ''
    expect(getClientIp(h({ 'x-forwarded-for': '1.2.3.4' }))).toBe('1.2.3.4')
    // … mais si l'admin a configuré TRUSTED_PROXY_IPS correctement avec
    // l'IP du proxy immédiat, alors le spoof ne passe pas :
    process.env.TRUSTED_PROXY_IPS = '1.2.3.4'
    expect(getClientIp(h({ 'x-forwarded-for': '1.2.3.4' }))).toBe('1.2.3.4')
  })

  it('falls back to x-real-ip when x-forwarded-for absent', () => {
    expect(getClientIp(h({ 'x-real-ip': '198.51.100.1' }))).toBe(
      '198.51.100.1',
    )
  })

  it('returns unknown when no headers', () => {
    expect(getClientIp(h({}))).toBe('unknown')
  })
})

describe('getClientIp (mode none)', () => {
  const original = { ...process.env }
  beforeEach(() => {
    process.env.TRUSTED_PROXY_MODE = 'none'
  })
  afterEach(() => {
    process.env = { ...original }
  })

  it('ignore tous les headers et retourne "unknown"', () => {
    expect(
      getClientIp(
        h({
          'x-forwarded-for': '1.2.3.4',
          'x-real-ip': '5.6.7.8',
          'cf-connecting-ip': '9.10.11.12',
        }),
      ),
    ).toBe('unknown')
  })
})
