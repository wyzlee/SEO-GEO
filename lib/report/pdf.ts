/**
 * PDF renderer via Puppeteer + @sparticuz/chromium (Vercel-native).
 *
 * Le binaire Chromium est téléchargé par @sparticuz/chromium au premier cold
 * start (~50 MB). En local, définir CHROMIUM_PATH pour pointer vers Chrome.
 *
 * Contrainte Vercel : maxDuration ≥ 60s, memory ≥ 2048 MB (vercel.json).
 */

export class PdfUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PdfUnavailableError'
  }
}

export interface RenderPdfInput {
  html: string
  filename?: string
  /** Timeout (ms) pour la génération. Défaut : 45s. */
  timeoutMs?: number
}

export async function renderPdf(input: RenderPdfInput): Promise<Buffer> {
  let chromium: typeof import('@sparticuz/chromium')
  let puppeteer: typeof import('puppeteer-core')

  try {
    chromium = await import('@sparticuz/chromium')
    puppeteer = await import('puppeteer-core')
  } catch (importErr) {
    throw new PdfUnavailableError(
      `puppeteer-core or @sparticuz/chromium not installed: ${importErr instanceof Error ? importErr.message : String(importErr)}`,
    )
  }

  const timeoutMs = input.timeoutMs ?? 45_000

  let browser: import('puppeteer-core').Browser | null = null
  try {
    // CHROMIUM_PATH : chemin local (dev). CHROMIUM_DOWNLOAD_URL : URL GitHub
    // releases pour Vercel Hobby (le binaire 61MB dépasse la limite 50MB).
    const executablePath =
      process.env.CHROMIUM_PATH ??
      (await chromium.default.executablePath(process.env.CHROMIUM_DOWNLOAD_URL))

    browser = await puppeteer.default.launch({
      args: chromium.default.args,
      executablePath,
      // headless: chromium.default.headless préféré à 'shell' (deprecated puppeteer v24)
      headless: (chromium.default as { headless?: boolean | 'shell' }).headless ?? true,
    })

    const page = await browser.newPage()
    await page.setContent(input.html, {
      waitUntil: 'load',
      timeout: timeoutMs,
    })
    await page.evaluate(() => document.fonts.ready)

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        bottom: '20mm',
        left: '15mm',
        right: '15mm',
      },
    })

    return Buffer.from(pdfBuffer)
  } catch (err) {
    if (err instanceof PdfUnavailableError) throw err
    const detail = err instanceof Error ? err.message : String(err)
    throw new PdfUnavailableError(`PDF generation failed: ${detail}`)
  } finally {
    if (browser) await browser.close().catch(() => null)
  }
}

export function buildPdfFilename(
  audit: { clientName?: string | null; targetUrl?: string | null; id: string },
  finishedAt?: Date | null,
): string {
  const base =
    audit.clientName ||
    (audit.targetUrl
      ? audit.targetUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
      : audit.id.slice(0, 8))
  const slug = base
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  const date = (finishedAt ?? new Date()).toISOString().slice(0, 10)
  return `audit-seo-geo-${slug}-${date}.pdf`
}
