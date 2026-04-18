import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { reports, audits } from '@/lib/db/schema'
import {
  PdfUnavailableError,
  buildPdfFilename,
  renderPdf,
} from '@/lib/report/pdf'
import { getClientIp } from '@/lib/security/ip'
import { rateLimit } from '@/lib/security/rate-limit'
import { logger } from '@/lib/observability/logger'

const PDF_LIMIT = {
  name: 'report.public.pdf.ip',
  max: 10,
  windowMs: 60_000,
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /r/:slug/pdf — équivalent PDF du rapport partagé public.
 * Vérifie `shareExpiresAt` comme `/r/:slug`. Rate-limit IP à prévoir en Vague 2.5.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  const ip = getClientIp(request.headers)
  const rl = await rateLimit(PDF_LIMIT, ip)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: {
          'retry-after': String(rl.retryAfterSeconds),
        },
      },
    )
  }

  const [report] = await db
    .select({
      contentHtml: reports.contentHtml,
      shareExpiresAt: reports.shareExpiresAt,
      auditId: reports.auditId,
    })
    .from(reports)
    .where(eq(reports.shareSlug, slug))
    .limit(1)

  if (!report) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (report.shareExpiresAt && new Date(report.shareExpiresAt) < new Date()) {
    return NextResponse.json(
      { error: 'Lien expiré' },
      { status: 410 },
    )
  }
  if (!report.contentHtml) {
    return NextResponse.json({ error: 'Rapport vide' }, { status: 404 })
  }

  const [audit] = await db
    .select({
      id: audits.id,
      clientName: audits.clientName,
      targetUrl: audits.targetUrl,
      finishedAt: audits.finishedAt,
    })
    .from(audits)
    .where(eq(audits.id, report.auditId))
    .limit(1)

  try {
    const pdf = await renderPdf({ html: report.contentHtml })
    const filename = buildPdfFilename(
      audit ?? { id: report.auditId },
      audit?.finishedAt,
    )
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `attachment; filename="${filename}"`,
        'cache-control': 'public, max-age=300',
      },
    })
  } catch (error) {
    if (error instanceof PdfUnavailableError) {
      logger.warn('report.pdf.public.unavailable', {
        slug,
        error: error.message,
      })
      return NextResponse.json(
        { error: 'PDF indisponible — utilisez le lien HTML.' },
        { status: 503 },
      )
    }
    logger.error('report.pdf.public.failed', { slug, error })
    return NextResponse.json(
      { error: 'Erreur de rendu PDF' },
      { status: 500 },
    )
  }
}
