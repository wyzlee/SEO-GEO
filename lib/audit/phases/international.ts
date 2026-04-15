/**
 * Phase 7 — International SEO (8 pts)
 *
 * hreflang + x-default + og:locale. V1.5 ajoute :
 *  - self-reference (la page doit se lister elle-même dans ses hreflang)
 *  - format ab-CD strict (évite `fr_FR`, `fr-fr` mal cased, `FR` seul)
 *  - cohérence `<html lang>` vs hreflang de la page courante
 *  - bidirectional via subPages : chaque traduction linkée doit pointer
 *    back vers la source
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

  // --- Format strict BCP 47 (ab-CD) --------------------------------------
  // Google attend `fr`, `fr-FR`, `en-US`, `zh-Hans`, `x-default`. Les
  // underscores (`fr_FR`) ou casings exotiques (`FR-fr`) sont ignorés.
  const VALID_FORMAT =
    /^(x-default|[a-z]{2,3}(-(?:[A-Z]{2}|Hans|Hant|Latn|Cyrl))?)$/
  const malformed = hreflangs
    .map((h) => h.lang)
    .filter((lang) => !VALID_FORMAT.test(lang))
  if (malformed.length > 0) {
    pushCheck({
      severity: 'high',
      category: 'international-format',
      title: 'Format hreflang non conforme BCP 47',
      description: `Hreflang mal formés : ${malformed.join(', ')}. Google exige \`ab\` ou \`ab-CD\` (tiret, pas underscore) avec langue en minuscules et pays en majuscules.`,
      recommendation:
        'Normaliser en `fr`, `fr-FR`, `en-US`, etc. Retirer les `fr_FR`, `FR-fr`, `en_GB`.',
      pointsLost: 1,
      effort: 'quick',
      metricValue: malformed.slice(0, 4).join(', '),
    })
  }

  // --- Self-reference ----------------------------------------------------
  // La page courante DOIT apparaître dans ses propres hreflang. Sans ça,
  // Google considère que la règle hreflang est inopérante pour cette URL.
  const normalizePath = (u: string): string => {
    try {
      return new URL(u, finalUrl).href.replace(/\/+$/, '')
    } catch {
      return u
    }
  }
  const currentNormalized = normalizePath(finalUrl)
  const selfReferenced = hreflangs.some(
    (h) => normalizePath(h.href) === currentNormalized,
  )
  if (!selfReferenced) {
    pushCheck({
      severity: 'high',
      category: 'international-self-ref',
      title: 'Page absente de ses propres hreflang',
      description:
        'La page courante n\'est pas listée dans ses `<link rel="alternate" hreflang>`. Sans self-reference, Google invalide l\'ensemble de la grappe hreflang de la page — toutes les traductions perdent leur pairing.',
      recommendation:
        'Ajouter `<link rel="alternate" hreflang="xx-YY" href="<URL courante>">` en plus des autres locales.',
      pointsLost: 2,
      effort: 'quick',
    })
  }

  // --- html lang vs hreflang courant ------------------------------------
  const htmlLang = ($('html').attr('lang') ?? '').toLowerCase().split('-')[0]
  const selfHreflang = hreflangs.find(
    (h) => normalizePath(h.href) === currentNormalized,
  )
  if (htmlLang && selfHreflang) {
    const hreflangBase = selfHreflang.lang.toLowerCase().split('-')[0]
    if (hreflangBase !== 'x' && hreflangBase !== htmlLang) {
      pushCheck({
        severity: 'medium',
        category: 'international-html-lang',
        title: '<html lang> incohérent avec hreflang de la page',
        description: `La balise <html lang="${$('html').attr('lang')}"> ne correspond pas au hreflang auto-déclaré (${selfHreflang.lang}). Les moteurs cross-référencent les deux et pénalisent la divergence.`,
        recommendation:
          'Aligner `<html lang>` sur le préfixe du hreflang de la page. Ex: hreflang="fr-FR" → `<html lang="fr-FR">`.',
        pointsLost: 1,
        effort: 'quick',
        metricValue: `<html lang>=${$('html').attr('lang')} / hreflang=${selfHreflang.lang}`,
      })
    }
  } else if (!htmlLang) {
    pushCheck({
      severity: 'low',
      category: 'international-html-lang-missing',
      title: '<html lang> absent',
      description:
        'L\'attribut `lang` sur <html> est requis pour l\'accessibilité (WCAG 3.1.1) et renforce la détection de langue par les moteurs.',
      recommendation:
        'Ajouter `<html lang="fr-FR">` (ou la locale correspondante) en tête de chaque page.',
      pointsLost: 0.5,
      effort: 'quick',
    })
  }

  // --- Bidirectional via subPages ---------------------------------------
  // Chaque traduction doit se référencer ET référencer la source. Si une
  // subPage listée en hreflang n'expose pas hreflang vers la page courante,
  // la grappe est asymétrique.
  const subPages = snapshot.subPages ?? []
  if (subPages.length > 0 && hreflangs.length >= 2) {
    const subByHref = new Map<string, string>()
    for (const sp of subPages) {
      subByHref.set(normalizePath(sp.url), sp.html)
    }
    const asymmetric: string[] = []
    for (const h of hreflangs) {
      if (h.lang.toLowerCase() === 'x-default') continue
      const altNormalized = normalizePath(h.href)
      if (altNormalized === currentNormalized) continue
      const altHtml = subByHref.get(altNormalized)
      if (!altHtml) continue
      const alt$ = cheerio.load(altHtml)
      const altHreflangs = alt$('link[rel="alternate"][hreflang]')
        .toArray()
        .map((el) => normalizePath(alt$(el).attr('href') ?? ''))
      if (!altHreflangs.includes(currentNormalized)) {
        asymmetric.push(`${h.lang} (${h.href})`)
      }
    }
    if (asymmetric.length > 0) {
      pushCheck({
        severity: 'high',
        category: 'international-bidirectional',
        title: 'hreflang non bidirectionnels',
        description: `Certaines traductions linkées ne pointent pas back vers la page courante : ${asymmetric.slice(0, 3).join(', ')}. Google invalide la grappe quand la relation n'est pas mutuelle.`,
        recommendation:
          'Sur chaque traduction, inclure un hreflang vers CHAQUE autre traduction + self-reference. Génération automatique depuis un middleware recommandée.',
        pointsLost: 2,
        effort: 'medium',
        metricValue: `${asymmetric.length} asymétrie(s)`,
      })
    }
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
