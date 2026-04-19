/**
 * Phase 4 — Entity SEO (10 pts)
 *
 * Vérifie la cohérence de marque et les signaux d'entité qui permettent à
 * Google et aux moteurs IA de désambiguïser la marque.
 *
 * URL mode : Wikidata lookup live (API MediaWiki publique, timeout 5s),
 * brand coherence, sameAs qualité, entity linking interne.
 */
import * as cheerio from 'cheerio'
import type { Finding, PhaseResult, CrawlSnapshot } from '../types'
import { searchWikidataEntity } from '../wikidata'

const SCORE_MAX = 10
const PHASE_KEY = 'entity' as const

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
    const raw = $(el).text().trim()
    if (!raw) return
    try {
      const parsed = JSON.parse(raw)
      const visit = (node: unknown) => {
        if (!node || typeof node !== 'object') return
        if (Array.isArray(node)) return node.forEach(visit)
        const o = node as JsonLdObject
        if (Array.isArray(o['@graph'])) return (o['@graph'] as unknown[]).forEach(visit)
        out.push(o)
      }
      visit(parsed)
    } catch {
      /* ignore */
    }
  })
  return out
}

function findOrganization(objects: JsonLdObject[]): JsonLdObject | null {
  return (
    objects.find((o) => {
      const t = o['@type']
      const types = Array.isArray(t) ? t.map(String) : t ? [String(t)] : []
      return types.some((x) => x.toLowerCase() === 'organization')
    }) ?? null
  )
}

function normalizeBrand(name: string | null | undefined): string {
  return (name ?? '').trim().toLowerCase()
}

export async function runEntityPhase(
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
  const org = findOrganization(objects)

  // --- Cohérence nom de marque -------------------------------------------
  const titleText = ($('head > title').first().text() || '').trim()
  const siteName = $('meta[property="og:site_name"]').attr('content') ?? null
  const orgName = org ? (org.name as string | undefined) ?? null : null

  const brandCandidates = [orgName, siteName, titleText]
    .map((x) => normalizeBrand(x))
    .filter(Boolean)

  if (brandCandidates.length >= 2) {
    // Relaxed comparison : one must contain another's root (at least 4 chars)
    const unique = Array.from(new Set(brandCandidates))
    if (unique.length > 1) {
      const roots = unique
        .map((b) => b.split(/[\s\-|·—]/)[0])
        .filter((x) => x.length >= 3)
      const rootSet = new Set(roots)
      if (rootSet.size > 1) {
        pushCheck({
          severity: 'high',
          category: 'entity-brand-coherence',
          title: 'Nom de marque incohérent entre les sources',
          description:
            'Le nom de marque diffère entre <title>, og:site_name et Organization.name. Les moteurs peinent à désambiguïser l\'entité quand les signaux divergent.',
          recommendation:
            'Uniformiser la casse et l\'orthographe du nom de marque dans tous les emplacements : <title>, og:site_name, Organization.name, footer, canonical host, Twitter @handle.',
          pointsLost: 2,
          effort: 'quick',
          metricValue: unique.join(' vs '),
        })
      }
    }
  }

  // --- sameAs qualité ----------------------------------------------------
  const sameAs: string[] = (() => {
    if (!org) return []
    const raw = org.sameAs
    if (typeof raw === 'string') return [raw]
    if (Array.isArray(raw)) return raw.filter((v): v is string => typeof v === 'string')
    return []
  })()

  if (org) {
    const hasWikidata = sameAs.some((url) => /wikidata\.org/i.test(url))
    const hasWikipedia = sameAs.some((url) => /wikipedia\.org/i.test(url))

    if (!hasWikidata) {
      // Real Wikidata lookup — if a matching entity exists, point the user
      // straight at it ; otherwise suggest creation.
      const brandQuery = orgName ?? siteName ?? titleText
      const wikidataMatch = brandQuery
        ? await searchWikidataEntity(brandQuery.replace(/[\s\-|·—].*$/, '').trim())
        : null
      if (wikidataMatch) {
        pushCheck({
          severity: 'high',
          category: 'entity-wikidata',
          title: `Entité Wikidata existante absente de sameAs (${wikidataMatch.id})`,
          description: `Wikidata référence déjà une entité correspondante (${wikidataMatch.label}${wikidataMatch.description ? ' — ' + wikidataMatch.description : ''}) mais l'Organization ne la cite pas dans sameAs.`,
          recommendation: `Ajouter \`${wikidataMatch.url}\` au tableau \`sameAs\` du JSON-LD Organization.`,
          pointsLost: 2,
          effort: 'quick',
          metricValue: wikidataMatch.id,
        })
      } else {
        pushCheck({
          severity: 'medium',
          category: 'entity-wikidata',
          title: 'Aucun lien Wikidata dans sameAs',
          description:
            'Wikidata est la source de vérité d\'entité pour Google Knowledge Graph et de nombreux moteurs IA. Son absence limite la consolidation de l\'entité.',
          recommendation:
            'Créer une entité Wikidata pour la marque puis l\'ajouter dans sameAs : `https://www.wikidata.org/wiki/Q...`.',
          pointsLost: 2,
          effort: 'heavy',
        })
      }
    }
    if (sameAs.length > 0 && !hasWikipedia) {
      pushCheck({
        severity: 'low',
        category: 'entity-wikipedia',
        title: 'Aucun lien Wikipedia dans sameAs',
        description:
          'Un article Wikipedia est l\'un des signaux d\'autorité les plus forts pour les moteurs. Non pénalisant si la marque est jeune, mais à cibler à moyen terme.',
        recommendation:
          'Si la marque remplit les critères de notoriété, créer ou contribuer à un article Wikipedia puis l\'ajouter à sameAs.',
        pointsLost: 1,
        effort: 'heavy',
      })
    }
  }

  // --- WebSite + SearchAction (re-scoré sous angle Entity) ---------------
  const website = objects.find((o) => {
    const t = o['@type']
    const types = Array.isArray(t) ? t.map(String) : t ? [String(t)] : []
    return types.some((x) => x.toLowerCase() === 'website')
  })
  const hasSearchAction =
    website &&
    typeof website.potentialAction === 'object' &&
    website.potentialAction !== null
  if (!website || !hasSearchAction) {
    pushCheck({
      severity: 'low',
      category: 'entity-searchaction',
      title: 'SearchAction absente (impact Entity)',
      description:
        'L\'absence de WebSite + SearchAction limite la capacité de Google à comprendre l\'architecture du site pour l\'affichage de sitelinks et de résultats enrichis liés à l\'entité.',
      recommendation:
        'Ajouter le schema WebSite avec potentialAction SearchAction (détaillé en Phase 2).',
      pointsLost: 1,
      effort: 'quick',
    })
  }

  // --- Entity linking interne (ratio noms propres linkés) ----------------
  // V1 heuristique : nombre de mots commençant par majuscule dans body vs
  // liens internes contenant ces mots. Approximation, raffinable plus tard.
  const bodyText = $('body').text()
  const properNounMatches =
    bodyText.match(/\b[A-Z][a-zà-ÿ]{2,}(?:\s[A-Z][a-zà-ÿ]{2,})?\b/g) ?? []
  const uniqueProperNouns = Array.from(
    new Set(properNounMatches.map((p) => p.toLowerCase())),
  ).filter(
    (n) =>
      !['le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'the'].includes(n),
  )

  const internalLinks = $('a[href^="/"], a[href^="."]')
    .toArray()
    .map((el) => $(el).text().toLowerCase().trim())
  const linkedNouns = uniqueProperNouns.filter((noun) =>
    internalLinks.some((txt) => txt.includes(noun)),
  )

  if (uniqueProperNouns.length >= 15) {
    const ratio = linkedNouns.length / uniqueProperNouns.length
    if (ratio < 0.3) {
      pushCheck({
        severity: 'low',
        category: 'entity-linking',
        title: 'Peu de noms propres linkés vers des pages internes',
        description:
          'Les moteurs IA renforcent leur compréhension d\'une entité quand elle est citée + linkée vers une page explicative. Ratio faible ici.',
        recommendation:
          'Linker les noms de dirigeants, produits, concepts clés vers des pages dédiées (Équipe, Produits, Glossaire…).',
        pointsLost: 1,
        effort: 'medium',
        metricValue: `${Math.round(ratio * 100)} %`,
        metricTarget: '≥ 30 %',
      })
    }
  }

  score = Math.max(0, Math.min(SCORE_MAX, score))

  return {
    phaseKey: PHASE_KEY,
    score,
    scoreMax: SCORE_MAX,
    status: 'completed',
    summary: `Phase Entity — ${findings.length} constat${findings.length > 1 ? 's' : ''}, score ${score}/${SCORE_MAX}`,
    findings,
  }
}

export const ENTITY_SCORE_MAX = SCORE_MAX
