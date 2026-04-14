import type { CrawlSnapshot } from './types'

const USER_AGENT =
  'SEO-GEO-Audit/0.1 (+https://seo-geo.wyzlee.cloud; audit respectful, rate-limited)'
const DEFAULT_TIMEOUT_MS = 15_000

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
}> {
  const res = await fetchWithTimeout(url)
  const html = await res.text()
  return { html, finalUrl: res.url || url, status: res.status }
}

export async function crawlUrl(targetUrl: string): Promise<CrawlSnapshot> {
  const primary = await fetchHtml(targetUrl)
  const origin = new URL(primary.finalUrl).origin

  const [robotsTxt, sitemapXml, llmsTxt] = await Promise.all([
    fetchText(`${origin}/robots.txt`),
    fetchText(`${origin}/sitemap.xml`),
    fetchText(`${origin}/llms.txt`),
  ])

  return {
    html: primary.html,
    finalUrl: primary.finalUrl,
    status: primary.status,
    robotsTxt,
    sitemapXml,
    llmsTxt,
  }
}
