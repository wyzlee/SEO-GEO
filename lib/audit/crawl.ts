import crypto from 'node:crypto'
import * as cheerio from 'cheerio'
import { assertSafeDnsUrl, UnsafeUrlError } from '@/lib/security/url-guard'
import { logger } from '@/lib/observability/logger'
import type { CrawlSnapshot, SubPageSnapshot } from './types'

const USER_AGENT =
  'SEO-GEO-Audit/0.1 (+https://seo-geo-orcin.vercel.app; audit respectful, rate-limited)'
const DEFAULT_TIMEOUT_MS = 15_000
const MAX_SUB_PAGES = 20
const SUB_PAGES_CONCURRENCY = 4
const MAX_REDIRECTS = 5

/**
 * Fetch avec timeout et **validation SSRF à chaque redirect**.
 *
 * Pourquoi ne pas utiliser `redirect: 'follow'` natif : un site public peut
 * légitimement rediriger (http → https), mais un attaquant pourrait
 * configurer son serveur pour renvoyer `Location: http://169.254.169.254/`
 * (AWS metadata) ou `Location: http://localhost:6379/` (Redis interne) —
 * `fetch` suit silencieusement et expose l'infra interne.
 *
 * On fait le redirect manuellement : pour chaque `30x` on re-valide le
 * `Location` via `assertSafeDnsUrl` (bloque IPs privées, DNS rebinding).
 * Limite à 5 hops pour éviter les boucles.
 */
interface SafeFetchResult {
  response: Response
  finalUrl: string
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {},
): Promise<SafeFetchResult> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...init } = options
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    let currentUrl = url
    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      const res = await fetch(currentUrl, {
        ...init,
        signal: controller.signal,
        redirect: 'manual',
        headers: {
          'User-Agent': USER_AGENT,
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          ...init.headers,
        },
      })

      // 3xx avec Location → re-valider et continuer
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location')
        if (!location) return { response: res, finalUrl: currentUrl }
        if (hop >= MAX_REDIRECTS) {
          throw new UnsafeUrlError(
            `Trop de redirections (> ${MAX_REDIRECTS})`,
            'too_many_redirects',
          )
        }
        // Résoudre relativement à l'URL courante (301 Location: /new-path).
        const nextUrl = new URL(location, currentUrl).toString()
        // Re-valider : bloque redirect vers IP privée, DNS rebinding, etc.
        await assertSafeDnsUrl(nextUrl)
        currentUrl = nextUrl
        continue
      }
      return { response: res, finalUrl: currentUrl }
    }
    throw new UnsafeUrlError('Redirect loop', 'too_many_redirects')
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchText(
  url: string,
  timeoutMs?: number,
): Promise<string | null> {
  try {
    const { response } = await fetchWithTimeout(url, { timeoutMs })
    if (!response.ok) return null
    return await response.text()
  } catch {
    return null
  }
}

export async function fetchHtml(
  url: string,
  timeoutMs?: number,
): Promise<{
  html: string
  finalUrl: string
  status: number
  lastModified: string | null
}> {
  const { response, finalUrl } = await fetchWithTimeout(url, { timeoutMs })
  const html = await response.text()
  return {
    html,
    finalUrl,
    status: response.status,
    lastModified: response.headers.get('last-modified'),
  }
}

function hashContent(text: string): string {
  // Normalize whitespace so minor reformatting doesn't invalidate the hash
  const normalized = text.replace(/\s+/g, ' ').trim().toLowerCase()
  return crypto.createHash('sha256').update(normalized).digest('hex')
}

function extractSitemapUrls(sitemapXml: string, origin: string): string[] {
  const urls = new Set<string>()
  const locRegex = /<loc>([^<]+)<\/loc>/gi
  let match: RegExpExecArray | null
  while ((match = locRegex.exec(sitemapXml)) !== null) {
    const raw = match[1].trim()
    if (!raw) continue
    try {
      const u = new URL(raw, origin)
      if (u.origin !== origin) continue
      // Skip sub-sitemaps (we don't recurse V1.5) — they typically end in .xml
      if (u.pathname.endsWith('.xml')) continue
      urls.add(u.toString())
    } catch {
      // ignore malformed URL
    }
  }
  return [...urls]
}

async function fetchSubPage(url: string): Promise<SubPageSnapshot | null> {
  try {
    const { response } = await fetchWithTimeout(url, { timeoutMs: 10_000 })
    if (!response.ok) return null
    const html = await response.text()
    const $ = cheerio.load(html)
    const bodyText = $('body').text()
    return {
      url,
      status: response.status,
      html,
      lastModified: response.headers.get('last-modified'),
      contentHash: hashContent(bodyText),
    }
  } catch {
    return null
  }
}

async function fetchSubPages(urls: string[], max = MAX_SUB_PAGES): Promise<SubPageSnapshot[]> {
  const picked = urls.slice(0, max)
  const out: SubPageSnapshot[] = []
  for (let i = 0; i < picked.length; i += SUB_PAGES_CONCURRENCY) {
    const batch = picked.slice(i, i + SUB_PAGES_CONCURRENCY)
    const results = await Promise.all(batch.map(fetchSubPage))
    for (const r of results) if (r) out.push(r)
  }
  return out
}

export interface CrawlOptions {
  /** Max number of subpages to fetch from sitemap. 0 = skip subpage crawl entirely. */
  maxSubPages?: number
  /** Per-request timeout in ms. Flash passes 6_000 to keep total crawl < 15s. */
  timeoutMs?: number
}

export async function crawlUrl(
  targetUrl: string,
  opts: CrawlOptions = {},
): Promise<CrawlSnapshot> {
  await assertSafeDnsUrl(targetUrl)
  const maxSub = opts.maxSubPages ?? MAX_SUB_PAGES
  const timeoutMs = opts.timeoutMs
  const primary = await fetchHtml(targetUrl, timeoutMs)
  const origin = new URL(primary.finalUrl).origin

  const [robotsTxt, sitemapXml, llmsTxt, llmsFullTxt] = await Promise.all([
    fetchText(`${origin}/robots.txt`, timeoutMs),
    maxSub > 0 ? fetchText(`${origin}/sitemap.xml`, timeoutMs) : Promise.resolve(null),
    fetchText(`${origin}/llms.txt`, timeoutMs),
    fetchText(`${origin}/llms-full.txt`, timeoutMs),
  ])

  const $ = cheerio.load(primary.html)
  const primaryBodyHash = hashContent($('body').text())

  let subPages: SubPageSnapshot[] = []
  if (maxSub > 0 && sitemapXml) {
    const subUrls = extractSitemapUrls(sitemapXml, origin).filter(
      (u) => u !== primary.finalUrl,
    )
    if (subUrls.length > 0) {
      subPages = await fetchSubPages(subUrls, maxSub)
    }
  }

  return {
    html: primary.html,
    finalUrl: primary.finalUrl,
    status: primary.status,
    robotsTxt,
    sitemapXml,
    llmsTxt,
    llmsFullTxt,
    lastModified: primary.lastModified,
    contentHash: primaryBodyHash,
    subPages,
  }
}

// ---------------------------------------------------------------------------
// Multi-page BFS crawl (V1.5 — mode full URL)
// ---------------------------------------------------------------------------

/** Extensions d'assets à ignorer pendant le BFS */
const ASSET_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|avif|svg|ico|woff|woff2|ttf|eot|mp4|mp3|pdf|zip|gz|css|js|json|xml|rss|atom|txt|doc|docx|xls|xlsx|ppt|pptx)(\?|$)/i

/** Normalise une URL pour le BFS : retire fragment, trailing slash (sauf root) */
function normalizeUrlForBfs(href: string, base: string): string | null {
  try {
    const u = new URL(href, base)
    // Supprimer le fragment
    u.hash = ''
    // Normaliser le pathname (trailing slash sauf root)
    if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
      u.pathname = u.pathname.slice(0, -1)
    }
    return u.toString()
  } catch {
    return null
  }
}

/** Parser minimal robots.txt — extrait les Disallow pour User-agent: * */
function parseRobotsDisallowed(robotsTxt: string | null): string[] {
  if (!robotsTxt) return []
  const lines = robotsTxt.split('\n').map((l) => l.trim())
  const disallowed: string[] = []
  let inStar = false
  for (const line of lines) {
    if (/^user-agent:\s*\*/i.test(line)) {
      inStar = true
      continue
    }
    if (/^user-agent:/i.test(line)) {
      inStar = false
      continue
    }
    if (inStar && /^disallow:/i.test(line)) {
      const path = line.replace(/^disallow:\s*/i, '').trim()
      if (path) disallowed.push(path)
    }
  }
  return disallowed
}

function isDisallowed(url: string, disallowed: string[]): boolean {
  try {
    const pathname = new URL(url).pathname
    return disallowed.some((d) => pathname.startsWith(d))
  } catch {
    return false
  }
}

/** Fetch BFS d'une page — retourne null si non-HTML ou erreur */
async function fetchBfsPage(
  url: string,
  globalSignal: AbortSignal,
): Promise<SubPageSnapshot | null> {
  // Vérifier le signal global AVANT le fetch (fetchWithTimeout crée son propre controller)
  if (globalSignal.aborted) return null
  try {
    const { response, finalUrl } = await fetchWithTimeout(url, {
      timeoutMs: 10_000,
    })
    // On capture même les erreurs HTTP (4xx/5xx) pour détecter les liens cassés
    const html = await response.text()

    // Skip si ce n'est pas du HTML
    const ct = response.headers.get('content-type') ?? ''
    if (!ct.includes('text/html') && !ct.includes('application/xhtml')) {
      return null
    }

    const $p = cheerio.load(html)
    const bodyText = $p('body').text().replace(/\s+/g, ' ').trim()
    const wordCount = bodyText ? bodyText.split(' ').filter(Boolean).length : 0
    const title = $p('head > title').first().text().trim() || undefined
    const h1 = $p('h1').first().text().trim() || undefined

    // Liens internes (mêmes origine + pathname, pas d'asset)
    const origin = new URL(finalUrl).origin
    const internalLinks: string[] = []
    $p('a[href]').each((_, el) => {
      const href = $p(el).attr('href') ?? ''
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return
      const norm = normalizeUrlForBfs(href, finalUrl)
      if (!norm) return
      try {
        const u = new URL(norm)
        if (u.origin !== origin) return
        if (ASSET_EXTENSIONS.test(u.pathname)) return
        internalLinks.push(norm)
      } catch {
        // ignore
      }
    })

    return {
      url: finalUrl,
      status: response.status,
      html,
      lastModified: response.headers.get('last-modified'),
      contentHash: hashContent(bodyText),
      title,
      h1,
      wordCount,
      internalLinks,
    }
  } catch {
    return null
  }
}

/**
 * Crawl multi-pages BFS jusqu'à `maxPages` (défaut 50).
 *
 * - Réutilise `fetchWithTimeout` avec validation SSRF à chaque hop.
 * - Concurrence limitée à 3 fetches simultanés (semaphore).
 * - Timeout global `timeoutMs` via AbortController.
 * - Filtre les assets + URLs bloquées par robots.txt.
 */
export async function crawlMultiPage(
  startUrl: string,
  robotsTxt: string | null,
  maxPages = 50,
  timeoutMs = 120_000,
): Promise<SubPageSnapshot[]> {
  const disallowed = parseRobotsDisallowed(robotsTxt)
  const origin = (() => {
    try { return new URL(startUrl).origin } catch { return '' }
  })()

  const globalController = new AbortController()
  const globalTimer = setTimeout(() => globalController.abort(), timeoutMs)

  const visited = new Set<string>()
  const queue: string[] = []
  const results: SubPageSnapshot[] = []

  // Normaliser et enqueue le startUrl
  const normalizedStart = normalizeUrlForBfs(startUrl, startUrl)
  if (normalizedStart) {
    queue.push(normalizedStart)
    visited.add(normalizedStart)
  }

  const CONCURRENCY = 3

  try {
    while (queue.length > 0 && results.length < maxPages) {
      if (globalController.signal.aborted) break

      // Prendre un batch de CONCURRENCY URLs
      const batch = queue.splice(0, CONCURRENCY)

      const batchResults = await Promise.all(
        batch.map((url) => fetchBfsPage(url, globalController.signal)),
      )

      for (let i = 0; i < batch.length; i++) {
        if (results.length >= maxPages) break
        const snap = batchResults[i]
        const url = batch[i]

        if (snap) {
          results.push(snap)
          logger.info('bfs.page.crawled', {
            url: snap.url,
            status: snap.status,
            wordCount: snap.wordCount ?? 0,
            index: results.length,
            total: maxPages,
          })

          // Enqueue les liens internes découverts
          for (const link of snap.internalLinks ?? []) {
            if (visited.has(link)) continue
            if (ASSET_EXTENSIONS.test(link)) continue
            try {
              const u = new URL(link)
              if (u.origin !== origin) continue
              if (isDisallowed(link, disallowed)) continue
            } catch {
              continue
            }
            visited.add(link)
            queue.push(link)
          }
        } else {
          // Page inaccessible — log mais ne pas crasher
          logger.warn('bfs.page.failed', {
            url,
            index: results.length,
          })
        }
      }
    }
  } finally {
    clearTimeout(globalTimer)
  }

  return results
}
