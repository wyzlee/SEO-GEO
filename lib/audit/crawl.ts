import crypto from 'node:crypto'
import * as cheerio from 'cheerio'
import type { CrawlSnapshot, SubPageSnapshot } from './types'

const USER_AGENT =
  'SEO-GEO-Audit/0.1 (+https://seo-geo.wyzlee.cloud; audit respectful, rate-limited)'
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

export async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(url)
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

export async function fetchHtml(url: string): Promise<{
  html: string
  finalUrl: string
  status: number
  lastModified: string | null
}> {
  const res = await fetchWithTimeout(url)
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

async function fetchSubPages(urls: string[]): Promise<SubPageSnapshot[]> {
  const picked = urls.slice(0, MAX_SUB_PAGES)
  const out: SubPageSnapshot[] = []
  for (let i = 0; i < picked.length; i += SUB_PAGES_CONCURRENCY) {
    const batch = picked.slice(i, i + SUB_PAGES_CONCURRENCY)
    const results = await Promise.all(batch.map(fetchSubPage))
    for (const r of results) if (r) out.push(r)
  }
  return out
}

export async function crawlUrl(targetUrl: string): Promise<CrawlSnapshot> {
  const primary = await fetchHtml(targetUrl)
  const origin = new URL(primary.finalUrl).origin

  const [robotsTxt, sitemapXml, llmsTxt, llmsFullTxt] = await Promise.all([
    fetchText(`${origin}/robots.txt`),
    fetchText(`${origin}/sitemap.xml`),
    fetchText(`${origin}/llms.txt`),
    fetchText(`${origin}/llms-full.txt`),
  ])

  const $ = cheerio.load(primary.html)
  const primaryBodyHash = hashContent($('body').text())

  const subUrls = sitemapXml
    ? extractSitemapUrls(sitemapXml, origin).filter(
        (u) => u !== primary.finalUrl,
      )
    : []
  const subPages = subUrls.length > 0 ? await fetchSubPages(subUrls) : []

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
