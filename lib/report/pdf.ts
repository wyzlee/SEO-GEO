/**
 * PDF renderer via Puppeteer + @sparticuz/chromium (Vercel-native).
 *
 * Remplace l'ancienne dépendance Gotenberg (Docker sidecar incompatible Vercel).
 * Le binaire Chromium est fourni par @sparticuz/chromium et téléchargé au
 * build par Vercel. En local, définir CHROMIUM_PATH pour pointer vers un
 * Chrome/Chromium installé.
 *
 * Contrainte Vercel : la fonction appelante doit déclarer maxDuration ≥ 30s
 * et memory ≥ 1024 MB (configurable dans vercel.json).
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
  /** Timeout (ms) pour la génération. Défaut : 30s. */
  timeoutMs?: number
}

/**
 * Convertit un HTML auto-contenu en PDF via Puppeteer.
 *
 * Contrat : le HTML doit embarquer ses styles (inline `<style>`). Les fonts
 * Google Fonts sont chargées via network pendant le rendu (waitUntil: networkidle0).
 */
export async function renderPdf(input: RenderPdfInput): Promise<Buffer> {
  let chromium: typeof import('@sparticuz/chromium')
  let puppeteer: typeof import('puppeteer-core')

  try {
    chromium = await import('@sparticuz/chromium')
    puppeteer = await import('puppeteer-core')
  } catch {
    throw new PdfUnavailableError('puppeteer-core or @sparticuz/chromium not available')
  }

  const timeoutMs = input.timeoutMs ?? 30_000

  // En local : utiliser CHROMIUM_PATH (Chrome installé).
  // Sur Vercel/Lambda : @sparticuz/chromium fournit le bon binaire.
  const executablePath =
    process.env.CHROMIUM_PATH || (await chromium.default.executablePath())

  let browser: import('puppeteer-core').Browser | null = null
  try {
    browser = await puppeteer.default.launch({
      args: chromium.default.args,
      executablePath,
      headless: true,
    })

    const page = await browser.newPage()
    await page.setContent(input.html, {
      waitUntil: 'networkidle0',
      timeout: timeoutMs,
    })

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
    throw new PdfUnavailableError(
      `PDF generation failed: ${err instanceof Error ? err.message : String(err)}`,
    )
  } finally {
    if (browser) await browser.close().catch(() => null)
  }
}

/**
 * Utilitaire : construit un nom de fichier PDF propre à partir de l'URL
 * cible (ou clientName). Remplace les caractères non alphanumériques par
 * `-` et tronque à 60 caractères.
 */
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
