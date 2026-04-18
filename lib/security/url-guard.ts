/**
 * SSRF guard for user-provided URLs.
 *
 * Blocks hostnames that resolve to loopback, private RFC1918 ranges, link-local,
 * cloud metadata endpoints, and non-HTTP(S) schemes. Applied at audit creation
 * time — downstream crawler already follows redirects, so we only validate the
 * initial URL ; a malicious redirect chain to private space is a separate
 * concern addressed via the crawler fetch options (abort signal + timeout).
 *
 * assertSafeDnsUrl extends assertSafeUrl with actual DNS resolution to guard
 * against DNS rebinding attacks (public hostname resolving to a private IP).
 */

import dns from 'node:dns'

export class UnsafeUrlError extends Error {
  constructor(
    message: string,
    public readonly reason: string,
  ) {
    super(message)
    this.name = 'UnsafeUrlError'
  }
}

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])

// Literal addresses that must always be rejected (case-insensitive hostname match).
const BLOCKED_HOSTS = new Set([
  'localhost',
  'ip6-localhost',
  '0.0.0.0',
  '::',
  '::1',
])

const PRIVATE_IPV4_RANGES: Array<[number, number]> = [
  // 10.0.0.0/8
  [0x0a000000, 0x0affffff],
  // 172.16.0.0/12
  [0xac100000, 0xac1fffff],
  // 192.168.0.0/16
  [0xc0a80000, 0xc0a8ffff],
  // 127.0.0.0/8 (loopback)
  [0x7f000000, 0x7fffffff],
  // 169.254.0.0/16 (link-local, includes AWS/GCP metadata 169.254.169.254)
  [0xa9fe0000, 0xa9feffff],
  // 100.64.0.0/10 (carrier-grade NAT)
  [0x64400000, 0x647fffff],
  // 0.0.0.0/8
  [0x00000000, 0x00ffffff],
]

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.')
  if (parts.length !== 4) return null
  let n = 0
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null
    const v = Number.parseInt(p, 10)
    if (v < 0 || v > 255) return null
    n = (n << 8) + v
  }
  return n >>> 0
}

function isPrivateIpv4(ip: string): boolean {
  const n = ipv4ToInt(ip)
  if (n === null) return false
  return PRIVATE_IPV4_RANGES.some(([lo, hi]) => n >= lo && n <= hi)
}

function isPrivateIpv6(host: string): boolean {
  // Lightweight check : ::1, fc00::/7 (unique local), fe80::/10 (link-local)
  const low = host.toLowerCase().replace(/^\[|\]$/g, '')
  if (low === '::1' || low === '::') return true
  if (/^fc|^fd/i.test(low)) return true
  if (/^fe[89ab]/i.test(low)) return true
  return false
}

export function assertSafeUrl(input: string): URL {
  let url: URL
  try {
    url = new URL(input)
  } catch {
    throw new UnsafeUrlError('URL malformée', 'invalid_url')
  }
  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    throw new UnsafeUrlError(
      `Protocole non supporté : ${url.protocol}`,
      'protocol_not_allowed',
    )
  }
  const host = url.hostname.toLowerCase()
  if (!host) {
    throw new UnsafeUrlError('Hostname manquant', 'empty_host')
  }
  if (BLOCKED_HOSTS.has(host)) {
    throw new UnsafeUrlError(
      `Hostname interdit : ${host}`,
      'blocked_host',
    )
  }
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host) && isPrivateIpv4(host)) {
    throw new UnsafeUrlError(
      `Adresse IP privée / réservée : ${host}`,
      'private_ipv4',
    )
  }
  if (host.includes(':') && isPrivateIpv6(host)) {
    throw new UnsafeUrlError(
      `Adresse IPv6 privée / link-local : ${host}`,
      'private_ipv6',
    )
  }
  // Bonnes pratiques : bloquer les suffixes .local / .internal (DNS interne)
  if (/\.(local|internal|localhost)$/i.test(host)) {
    throw new UnsafeUrlError(
      `TLD interne interdit : ${host}`,
      'internal_tld',
    )
  }
  return url
}

/**
 * DNS-aware SSRF guard. Calls assertSafeUrl first (string checks), then
 * resolves the hostname via DNS and verifies that no resolved address is
 * private/reserved — preventing DNS rebinding attacks.
 *
 * If dns.promises.lookup throws (ENOTFOUND, ETIMEDOUT, etc.) we let it pass :
 * the error will surface at HTTP fetch time with a more actionable message.
 */
export async function assertSafeDnsUrl(input: string): Promise<void> {
  // Run all string-based checks first (scheme, blocked hosts, literal IPs).
  // assertSafeUrl already handles literal IPv4 and IPv6 private addresses.
  assertSafeUrl(input)

  const url = new URL(input)
  const host = url.hostname.toLowerCase()

  // Skip DNS resolution for literal IP addresses — already validated above.
  const isLiteralIpv4 = /^\d+\.\d+\.\d+\.\d+$/.test(host)
  const isLiteralIpv6 = host.includes(':')
  if (isLiteralIpv4 || isLiteralIpv6) return

  // Resolve all addresses for the hostname.
  let addresses: dns.LookupAddress[]
  try {
    addresses = await dns.promises.lookup(host, { all: true })
  } catch {
    // DNS errors (ENOTFOUND, ETIMEDOUT, …) — let the HTTP layer handle them.
    return
  }

  for (const { address, family } of addresses) {
    if (BLOCKED_HOSTS.has(address)) {
      throw new UnsafeUrlError(
        'DNS résout vers une adresse privée/réservée',
        'dns_resolves_private',
      )
    }
    if (family === 4 && isPrivateIpv4(address)) {
      throw new UnsafeUrlError(
        'DNS résout vers une adresse privée/réservée',
        'dns_resolves_private',
      )
    }
    if (family === 6 && isPrivateIpv6(address)) {
      throw new UnsafeUrlError(
        'DNS résout vers une adresse privée/réservée',
        'dns_resolves_private',
      )
    }
  }
}
