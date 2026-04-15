/**
 * Phase 6 — Content Freshness (8 pts)
 *
 * V1.5 URL mode : dateModified JSON-LD + `<time>` + sitemap lastmod ;
 * phantom refresh (JSON-LD vs HTTP Last-Modified mismatch), site-wide
 * sitemap staleness, content diversity sur les subPages échantillonnées.
 */
import * as cheerio from 'cheerio'
import type { Finding, PhaseResult, CrawlSnapshot } from '../types'

const SCORE_MAX = 8
const PHASE_KEY = 'freshness' as const

interface CheckSpec {
  severity: Finding['severity']
  category: string
  title: string
  description: string
  recommendation: string
  pointsLost: number
  effort?: Finding['effort']
  metricValue?: string
  metricTarget?: string
}

type JsonLdObject = Record<string, unknown>

function extractFlatJsonLd(html: string): JsonLdObject[] {
  const $ = cheerio.load(html)
  const out: JsonLdObject[] = []
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const visit = (node: unknown) => {
        if (!node || typeof node !== 'object') return
        if (Array.isArray(node)) return node.forEach(visit)
        const o = node as JsonLdObject
        if (Array.isArray(o['@graph'])) return (o['@graph'] as unknown[]).forEach(visit)
        out.push(o)
      }
      visit(JSON.parse($(el).text().trim()))
    } catch {
      /* ignore */
    }
  })
  return out
}

function parseDate(raw: unknown): Date | null {
  if (!raw || typeof raw !== 'string') return null
  const d = new Date(raw)
  return isNaN(d.getTime()) ? null : d
}

function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
}

function classifyPage(url: string, $: cheerio.CheerioAPI): {
  kind: 'blog' | 'product' | 'evergreen' | 'landing'
  tolerance: number // days before we flag
} {
  if (/\/(blog|article|post|news|actualit|journal)\//i.test(url) || $('article').length > 0) {
    if ($('h1,h2').toArray().some((el) => /guide|tutoriel|comment/i.test($(el).text()))) {
      return { kind: 'evergreen', tolerance: 365 }
    }
    return { kind: 'blog', tolerance: 90 }
  }
  if (/\/(product|produit|shop|boutique|feature|pricing|tarifs)\//i.test(url)) {
    return { kind: 'product', tolerance: 30 }
  }
  return { kind: 'landing', tolerance: 30 }
}

function extractSitemapLastmod(sitemapXml: string | null, finalUrl: string): Date | null {
  if (!sitemapXml) return null
  // Loose regex — the full <url><loc>...</loc><lastmod>...</lastmod></url> pattern
  const urlBlocks = sitemapXml.match(/<url\b[\s\S]*?<\/url>/gi) ?? []
  for (const block of urlBlocks) {
    const loc = block.match(/<loc>([^<]+)<\/loc>/i)?.[1]?.trim()
    const lastmod = block.match(/<lastmod>([^<]+)<\/lastmod>/i)?.[1]?.trim()
    if (loc && lastmod && (loc === finalUrl || loc.endsWith(finalUrl.replace(/^https?:\/\/[^/]+/, '')))) {
      return parseDate(lastmod)
    }
  }
  return null
}

interface SitemapLastmodStats {
  total: number
  withLastmod: number
  recent: number // updated within 180 days
}

function computeSitemapLastmodStats(
  sitemapXml: string | null,
  recencyDays = 180,
): SitemapLastmodStats | null {
  if (!sitemapXml) return null
  const urlBlocks = sitemapXml.match(/<url\b[\s\S]*?<\/url>/gi) ?? []
  if (urlBlocks.length === 0) return null
  const cutoff = Date.now() - recencyDays * 24 * 3600 * 1000
  let withLastmod = 0
  let recent = 0
  for (const block of urlBlocks) {
    const lastmod = block.match(/<lastmod>([^<]+)<\/lastmod>/i)?.[1]?.trim()
    if (!lastmod) continue
    const d = parseDate(lastmod)
    if (!d) continue
    withLastmod++
    if (d.getTime() >= cutoff) recent++
  }
  return { total: urlBlocks.length, withLastmod, recent }
}

export async function runFreshnessPhase(
  snapshot: CrawlSnapshot,
): Promise<PhaseResult> {
  const findings: Finding[] = []
  let score = SCORE_MAX
  const $ = cheerio.load(snapshot.html)
  const finalUrl = snapshot.finalUrl

  const pushCheck = (check: CheckSpec) => {
    findings.push({
      phaseKey: PHASE_KEY,
      severity: check.severity,
      category: check.category,
      title: check.title,
      description: check.description,
      recommendation: check.recommendation,
      pointsLost: check.pointsLost,
      effort: check.effort,
      locationUrl: finalUrl,
      metricValue: check.metricValue,
      metricTarget: check.metricTarget,
    })
    score -= check.pointsLost
  }

  const objects = extractFlatJsonLd(snapshot.html)

  // Collect candidate dates (take most recent)
  const candidates: Array<{ source: string; date: Date }> = []
  for (const obj of objects) {
    const d = parseDate(obj.dateModified) ?? parseDate(obj.datePublished)
    if (d) candidates.push({ source: 'jsonld', date: d })
  }
  $('time[datetime]').each((_, el) => {
    const d = parseDate($(el).attr('datetime'))
    if (d) candidates.push({ source: 'time', date: d })
  })
  const sitemapDate = extractSitemapLastmod(snapshot.sitemapXml, finalUrl)
  if (sitemapDate) candidates.push({ source: 'sitemap', date: sitemapDate })

  // --- No date at all ----------------------------------------------------
  if (candidates.length === 0) {
    pushCheck({
      severity: 'medium',
      category: 'freshness-no-date',
      title: 'Aucune date de mise à jour détectable',
      description:
        'Les moteurs IA privilégient les contenus datés récents (76 % des citations IA concernent des contenus < 30 j). Sans date, le signal fraîcheur disparaît.',
      recommendation:
        'Ajouter `datePublished` + `dateModified` dans le JSON-LD Article, `<time datetime>` visible, et un `<lastmod>` à jour dans sitemap.xml.',
      pointsLost: 1.5,
      effort: 'quick',
    })
  } else {
    const mostRecent = candidates.reduce((a, b) => (a.date > b.date ? a : b))
    const age = daysSince(mostRecent.date)
    const { kind, tolerance } = classifyPage(finalUrl, $)

    if (age > tolerance) {
      const pointsLost = kind === 'landing' || kind === 'product' ? 2 : 1
      pushCheck({
        severity: kind === 'landing' ? 'medium' : 'low',
        category: 'freshness-stale',
        title: `Contenu daté de ${age} jours (${kind})`,
        description: `La page est du type "${kind}" avec une tolérance de ${tolerance} jours. Elle n'a pas été mise à jour depuis plus de ${tolerance} jours.`,
        recommendation:
          'Rafraîchir la page (édit substantiel, pas juste le date) et mettre à jour `dateModified` + `<lastmod>` sitemap.',
        pointsLost,
        effort: 'medium',
        metricValue: `${age} j`,
        metricTarget: `≤ ${tolerance} j`,
      })
    }
  }

  // --- Phantom refresh (JSON-LD frais vs HTTP Last-Modified ancien) -----
  // Si le serveur n'a pas servi la page depuis très longtemps mais que le
  // JSON-LD prétend qu'elle vient d'être modifiée, c'est un signal classique
  // de timestamp injecté dynamiquement sans vraie mise à jour du contenu.
  const httpLastModified = parseDate(snapshot.lastModified ?? null)
  const jsonLdDate = (() => {
    const jsonLdCandidates = candidates.filter((c) => c.source === 'jsonld')
    if (jsonLdCandidates.length === 0) return null
    return jsonLdCandidates.reduce((a, b) => (a.date > b.date ? a : b)).date
  })()
  if (httpLastModified && jsonLdDate) {
    const jsonLdAge = daysSince(jsonLdDate)
    const httpAge = daysSince(httpLastModified)
    if (jsonLdAge < 30 && httpAge > 180) {
      pushCheck({
        severity: 'medium',
        category: 'freshness-phantom-refresh',
        title: 'Phantom refresh probable (date injectée sans mise à jour réelle)',
        description:
          'Le JSON-LD annonce une mise à jour récente, mais le header HTTP Last-Modified indique que la page n\'a pas été re-servie depuis longtemps. Signal classique de faux rafraîchissement (template dynamique) — les moteurs IA et Google détectent ce pattern.',
        recommendation:
          'Mettre à jour substantiellement le contenu avant de modifier `dateModified` : ajout d\'un paragraphe, rafraîchissement des chiffres, nouvelle section FAQ. Laisser le cache HTTP refléter la vraie date.',
        pointsLost: 1.5,
        effort: 'medium',
        metricValue: `JSON-LD : ${jsonLdAge} j / HTTP : ${httpAge} j`,
      })
    }
  }

  // --- Site-wide sitemap staleness --------------------------------------
  const siteStats = computeSitemapLastmodStats(snapshot.sitemapXml)
  if (siteStats && siteStats.total >= 10 && siteStats.withLastmod >= 5) {
    const recentRatio = siteStats.recent / siteStats.withLastmod
    if (recentRatio < 0.3) {
      pushCheck({
        severity: 'medium',
        category: 'freshness-site-wide-stale',
        title: 'Site globalement non maintenu (sitemap)',
        description: `Moins de 30 % des pages du sitemap ont été mises à jour dans les 6 derniers mois (${siteStats.recent}/${siteStats.withLastmod}). Les moteurs IA et Google pondèrent la confiance par la "vitalité" perçue du site entier.`,
        recommendation:
          'Programmer un audit éditorial trimestriel : identifier les pages clés (produits, landing, guides) et les rafraîchir. Retirer ou noindexer les pages obsolètes.',
        pointsLost: 1,
        effort: 'heavy',
        metricValue: `${Math.round(recentRatio * 100)} % récentes`,
        metricTarget: '≥ 30 %',
      })
    }
  }

  // --- Content diversity sur subPages -----------------------------------
  // Si plusieurs subPages retournent exactement le même contentHash, on a
  // affaire à un site de boilerplate (template-only, texte dupliqué massif).
  const subPages = snapshot.subPages ?? []
  if (subPages.length >= 5) {
    const hashCounts = new Map<string, number>()
    for (const sp of subPages) {
      hashCounts.set(sp.contentHash, (hashCounts.get(sp.contentHash) ?? 0) + 1)
    }
    const maxDuplicates = Math.max(...hashCounts.values())
    if (maxDuplicates >= 3) {
      pushCheck({
        severity: 'low',
        category: 'freshness-content-duplication',
        title: 'Pages internes au contenu quasi-identique',
        description: `${maxDuplicates} pages du sitemap partagent exactement le même contenu textuel. Signal de template boilerplate ou de pages auto-générées sans substance.`,
        recommendation:
          'Différencier chaque page : titre H1 unique, premier paragraphe spécifique, contenu factuel propre. Sinon, consolider via canonical ou 301.',
        pointsLost: 1,
        effort: 'medium',
        metricValue: `${maxDuplicates} pages identiques`,
      })
    }
  }

  // --- Sitemap lastmod cohérence ----------------------------------------
  if (candidates.length > 1 && sitemapDate && snapshot.sitemapXml) {
    const nonSitemapDates = candidates.filter((c) => c.source !== 'sitemap')
    if (nonSitemapDates.length > 0) {
      const newestContentDate = nonSitemapDates.reduce((a, b) =>
        a.date > b.date ? a : b,
      ).date
      const gap = Math.floor(
        (newestContentDate.getTime() - sitemapDate.getTime()) /
          (1000 * 60 * 60 * 24),
      )
      if (Math.abs(gap) > 30) {
        pushCheck({
          severity: 'low',
          category: 'freshness-sitemap-mismatch',
          title: 'Sitemap lastmod désynchronisé du contenu',
          description: `Le \`lastmod\` du sitemap (${sitemapDate.toISOString().slice(0, 10)}) diffère de plus de 30 jours de la date du contenu (${newestContentDate.toISOString().slice(0, 10)}).`,
          recommendation:
            'Regénérer le sitemap à chaque mise à jour de contenu (idéalement automatisé au build).',
          pointsLost: 1,
          effort: 'medium',
          metricValue: `${gap} j d'écart`,
        })
      }
    }
  }

  score = Math.max(0, Math.min(SCORE_MAX, score))

  return {
    phaseKey: PHASE_KEY,
    score,
    scoreMax: SCORE_MAX,
    status: 'completed',
    summary: `Phase Freshness — ${findings.length} constat${findings.length > 1 ? 's' : ''}, score ${score}/${SCORE_MAX}`,
    findings,
  }
}

export const FRESHNESS_SCORE_MAX = SCORE_MAX
