import crypto from 'node:crypto'
import * as cheerio from 'cheerio'
import { assertSafeDnsUrl, UnsafeUrlError } from '@/lib/security/url-guard'
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
