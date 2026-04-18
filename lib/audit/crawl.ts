import crypto from 'node:crypto'
import * as cheerio from 'cheerio'
import { assertSafeDnsUrl } from '@/lib/security/url-guard'
import type { CrawlSnapshot, SubPageSnapshot } from './types'

const USER_AGENT =
  'SEO-GEO-Audit/0.1 (+https://seo-geo-orcin.vercel.app; audit respectful, rate-limited)'
const DEFAULT_TIMEOUT_MS = 15_000
const MAX_SUB_PAGES = 20
const SUB_PAGES_CONCURRENCY = 4

async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...init } = options
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': USER_AGENT,
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        ...init.headers,
      },
    })
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchText(
  url: string,
  timeoutMs?: number,
): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(url, { timeoutMs })
    if (!res.ok) return null
    return await res.text()
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
  const res = await fetchWithTimeout(url, { timeoutMs })
  const html = await res.text()
  return {
    html,
    finalUrl: res.url || url,
    status: res.status,
    lastModified: res.headers.get('last-modified'),
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
    const res = await fetchWithTimeout(url, { timeoutMs: 10_000 })
    if (!res.ok) return null
    const html = await res.text()
    const $ = cheerio.load(html)
    const bodyText = $('body').text()
    return {
      url,
      status: res.status,
      html,
      lastModified: res.headers.get('last-modified'),
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
