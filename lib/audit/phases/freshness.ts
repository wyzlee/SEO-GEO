/**
 * Phase 6 — Content Freshness (8 pts)
 *
 * V1 URL mode : dateModified JSON-LD + `<time>` + sitemap lastmod.
 * Phantom refresh detection et content hash diff sont V1.5.
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
