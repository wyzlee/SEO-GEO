import { NextResponse } from 'next/server'
import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { audits, reports } from '@/lib/db/schema'
import { authenticateAuto, AuthError } from '@/lib/auth/server'
import { PdfUnavailableError, buildPdfFilename, renderPdf } from '@/lib/report/pdf'
import { sanitizeReportDocument } from '@/lib/report/sanitize'
import { logger } from '@/lib/observability/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/audits/:id/report/pdf
 * Renvoie le rapport le plus récent de l'audit, rendu en PDF via Puppeteer.
 * Auth requis, scope org. 404 si pas de rapport. 503 si rendu indisponible.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  let ctx
  try {
    ctx = await authenticateAuto(request)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      )
    }
    throw error
  }

  const [audit] = await db
    .select({
      id: audits.id,
      clientName: audits.clientName,
      targetUrl: audits.targetUrl,
      finishedAt: audits.finishedAt,
    })
    .from(audits)
    .where(and(eq(audits.id, id), eq(audits.organizationId, ctx.organizationId)))
    .limit(1)
  if (!audit) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const [report] = await db
    .select({ contentHtml: reports.contentHtml })
    .from(reports)
    .where(eq(reports.auditId, id))
    .orderBy(desc(reports.generatedAt))
    .limit(1)
  if (!report?.contentHtml) {
    return NextResponse.json(
      { error: 'Aucun rapport généré pour cet audit' },
      { status: 404 },
    )
  }

  try {
    const pdf = await renderPdf({ html: sanitizeReportDocument(report.contentHtml) })
    const filename = buildPdfFilename(audit, audit.finishedAt)
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `attachment; filename="${filename}"`,
        'cache-control': 'private, no-store',
      },
    })
  } catch (error) {
    if (error instanceof PdfUnavailableError) {
      logger.warn('report.pdf.unavailable', {
        audit_id: id,
        error: error.message,
      })
      return NextResponse.json(
        {
          error:
            'PDF indisponible — utilisez le lien de partage HTML ou réessayez.',
        },
        { status: 503 },
      )
    }
    logger.error('report.pdf.failed', { audit_id: id, error })
    return NextResponse.json(
      { error: 'Erreur de rendu PDF' },
      { status: 500 },
    )
  }
}
