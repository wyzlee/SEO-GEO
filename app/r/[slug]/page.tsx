import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { reports } from '@/lib/db/schema'
import { getClientIp } from '@/lib/security/ip'
import { rateLimit } from '@/lib/security/rate-limit'
import { logger } from '@/lib/observability/logger'
import type { Metadata } from 'next'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

const PUBLIC_REPORT_LIMIT = {
  name: 'report.public.ip',
  max: 20,
  windowMs: 60_000,
}

export default async function PublicReportPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const ip = getClientIp(await headers())
  const rl = rateLimit(PUBLIC_REPORT_LIMIT, ip)
  if (!rl.allowed) {
    logger.warn('report.public.rate_limited', {
      ip_hash: ip.slice(0, 12),
      slug,
      retry_after_s: rl.retryAfterSeconds,
    })
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <h1
            className="text-3xl font-bold font-[family-name:var(--font-display)]"
            style={{ color: 'var(--color-text)' }}
          >
            Trop de requêtes
          </h1>
          <p
            className="mt-3 text-sm font-[family-name:var(--font-sans)]"
            style={{ color: 'var(--color-muted)' }}
          >
            Merci de patienter {rl.retryAfterSeconds} seconde
            {rl.retryAfterSeconds > 1 ? 's' : ''} avant de réessayer.
          </p>
        </div>
      </main>
    )
  }

  const rows = await db
    .select()
    .from(reports)
    .where(eq(reports.shareSlug, slug))
    .limit(1)

  if (!rows.length) notFound()
  const report = rows[0]

  if (report.shareExpiresAt && new Date(report.shareExpiresAt) < new Date()) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <h1
            className="text-3xl font-bold font-[family-name:var(--font-display)]"
            style={{ color: 'var(--color-text)' }}
          >
            Ce rapport n&apos;est plus disponible
          </h1>
          <p
            className="mt-3 text-sm font-[family-name:var(--font-sans)]"
            style={{ color: 'var(--color-muted)' }}
          >
            Le lien de partage a expiré. Contactez votre consultant pour obtenir
            une version mise à jour.
          </p>
        </div>
      </main>
    )
  }

  if (!report.contentHtml) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <p style={{ color: 'var(--color-muted)' }}>Rapport vide.</p>
      </main>
    )
  }

  return (
    <div
      // Rapport auto-contained : CSS embedded, fonts chargées, sanitized upstream.
      dangerouslySetInnerHTML={{ __html: report.contentHtml }}
    />
  )
}
