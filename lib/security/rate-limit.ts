/**
 * In-memory sliding window rate limiter.
 *
 * Design : 2 tiers per endpoint
 *  - burst : max N requests per user in a short window (anti-spam)
 *  - daily : max N requests per organization per 24 h (quota hygiene)
 *
 * V1 : in-memory only (single-VPS setup is fine). V2 : plug Redis / Upstash
 * when horizontal scaling is needed.
 */

interface Window {
  count: number
  resetAt: number
}

const stores: Record<string, Map<string, Window>> = {}

function getStore(name: string): Map<string, Window> {
  if (!stores[name]) stores[name] = new Map()
  return stores[name]
}

export interface RateLimitConfig {
  /** Unique name of the limiter (used as bucket key). */
  name: string
  /** Max requests allowed within `windowMs`. */
  max: number
  /** Window duration in milliseconds. */
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  retryAfterSeconds: number
}

export function rateLimit(
  config: RateLimitConfig,
  identity: string,
): RateLimitResult {
  const store = getStore(config.name)
  const now = Date.now()
  const current = store.get(identity)

  if (!current || current.resetAt <= now) {
    const resetAt = now + config.windowMs
    store.set(identity, { count: 1, resetAt })
    return {
      allowed: true,
      remaining: config.max - 1,
      resetAt,
      retryAfterSeconds: 0,
    }
  }

  if (current.count >= config.max) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: current.resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    }
  }

  current.count += 1
  return {
    allowed: true,
    remaining: Math.max(0, config.max - current.count),
    resetAt: current.resetAt,
    retryAfterSeconds: 0,
  }
}

/**
 * Test-only reset helper. Not exported via index ; callers must import
 * from this file explicitly in unit tests.
 */
export function __resetRateLimits(): void {
  for (const key of Object.keys(stores)) delete stores[key]
}
