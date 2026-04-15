/**
 * Phase 2 — Structured Data 2026 (15 pts)
 *
 * Validation des schemas JSON-LD clés pour Google SERP et moteurs IA.
 * V1 se concentre sur la page crawlée (homepage typique). Les checks
 * multi-pages (BreadcrumbList sur ≥ 50 %, Person sur auteurs) nécessitent
 * un crawl élargi, livré en V1.5.
 *
 * Input type: URL.
 * Référence : .claude/docs/audit-engine.md Phase 2
 */
import * as cheerio from 'cheerio'
import type { Finding, PhaseResult, CrawlSnapshot } from '../types'

const SCORE_MAX = 15
const PHASE_KEY = 'structured_data' as const

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

interface JsonLdBlock {
  raw: string
  parsed: JsonLdObject[] | null // null means parse error
}

/** Extract all `<script type="application/ld+json">` blocks, preserving parse errors. */
function extractJsonLdBlocks(html: string): JsonLdBlock[] {
  const $ = cheerio.load(html)
  const blocks: JsonLdBlock[] = []
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).text().trim()
    if (!raw) return
    try {
      const parsed = JSON.parse(raw)
      // Normalize to array of objects (single obj / @graph / array of objs)
      const flat = flattenParsed(parsed)
      blocks.push({ raw, parsed: flat })
    } catch {
      blocks.push({ raw, parsed: null })
    }
  })
  return blocks
}

function flattenParsed(parsed: unknown): JsonLdObject[] {
  const out: JsonLdObject[] = []
  const visit = (node: unknown) => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) {
      node.forEach(visit)
      return
    }
    const obj = node as JsonLdObject
    if (Array.isArray(obj['@graph'])) {
      (obj['@graph'] as unknown[]).forEach(visit)
      return
    }
    out.push(obj)
  }
  visit(parsed)
  return out
}

function getTypes(obj: JsonLdObject): string[] {
  const raw = obj['@type']
  if (!raw) return []
  return Array.isArray(raw)
    ? raw.map(String)
    : [String(raw)]
}

function hasType(objects: JsonLdObject[], type: string): JsonLdObject | null {
  return (
    objects.find((obj) => getTypes(obj).some((t) => t.toLowerCase() === type.toLowerCase())) ?? null
  )
}

function stringField(obj: JsonLdObject, field: string): string | null {
  const v = obj[field]
  if (!v) return null
  if (typeof v === 'string') return v
  if (typeof v === 'object' && v !== null && 'name' in v) {
    const name = (v as JsonLdObject).name
    return typeof name === 'string' ? name : null
  }
  if (typeof v === 'object' && v !== null && 'url' in v) {
    const url = (v as JsonLdObject).url
    return typeof url === 'string' ? url : null
  }
  return null
}

function collectSameAs(obj: JsonLdObject): string[] {
  const raw = obj.sameAs
  if (!raw) return []
  if (typeof raw === 'string') return [raw]
  if (Array.isArray(raw)) {
    return raw.filter((v): v is string => typeof v === 'string')
  }
  return []
}

/** Detect whether the page is likely an editorial / article page. */
function looksLikeArticlePage(
  $: cheerio.CheerioAPI,
  finalUrl: string,
): boolean {
  if (/\/(blog|article|post|news|actualit|journal)\//i.test(finalUrl)) return true
  if ($('article').length > 0) return true
  const ogType = $('meta[property="og:type"]').attr('content') || ''
  return /article/i.test(ogType)
}

export async function runStructuredDataPhase(
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

  const blocks = extractJsonLdBlocks(snapshot.html)
  const parseErrors = blocks.filter((b) => b.parsed === null)
  const validObjects = blocks
    .filter((b): b is { raw: string; parsed: JsonLdObject[] } => b.parsed !== null)
    .flatMap((b) => b.parsed)

  // --- Parse errors ------------------------------------------------------
  if (parseErrors.length > 0) {
    pushCheck({
      severity: 'high',
      category: 'schema-syntax',
      title: `JSON-LD invalide (${parseErrors.length} bloc${parseErrors.length > 1 ? 's' : ''})`,
      description:
        'Un ou plusieurs blocs `<script type="application/ld+json">` ne sont pas du JSON valide. Google et les moteurs IA les ignoreront.',
      recommendation:
        'Valider le JSON-LD avec `https://validator.schema.org` avant déploiement. Éviter les virgules traînantes, quotes typographiques, commentaires.',
      pointsLost: 2,
      effort: 'quick',
      metricValue: `${parseErrors.length} bloc(s)`,
    })
  }

  // --- Organization ------------------------------------------------------
  const organization = hasType(validObjects, 'Organization')
  if (!organization) {
    pushCheck({
      severity: 'critical',
      category: 'schema-organization',
      title: 'Schema Organization absent',
      description:
        'Le schema `Organization` est la fondation de l\'Entity SEO : il permet à Google et aux moteurs IA d\'identifier la marque comme une entité.',
      recommendation:
        'Ajouter un JSON-LD `Organization` avec `name`, `url`, `logo`, `sameAs` (≥ 5 profils sociaux / Wikidata).',
      pointsLost: 3,
      effort: 'medium',
    })
  } else {
    const missing: string[] = []
    if (!stringField(organization, 'name')) missing.push('name')
    if (!stringField(organization, 'url')) missing.push('url')
    if (!stringField(organization, 'logo')) missing.push('logo')
    if (missing.length > 0) {
      pushCheck({
        severity: 'medium',
        category: 'schema-organization',
        title: `Schema Organization incomplet (${missing.join(', ')})`,
        description:
          'Les champs `name`, `url`, `logo` sont les minimums requis par Google pour afficher un knowledge panel et permettre aux moteurs IA de désambiguïser la marque.',
        recommendation: `Ajouter ${missing.map((f) => `\`${f}\``).join(', ')} au JSON-LD Organization.`,
        pointsLost: missing.length,
        effort: 'quick',
      })
    }

    const sameAs = collectSameAs(organization)
    if (sameAs.length === 0) {
      pushCheck({
        severity: 'high',
        category: 'schema-sameas',
        title: 'sameAs absent du schema Organization',
        description:
          '`sameAs` relie la marque à ses profils sociaux / Wikidata / Wikipedia. C\'est un signal entity majeur pour les moteurs IA.',
        recommendation:
          'Ajouter un tableau `sameAs` listant ≥ 5 URLs : LinkedIn, X/Twitter, GitHub, Wikidata, Crunchbase, YouTube…',
        pointsLost: 3,
        effort: 'medium',
      })
    } else if (sameAs.length < 5) {
      pushCheck({
        severity: 'medium',
        category: 'schema-sameas',
        title: `sameAs sous-dimensionné (${sameAs.length} profils)`,
        description:
          'Pour un signal d\'entité fiable, cibler au minimum 5 profils externes cohérents avec la marque.',
        recommendation:
          'Compléter `sameAs` (viser ≥ 5) : profils sociaux officiels, Wikidata si l\'entité existe, Crunchbase, GitHub.',
        pointsLost: 2,
        effort: 'medium',
        metricValue: `${sameAs.length} profil(s)`,
        metricTarget: '≥ 5',
      })
    }
  }

  // --- WebSite + SearchAction --------------------------------------------
  const website = hasType(validObjects, 'WebSite')
  const hasSearchAction =
    website && typeof website.potentialAction === 'object' &&
    website.potentialAction !== null &&
    getTypes(website.potentialAction as JsonLdObject).some((t) =>
      t.toLowerCase().includes('searchaction'),
    )

  if (!website || !hasSearchAction) {
    pushCheck({
      severity: 'medium',
      category: 'schema-website',
      title: website
        ? 'WebSite présent mais SearchAction absent'
        : 'Schema WebSite absent',
      description:
        'Le schema `WebSite` + `potentialAction: SearchAction` permet à Google d\'afficher une sitelinks search box et aux moteurs IA de comprendre la structure du site.',
      recommendation:
        'Ajouter un JSON-LD `WebSite` avec `url`, `name` et `potentialAction: { "@type": "SearchAction", "target": "https://exemple.com/?q={search_term_string}", "query-input": "required name=search_term_string" }`.',
      pointsLost: 2,
      effort: 'quick',
    })
  }

  // --- Article (si page éditoriale détectée) ------------------------------
  const article =
    hasType(validObjects, 'Article') ||
    hasType(validObjects, 'BlogPosting') ||
    hasType(validObjects, 'NewsArticle')

  if (looksLikeArticlePage($, finalUrl)) {
    if (!article) {
      pushCheck({
        severity: 'high',
        category: 'schema-article',
        title: 'Page éditoriale sans schema Article',
        description:
          'Cette page ressemble à un article / post de blog mais n\'a pas de JSON-LD `Article` ou `BlogPosting`. Les rich results Google et les citations IA en dépendent.',
        recommendation:
          'Ajouter un JSON-LD `BlogPosting` avec `headline`, `datePublished`, `dateModified`, `author`, `publisher`, `image`, `mainEntityOfPage`.',
        pointsLost: 3,
        effort: 'medium',
      })
    } else {
      const required = [
        'headline',
        'datePublished',
        'dateModified',
        'author',
        'publisher',
        'image',
        'mainEntityOfPage',
      ] as const
      const missing = required.filter((f) => !article[f])
      if (missing.length > 0) {
        pushCheck({
          severity: 'medium',
          category: 'schema-article',
          title: `Schema Article incomplet (${missing.length} champ${missing.length > 1 ? 's' : ''})`,
          description:
            'Google attend les champs complets pour accorder un rich result. Chaque champ manquant réduit la probabilité d\'apparaître en SERP enrichi.',
          recommendation: `Compléter le JSON-LD Article avec : ${missing.map((f) => `\`${f}\``).join(', ')}.`,
          pointsLost: Math.min(3.5, missing.length * 0.5),
          effort: 'quick',
          metricValue: `${missing.length} champ(s) manquant(s)`,
        })
      }
    }
  }

  // --- Schema stacking (homepage) ----------------------------------------
  const distinctTypes = new Set<string>()
  validObjects.forEach((obj) =>
    getTypes(obj).forEach((t) => distinctTypes.add(t.toLowerCase())),
  )
  if (distinctTypes.size < 3 && validObjects.length > 0) {
    pushCheck({
      severity: 'low',
      category: 'schema-stacking',
      title: 'Schema stacking faible',
      description:
        'Les pages stratégiques gagnent à combiner plusieurs schemas dans un `@graph` (Organization + WebSite + BreadcrumbList + WebPage, par exemple). Ici, trop peu de types distincts.',
      recommendation:
        'Regrouper les schemas en un seul bloc JSON-LD avec `@graph: [...]` contenant ≥ 3 types complémentaires.',
      pointsLost: 1,
      effort: 'medium',
      metricValue: `${distinctTypes.size} type(s)`,
      metricTarget: '≥ 3',
    })
  }

  // --- FAQPage (info only, pas de déduction) -----------------------------
  if (hasType(validObjects, 'FAQPage')) {
    pushCheck({
      severity: 'info',
      category: 'schema-faqpage',
      title: 'FAQPage détecté',
      description:
        'Google a déprécié les rich results FAQPage en SERP standard (depuis 2023) mais ce schema reste utile pour les moteurs IA (citations directes de Q/R).',
      recommendation:
        'Conserver le schema FAQPage pour le signal IA, mais ne pas compter sur un rich snippet FAQ en SERP.',
      pointsLost: 0,
      effort: 'quick',
    })
  }

  // --- Aucun schema du tout (pénalité déjà couverte par Organization) ----
  if (validObjects.length === 0 && parseErrors.length === 0) {
    pushCheck({
      severity: 'critical',
      category: 'schema-none',
      title: 'Aucun schema JSON-LD détecté',
      description:
        'La page n\'expose aucun schema structuré. Les SERP enrichis (rich results) et les moteurs IA perdent un signal majeur de compréhension.',
      recommendation:
        'Commencer par implémenter `Organization` + `WebSite` sur la homepage. Étendre ensuite aux pages internes (Article, BreadcrumbList).',
      pointsLost: 0, // already penalized via individual schemas absent
      effort: 'medium',
    })
  }

  score = Math.max(0, Math.min(SCORE_MAX, score))

  return {
    phaseKey: PHASE_KEY,
    score,
    scoreMax: SCORE_MAX,
    status: 'completed',
    summary: `Phase Structured Data — ${findings.length} constat${findings.length > 1 ? 's' : ''}, score ${score}/${SCORE_MAX}`,
    findings,
  }
}

export const STRUCTURED_DATA_SCORE_MAX = SCORE_MAX
