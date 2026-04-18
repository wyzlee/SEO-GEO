import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { unstable_cache } from 'next/cache'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { reports } from '@/lib/db/schema'
import { getClientIp } from '@/lib/security/ip'
import { rateLimit } from '@/lib/security/rate-limit'
import { logger } from '@/lib/observability/logger'
import { sanitizeReportDocument } from '@/lib/report/sanitize'
import type { Metadata } from 'next'

export const runtime = 'nodejs'
// force-dynamic requis : headers() pour rate-limit IP (non compatible ISR).
// La DB query est cachée via unstable_cache pour réduire la charge.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

const PUBLIC_REPORT_LIMIT = {
  name: 'report.public.ip',
  max: 20,
  windowMs: 60_000,
}

const getReport = unstable_cache(
  async (slug: string) => {
    const rows = await db
      .select()
      .from(reports)
      .where(eq(reports.shareSlug, slug))
      .limit(1)
    return rows[0] ?? null
  },
  ['public-report'],
  { revalidate: 3600, tags: ['public-report'] },
)

export default async function PublicReportPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const ip = getClientIp(await headers())
  const rl = await rateLimit(PUBLIC_REPORT_LIMIT, ip)
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

  const report = await getReport(slug)
  if (!report) notFound()

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

  // Le HTML est généré server-side avec escapeHtml() à chaque frontière
  // user-data, mais on applique DOMPurify en défense en profondeur pour
  // bloquer tout <script>/handler inline qui aurait échappé.
  const safeHtml = sanitizeReportDocument(report.contentHtml)

  return (
    <div
      // Rapport auto-contained : CSS embedded, fonts chargées via Google Fonts.
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  )
}
