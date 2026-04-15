/**
 * Phase 7 — International SEO (8 pts)
 *
 * hreflang + x-default + og:locale. V1 : single-page detection.
 * Bidirectional consistency check et traduction 404 sont V1.5 (multi-page).
 *
 * Si single-language detecté, la phase est skippée et les 8 pts sont notés
 * comme redistribués (la logique de redistribution concrète se fait côté
 * engine, non implémentée V1 — on signale simplement).
 */
import * as cheerio from 'cheerio'
import type { Finding, PhaseResult, CrawlSnapshot } from '../types'

const SCORE_MAX = 8
const PHASE_KEY = 'international' as const

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

export async function runInternationalPhase(
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

  const hreflangs = $('link[rel="alternate"][hreflang]')
    .toArray()
    .map((el) => ({
      lang: $(el).attr('hreflang') ?? '',
      href: $(el).attr('href') ?? '',
    }))
    .filter((h) => h.lang && h.href)

  // --- Single-language detection -----------------------------------------
  if (hreflangs.length === 0) {
    pushCheck({
      severity: 'info',
      category: 'international-single-lang',
      title: 'Site single-langue détecté',
      description:
        'Aucun `<link rel="alternate" hreflang>` n\'est présent : le site apparaît comme mono-langue. La phase International est non applicable.',
      recommendation:
        'Si une stratégie multilingue est prévue, consulter le guide hreflang (75 % des implémentations ont des erreurs — éviter les pièges dès le départ).',
      pointsLost: 0,
      effort: 'quick',
    })
    // Leave score at SCORE_MAX; the "redistribution" notion is informational only V1.
    return {
      phaseKey: PHASE_KEY,
      score: SCORE_MAX,
      scoreMax: SCORE_MAX,
      status: 'completed',
      summary: 'Phase International — site mono-langue, score maintenu à 8/8',
      findings,
    }
  }

  // --- Multi-language : checks standards ---------------------------------
  const locales = new Set(hreflangs.map((h) => h.lang.toLowerCase()))

  // x-default
  if (!locales.has('x-default')) {
    pushCheck({
      severity: 'medium',
      category: 'international-x-default',
      title: 'x-default absent',
      description:
        'Sans `x-default`, Google ne sait pas quelle version cibler pour les visiteurs hors locales déclarées.',
      recommendation:
        'Ajouter `<link rel="alternate" hreflang="x-default" href="...">` pointant vers la version générique (souvent l\'anglais).',
      pointsLost: 1,
      effort: 'quick',
    })
  }

  // og:locale
  if (!$('meta[property="og:locale"]').attr('content')) {
    pushCheck({
      severity: 'low',
      category: 'international-og-locale',
      title: 'og:locale absent',
      description:
        'og:locale + og:locale:alternate renforce la compréhension de la langue par les crawlers sociaux.',
      recommendation:
        'Ajouter `<meta property="og:locale" content="fr_FR">` et un `og:locale:alternate` par langue.',
      pointsLost: 0.5,
      effort: 'quick',
    })
  }

  // Duplicate hreflang entries
  const duplicates = hreflangs
    .map((h) => h.lang.toLowerCase())
    .filter((lang, i, arr) => arr.indexOf(lang) !== i)
  if (duplicates.length > 0) {
    pushCheck({
      severity: 'medium',
      category: 'international-hreflang-dup',
      title: 'hreflang dupliqués',
      description:
        'Plusieurs balises hreflang pointent vers la même locale. Google signale une erreur et peut ignorer les balises.',
      recommendation:
        'Dédupliquer les entrées hreflang, une seule par locale (format `ab-CD`).',
      pointsLost: 1,
      effort: 'quick',
      metricValue: Array.from(new Set(duplicates)).join(', '),
    })
  }

  // URL strategy : subdir vs ccTLD
  const url = new URL(finalUrl)
  const usesCcTld = /\.(fr|de|es|it|uk|jp|br|mx|ca|au)$/i.test(url.host)
  if (usesCcTld) {
    pushCheck({
      severity: 'info',
      category: 'international-url-strategy',
      title: 'Stratégie URL en ccTLD détectée',
      description:
        'Les ccTLD (.fr, .de…) lient le site à un pays. Intéressant si ciblage local fort, mais fragmente l\'autorité SEO. Les subdir /fr/, /en/ sont souvent préférés.',
      recommendation:
        'Si l\'objectif est géographique (E-commerce local, contraintes légales), garder. Sinon migrer vers subdir sur domaine principal.',
      pointsLost: 0,
      effort: 'heavy',
    })
  }

  score = Math.max(0, Math.min(SCORE_MAX, score))

  return {
    phaseKey: PHASE_KEY,
    score,
    scoreMax: SCORE_MAX,
    status: 'completed',
    summary: `Phase International — ${findings.length} constat${findings.length > 1 ? 's' : ''}, score ${score}/${SCORE_MAX}`,
    findings,
  }
}

export const INTERNATIONAL_SCORE_MAX = SCORE_MAX
