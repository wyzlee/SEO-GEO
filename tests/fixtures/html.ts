/**
 * Fixtures HTML réutilisables pour les tests de phases d'audit.
 *
 * Chaque fixture décrit un cas canonique (site parfait, meta manquants,
 * SPA vide, etc.) pour éviter de dupliquer du HTML inline dans chaque
 * test. Utiliser via `makeCrawlSnapshot(fixture)`.
 */

export const PERFECT_HTML = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Wyzlee — SEO & GEO audit</title>
  <meta name="description" content="Audit SEO & GEO 2026 : 11 phases, score 100pt, rapport FR.">
  <link rel="canonical" href="https://wyzlee.com/">
  <meta property="og:title" content="Wyzlee — SEO & GEO audit">
  <meta property="og:description" content="Audit SEO & GEO 2026.">
  <meta property="og:url" content="https://wyzlee.com/">
  <meta property="og:image" content="https://wyzlee.com/og.png">
  <meta property="og:locale" content="fr_FR">
  <meta name="twitter:card" content="summary_large_image">
  <script type="application/ld+json">{
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Wyzlee",
    "url": "https://wyzlee.com/",
    "sameAs": ["https://www.linkedin.com/company/wyzlee"]
  }</script>
</head>
<body>
  <header><nav><a href="/">Home</a><a href="/blog">Blog</a></nav></header>
  <main>
    <h1>Audit SEO & GEO 2026</h1>
    <h2>11 phases</h2>
    <p>Nous auditons votre site avec une méthodologie <strong>jargon-free</strong>.</p>
    <h2>Résultats</h2>
    <p>Score sur 100 avec recommandations priorisées.</p>
  </main>
  <footer>© 2026 Wyzlee</footer>
</body>
</html>`

export const MISSING_META_HTML = `<!doctype html>
<html>
<head><title>Page</title></head>
<body><h1>x</h1></body>
</html>`

export const SPA_EMPTY_HTML = `<!doctype html>
<html>
<head><title>App</title></head>
<body><div id="root"></div><script src="/app.js"></script></body>
</html>`

export const NOINDEX_HTML = `<!doctype html>
<html>
<head>
  <title>Hidden</title>
  <meta name="robots" content="noindex, nofollow">
</head>
<body><p>x</p></body>
</html>`

export const MIXED_CONTENT_HTML = `<!doctype html>
<html>
<head><title>Mixed</title></head>
<body>
  <img src="http://insecure.example/logo.png">
  <script src="http://insecure.example/a.js"></script>
</body>
</html>`

export const ROBOTS_TXT_BASIC = `User-agent: *
Allow: /
Sitemap: https://example.com/sitemap.xml`

export const SITEMAP_XML_BASIC = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://example.com/</loc></url>
  <url><loc>https://example.com/blog</loc></url>
</urlset>`

export const LLMS_TXT_BASIC = `# Wyzlee
> Audit SEO et GEO 2026.

## Produits
- Audit SEO
- Audit GEO`

/**
 * Construit un CrawlSnapshot minimaliste à partir d'une fixture HTML.
 * Le type CrawlSnapshot vient de `lib/audit/types` — on évite l'import
 * direct pour garder le fichier agnostique et utilisable en standalone.
 */
export function makeCrawlSnapshot(overrides: Partial<CrawlSnapshotLike> = {}): CrawlSnapshotLike {
  return {
    html: PERFECT_HTML,
    finalUrl: 'https://example.com/',
    status: 200,
    robotsTxt: ROBOTS_TXT_BASIC,
    sitemapXml: SITEMAP_XML_BASIC,
    llmsTxt: LLMS_TXT_BASIC,
    llmsFullTxt: null,
    lastModified: null,
    contentHash: 'abcdef1234567890',
    subPages: [],
    ...overrides,
  }
}

export interface CrawlSnapshotLike {
  html: string
  finalUrl: string
  status: number
  robotsTxt: string | null
  sitemapXml: string | null
  llmsTxt: string | null
  llmsFullTxt: string | null
  lastModified: string | null
  contentHash: string
  subPages: Array<{
    url: string
    status: number
    html: string
    lastModified: string | null
    contentHash: string
  }>
}
