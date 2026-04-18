import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { logger } from '@/lib/observability/logger'

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

let _redis: Redis | null = null
const _limiters: Map<string, Ratelimit> = new Map()
let _prodMissingLogged = false

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null
  }
  if (!_redis) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  }
  return _redis
}

function getLimiter(config: RateLimitConfig): Ratelimit | null {
  const redis = getRedis()
  if (!redis) return null

  const key = `${config.name}:${config.max}:${config.windowMs}`
  if (!_limiters.has(key)) {
    _limiters.set(
      key,
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(config.max, `${config.windowMs}ms`),
        prefix: `rl:${config.name}`,
      }),
    )
  }
  return _limiters.get(key)!
}

export async function rateLimit(
  config: RateLimitConfig,
  identity: string,
): Promise<RateLimitResult> {
  const limiter = getLimiter(config)

  if (!limiter) {
    // Fail-closed en production : sans backend Redis, on ne peut pas
    // garantir le rate limiting cross-instances → on refuse la requête
    // plutôt que de laisser passer un burst. Log + Sentry via logger.error.
    if (process.env.NODE_ENV === 'production') {
      if (!_prodMissingLogged) {
        logger.error('rate_limit.redis_missing', {
          limiter: config.name,
          message:
            'UPSTASH_REDIS_REST_URL/TOKEN non configuré en prod — rate limiter fail-closed.',
        })
        _prodMissingLogged = true
      }
      return {
        allowed: false,
        remaining: 0,
        resetAt: Date.now() + config.windowMs,
        retryAfterSeconds: Math.ceil(config.windowMs / 1000),
      }
    }
    // Dev/test : passthrough (avec log.warn une seule fois pour signaler).
    if (!_prodMissingLogged) {
      logger.warn('rate_limit.passthrough', {
        limiter: config.name,
        env: process.env.NODE_ENV ?? 'unknown',
        note: 'Redis Upstash absent — rate limiter désactivé en dev/test.',
      })
      _prodMissingLogged = true
    }
    return { allowed: true, remaining: 999, resetAt: Date.now() + config.windowMs, retryAfterSeconds: 0 }
  }

  const result = await limiter.limit(identity)

  if (!result.success) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: result.reset,
      retryAfterSeconds: Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)),
    }
  }

  return {
    allowed: true,
    remaining: result.remaining,
    resetAt: result.reset,
    retryAfterSeconds: 0,
  }
}

/**
 * Test-only reset helper. Clears the singleton limiter cache.
 * Import explicitly from this file in unit tests.
 */
export function __resetRateLimits(): void {
  _limiters.clear()
  _redis = null
  _prodMissingLogged = false
}
