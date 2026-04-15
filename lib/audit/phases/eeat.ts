/**
 * Phase 5 — E-E-A-T Signals (10 pts)
 *
 * Experience / Expertise / Authoritativeness / Trust. V1 URL mode : checks
 * déterministes sur la page crawlée (HTTPS, auteur, Person schema, trust
 * pages, citations externes).
 */
import * as cheerio from 'cheerio'
import type { Finding, PhaseResult, CrawlSnapshot } from '../types'

const SCORE_MAX = 10
const PHASE_KEY = 'eeat' as const

interface CheckSpec {
  severity: Finding['severity']
  category: string
  title: string
  description: string
  recommendation: string
  pointsLost: number
  effort?: Finding['effort']
  metricValue?: string
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

function hasType(objects: JsonLdObject[], type: string): boolean {
  return objects.some((o) => {
    const t = o['@type']
    const types = Array.isArray(t) ? t.map(String) : t ? [String(t)] : []
    return types.some((x) => x.toLowerCase() === type.toLowerCase())
  })
}

export async function runEeatPhase(
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
    })
    score -= check.pointsLost
  }

  const objects = extractFlatJsonLd(snapshot.html)

  // --- Trust : HTTPS ------------------------------------------------------
  if (!finalUrl.startsWith('https://')) {
    pushCheck({
      severity: 'critical',
      category: 'eeat-https',
      title: 'Site servi en HTTP (pas HTTPS)',
      description:
        'HTTPS est un signal de trust fondamental. Sans lui, Google rétrograde le site et tous les navigateurs affichent un warning "non sécurisé".',
      recommendation:
        'Activer un certificat TLS (Let\'s Encrypt gratuit), forcer la redirection HTTP → HTTPS, ajouter HSTS.',
      pointsLost: 3,
      effort: 'medium',
    })
  }

  // --- Trust : About / Contact / Legal / Privacy pages -------------------
  const allAnchors = $('a')
    .toArray()
    .map((el) => ({
      href: ($(el).attr('href') ?? '').toLowerCase(),
      text: $(el).text().toLowerCase(),
    }))

  const linkMatches = (keywords: string[]) =>
    allAnchors.some((a) =>
      keywords.some((k) => a.href.includes(k) || a.text.includes(k)),
    )

  const trustPages = [
    { name: 'About', keywords: ['about', 'a-propos', 'qui-sommes', 'equipe'] },
    { name: 'Contact', keywords: ['contact'] },
    {
      name: 'Mentions légales / Legal',
      keywords: ['mentions', 'legal', 'legales'],
    },
    { name: 'Privacy / Confidentialité', keywords: ['privacy', 'confidentialite'] },
  ]
  const missingTrust = trustPages.filter((p) => !linkMatches(p.keywords))
  if (missingTrust.length > 0) {
    pushCheck({
      severity: 'medium',
      category: 'eeat-trust-pages',
      title: `Pages de confiance manquantes (${missingTrust.length})`,
      description:
        'Les pages About, Contact, Mentions légales, Privacy sont des signaux de trust minimums. Leur absence en navigation fragilise le E-E-A-T.',
      recommendation: `Exposer les pages suivantes dans le footer : ${missingTrust.map((p) => p.name).join(', ')}.`,
      pointsLost: missingTrust.length * 0.5,
      effort: 'medium',
      metricValue: missingTrust.map((p) => p.name).join(', '),
    })
  }

  // --- Experience : auteur identifié -------------------------------------
  const metaAuthor = $('meta[name="author"]').attr('content')
  const hasAuthor =
    !!metaAuthor ||
    objects.some((o) => {
      const article =
        Array.isArray(o['@type'])
          ? o['@type'].map(String).some((t) => /article|blogposting|newsarticle/i.test(t))
          : o['@type'] &&
            /article|blogposting|newsarticle/i.test(String(o['@type']))
      return article && !!o.author
    })

  const looksEditorial =
    /\/(blog|article|post|news|actualit|journal)\//i.test(finalUrl) ||
    $('article').length > 0

  if (looksEditorial && !hasAuthor) {
    pushCheck({
      severity: 'medium',
      category: 'eeat-author',
      title: 'Auteur non identifié sur la page éditoriale',
      description:
        'Sur une page éditoriale, l\'auteur identifié (meta author + Article.author + bio visible) renforce Experience et Expertise.',
      recommendation:
        'Ajouter `<meta name="author" content="...">`, renseigner `author` dans le JSON-LD Article, afficher un encart auteur + bio.',
      pointsLost: 1,
      effort: 'quick',
    })
  }

  // --- Expertise : Person schema -----------------------------------------
  if (looksEditorial && !hasType(objects, 'Person')) {
    pushCheck({
      severity: 'low',
      category: 'eeat-person-schema',
      title: 'Schema Person absent sur la page éditoriale',
      description:
        'Un schema `Person` avec `jobTitle`, `sameAs`, `knowsAbout` étoffe l\'Expertise signal pour Google et les moteurs IA.',
      recommendation:
        'Ajouter un JSON-LD Person pour l\'auteur avec `name`, `jobTitle`, `sameAs` (LinkedIn, Twitter), `knowsAbout`.',
      pointsLost: 1,
      effort: 'medium',
    })
  }

  // --- Authoritativeness : citations externes ----------------------------
  if (looksEditorial) {
    const externalLinks = $('a[href^="http"]')
      .toArray()
      .map((el) => $(el).attr('href') ?? '')
      .filter((href) => {
        try {
          const host = new URL(href).host
          const currentHost = new URL(finalUrl).host
          return host !== currentHost && host !== ''
        } catch {
          return false
        }
      })

    if (externalLinks.length < 3) {
      pushCheck({
        severity: 'low',
        category: 'eeat-citations',
        title: 'Peu de citations externes',
        description:
          'Les pages éditoriales à forte autorité citent des sources externes (études, articles de référence, documentation officielle).',
        recommendation:
          'Ajouter au moins 3 liens externes vers des sources autoritaires pertinentes (études, rapports, documentation).',
        pointsLost: 1,
        effort: 'medium',
        metricValue: `${externalLinks.length} lien(s) externe(s)`,
      })
    }
  }

  // --- Experience : dates visibles ---------------------------------------
  const hasTimeElement = $('time[datetime]').length > 0
  const hasArticleDates = objects.some((o) => o.datePublished || o.dateModified)
  if (looksEditorial && !hasTimeElement && !hasArticleDates) {
    pushCheck({
      severity: 'low',
      category: 'eeat-dates',
      title: 'Dates de publication / mise à jour non visibles',
      description:
        'Les dates visibles lecteur (via <time datetime>) + JSON-LD Article dates sont un signal Experience direct.',
      recommendation:
        'Ajouter un <time datetime="YYYY-MM-DD"> visible en haut de l\'article + `datePublished` / `dateModified` dans le JSON-LD.',
      pointsLost: 1,
      effort: 'quick',
    })
  }

  score = Math.max(0, Math.min(SCORE_MAX, score))

  return {
    phaseKey: PHASE_KEY,
    score,
    scoreMax: SCORE_MAX,
    status: 'completed',
    summary: `Phase E-E-A-T — ${findings.length} constat${findings.length > 1 ? 's' : ''}, score ${score}/${SCORE_MAX}`,
    findings,
  }
}

export const EEAT_SCORE_MAX = SCORE_MAX
