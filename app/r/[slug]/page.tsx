import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { reports } from '@/lib/db/schema'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function PublicReportPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

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
