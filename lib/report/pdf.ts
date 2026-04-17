/**
 * PDF renderer via Gotenberg (sidecar docker-compose).
 *
 * Architecture : l'app Next.js POST le HTML complet du rapport à
 * `${GOTENBERG_URL}/forms/chromium/convert/html`. Gotenberg lance un
 * Chromium headless dans son container, rend le HTML avec ses CSS
 * inline + fonts Google, et retourne un PDF stream.
 *
 * En dev, si `GOTENBERG_URL` n'est pas défini ou si le service ne répond
 * pas, `renderPdf` lève une `PdfUnavailableError` — les routes HTTP
 * peuvent alors retourner 503 avec un fallback vers le HTML.
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
  /** Marges en pouces. Défauts conservateurs pour A4. */
  marginTopInches?: number
  marginRightInches?: number
  marginBottomInches?: number
  marginLeftInches?: number
  /** Timeout (ms) pour la requête à Gotenberg. */
  timeoutMs?: number
}

/**
 * Convertit un HTML auto-contenu en PDF via Gotenberg.
 *
 * Contrat : le HTML doit embarquer ses styles (inline `<style>`) et ne pas
 * dépendre de ressources privées. Gotenberg charge les URLs externes
 * publiquement accessibles (Google Fonts, etc.) mais pas les ressources
 * derrière l'auth de l'app.
 */
export async function renderPdf(input: RenderPdfInput): Promise<Buffer> {
  const gotenbergUrl = process.env.GOTENBERG_URL
  if (!gotenbergUrl) {
    throw new PdfUnavailableError('GOTENBERG_URL not configured')
  }

  const endpoint = `${gotenbergUrl.replace(/\/$/, '')}/forms/chromium/convert/html`
  const filename = input.filename || 'index.html'
  const timeoutMs = input.timeoutMs ?? 30_000

  const form = new FormData()
  form.append(
    'files',
    new Blob([input.html], { type: 'text/html' }),
    filename,
  )
  // Marges en inches (défaut Gotenberg) — valeurs conservatrices pour A4.
  form.append(
    'marginTop',
    String(input.marginTopInches ?? 0.4),
  )
  form.append(
    'marginBottom',
    String(input.marginBottomInches ?? 0.4),
  )
  form.append(
    'marginLeft',
    String(input.marginLeftInches ?? 0.4),
  )
  form.append(
    'marginRight',
    String(input.marginRightInches ?? 0.4),
  )
  form.append('preferCssPageSize', 'false')
  // Attendre que les fonts Google soient chargées avant snapshot.
  form.append('waitDelay', '1s')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      body: form,
      signal: controller.signal,
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new PdfUnavailableError(
        `Gotenberg HTTP ${res.status}: ${text.slice(0, 200)}`,
      )
    }
    const arrayBuffer = await res.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (error) {
    if (error instanceof PdfUnavailableError) throw error
    if (
      error instanceof Error &&
      (error.name === 'AbortError' || error.message.includes('fetch failed'))
    ) {
      throw new PdfUnavailableError(
        `Gotenberg unreachable: ${error.message}`,
      )
    }
    throw error
  } finally {
    clearTimeout(timer)
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
