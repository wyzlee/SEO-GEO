import { NextResponse } from 'next/server'
import { z } from 'zod'
import { runFlashAudit } from '@/lib/audit/flash'
import { assertSafeUrl, UnsafeUrlError } from '@/lib/security/url-guard'
import { rateLimit } from '@/lib/security/rate-limit'
import { getClientIp } from '@/lib/security/ip'

const FLASH_RATE_LIMIT = { name: 'audit.flash.ip', max: 5, windowMs: 3_600_000 }
const FLASH_TIMEOUT_MS = 15_000

const BodySchema = z.object({
  url: z.string().min(1),
})

export async function POST(req: Request) {
  const ip = getClientIp(req.headers)
  const rl = await rateLimit(FLASH_RATE_LIMIT, ip)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Trop de requêtes. Réessayez dans une heure.', retryAfterSeconds: rl.retryAfterSeconds },
      {
        status: 429,
        headers: {
          'Retry-After': String(rl.retryAfterSeconds),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(rl.resetAt / 1000)),
        },
      },
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 })
  }

  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'URL manquante' }, { status: 400 })
  }

  // Auto-prepend https:// if no scheme provided
  const raw = parsed.data.url.trim()
  const urlStr = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`

  let safeUrl: URL
  try {
    safeUrl = assertSafeUrl(urlStr)
  } catch (err) {
    if (err instanceof UnsafeUrlError) {
      return NextResponse.json(
        { error: `URL non autorisée : ${err.reason}` },
        { status: 400 },
      )
    }
    return NextResponse.json({ error: 'URL invalide' }, { status: 400 })
  }

  let result: Awaited<ReturnType<typeof runFlashAudit>>
  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), FLASH_TIMEOUT_MS),
    )
    result = await Promise.race([runFlashAudit(safeUrl.toString()), timeout])
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg === 'timeout') {
      return NextResponse.json(
        { error: 'Le site a mis trop de temps à répondre.' },
        { status: 504 },
      )
    }
    return NextResponse.json(
      { error: 'Erreur lors de l\'analyse. Vérifiez que le site est accessible.' },
      { status: 502 },
    )
  }

  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
      'X-RateLimit-Remaining': String(rl.remaining),
      'X-RateLimit-Reset': String(Math.ceil(rl.resetAt / 1000)),
    },
  })
}
