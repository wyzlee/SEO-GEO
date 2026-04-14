/**
 * Phase 1 — Technical SEO (12 pts)
 *
 * Baseline checks : meta tags, canonical, lang, viewport, charset, favicons,
 * OpenGraph, Twitter Cards, sitemap.xml, robots.txt. Rubric in
 * .claude/docs/audit-engine.md.
 *
 * Input type: URL (crawl snapshot). Code-mode variant lands in V1.5 when
 * upload/GitHub audits ship (Sprint 06).
 */
import * as cheerio from 'cheerio'
import type { Finding, PhaseResult, CrawlSnapshot } from '../types'

const SCORE_MAX = 12
const PHASE_KEY = 'technical' as const

interface Check {
  severity: Finding['severity']
  category: string
  title: string
  description: string
  recommendation: string
  pointsLost: number
  effort?: Finding['effort']
  locationUrl?: string
  metricValue?: string
  metricTarget?: string
}

function toFinding(check: Check): Finding {
  return {
    phaseKey: PHASE_KEY,
    severity: check.severity,
    category: check.category,
    title: check.title,
    description: check.description,
    recommendation: check.recommendation,
    pointsLost: check.pointsLost,
    effort: check.effort,
    locationUrl: check.locationUrl,
    metricValue: check.metricValue,
    metricTarget: check.metricTarget,
  }
}

function hasDisallowRoot(robotsTxt: string): boolean {
  const lines = robotsTxt
    .split('\n')
    .map((l) => l.split('#')[0].trim().toLowerCase())

  let currentAgentIsWildcard = false
  for (const line of lines) {
    if (line.startsWith('user-agent:')) {
      const agent = line.slice('user-agent:'.length).trim()
      currentAgentIsWildcard = agent === '*'
      continue
    }
    if (currentAgentIsWildcard && line.startsWith('disallow:')) {
      const path = line.slice('disallow:'.length).trim()
      if (path === '/') return true
    }
  }
  return false
}

export async function runTechnicalPhase(
  snapshot: CrawlSnapshot,
): Promise<PhaseResult> {
  const findings: Finding[] = []
  let score = SCORE_MAX
  const $ = cheerio.load(snapshot.html)
  const finalUrl = snapshot.finalUrl

  const pushCheck = (check: Check) => {
    findings.push(toFinding({ ...check, locationUrl: check.locationUrl ?? finalUrl }))
    score -= check.pointsLost
  }

  // --- <title> ------------------------------------------------------------
  const title = ($('head > title').first().text() || '').trim()
  if (!title) {
    pushCheck({
      severity: 'high',
      category: 'technical-title',
      title: 'Balise <title> absente',
      description:
        'La page n\'expose pas de balise `<title>`. C\'est l\'un des signaux les plus déterminants pour les SERP Google et pour l\'indexation des moteurs IA.',
      recommendation:
        'Ajouter une balise `<title>` de 50 à 60 caractères, mot-clé principal en début.',
      pointsLost: 1,
      effort: 'quick',
    })
  } else {
    const len = title.length
    if (len < 20 || len > 70) {
      pushCheck({
        severity: 'medium',
        category: 'technical-title',
        title:
          len < 20
            ? `Balise <title> trop courte (${len} car.)`
            : `Balise <title> trop longue (${len} car.)`,
        description:
          'La longueur optimale est 50-60 caractères. Trop court, le titre n\'est pas assez descriptif ; trop long, il est tronqué en SERP.',
        recommendation:
          'Réécrire la balise entre 50 et 60 caractères, avec le mot-clé principal en première moitié.',
        pointsLost: 2,
        effort: 'quick',
        metricValue: `${len} car.`,
        metricTarget: '50–60 car.',
      })
    }
  }

  // --- <meta name="description"> ------------------------------------------
  const metaDesc = ($('meta[name="description"]').attr('content') || '').trim()
  if (!metaDesc) {
    pushCheck({
      severity: 'medium',
      category: 'technical-meta',
      title: 'Meta description absente',
      description:
        'La meta description améliore le CTR en SERP. Google peut la regénérer, mais la contrôler reste préférable.',
      recommendation: 'Ajouter une meta description de 150 à 160 caractères.',
      pointsLost: 1,
      effort: 'quick',
    })
  } else if (metaDesc.length > 180) {
    pushCheck({
      severity: 'low',
      category: 'technical-meta',
      title: `Meta description trop longue (${metaDesc.length} car.)`,
      description:
        'Au-delà de 180 caractères, Google tronque la description en SERP.',
      recommendation: 'Raccourcir à 150-160 caractères.',
      pointsLost: 1,
      effort: 'quick',
      metricValue: `${metaDesc.length} car.`,
      metricTarget: '150–160 car.',
    })
  }

  // --- <link rel="canonical"> ---------------------------------------------
  const canonical = ($('link[rel="canonical"]').attr('href') || '').trim()
  if (canonical) {
    try {
      const canonicalAbsolute = new URL(canonical, finalUrl).toString()
      const canonicalHost = new URL(canonicalAbsolute).host
      const currentHost = new URL(finalUrl).host
      if (canonicalHost !== currentHost) {
        pushCheck({
          severity: 'high',
          category: 'technical-canonical',
          title: 'Canonical pointe vers un autre domaine',
          description: `La balise canonical (${canonicalAbsolute}) cible un domaine différent de l'URL courante (${finalUrl}).`,
          recommendation:
            'Vérifier que la canonical pointe bien vers la version officielle de la page, et pas un autre site.',
          pointsLost: 2,
          effort: 'medium',
          metricValue: canonicalHost,
          metricTarget: currentHost,
        })
      }
    } catch {
      // malformed canonical — treat as absent below
    }
  }

  // --- <html lang> --------------------------------------------------------
  const htmlLang = $('html').attr('lang')
  if (!htmlLang) {
    pushCheck({
      severity: 'low',
      category: 'technical-lang',
      title: 'Attribut `lang` absent sur <html>',
      description:
        'L\'attribut `lang` aide les moteurs de recherche et les lecteurs d\'écran à identifier la langue du contenu.',
      recommendation: 'Ajouter `<html lang="fr">` (ou la langue pertinente).',
      pointsLost: 1,
      effort: 'quick',
    })
  }

  // --- <meta name="viewport"> ---------------------------------------------
  if (!$('meta[name="viewport"]').attr('content')) {
    pushCheck({
      severity: 'medium',
      category: 'technical-viewport',
      title: 'Meta viewport absente',
      description:
        'Sans meta viewport, la page n\'est pas correctement rendue sur mobile — signal négatif mobile-first indexing.',
      recommendation:
        'Ajouter `<meta name="viewport" content="width=device-width, initial-scale=1">`.',
      pointsLost: 1,
      effort: 'quick',
    })
  }

  // --- <meta charset> -----------------------------------------------------
  const hasCharset = $('meta[charset]').length > 0 ||
    $('meta[http-equiv="Content-Type"]').length > 0
  if (!hasCharset) {
    pushCheck({
      severity: 'low',
      category: 'technical-charset',
      title: 'Déclaration de charset absente',
      description:
        'Sans `<meta charset>`, l\'encodage des caractères peut être mal détecté et des accents peuvent apparaître corrompus.',
      recommendation: 'Ajouter `<meta charset="utf-8">` en premier dans le `<head>`.',
      pointsLost: 0.5,
      effort: 'quick',
    })
  }

  // --- Favicons -----------------------------------------------------------
  const hasFavicon =
    $('link[rel="icon"]').length > 0 || $('link[rel="shortcut icon"]').length > 0
  if (!hasFavicon) {
    pushCheck({
      severity: 'low',
      category: 'technical-icons',
      title: 'Favicon absente',
      description:
        'La favicon est un signal de qualité/trust et apparaît dans les onglets + SERP.',
      recommendation: 'Ajouter `<link rel="icon" href="/favicon.ico">`.',
      pointsLost: 0.5,
      effort: 'quick',
    })
  }
  if (!$('link[rel="apple-touch-icon"]').length) {
    pushCheck({
      severity: 'info',
      category: 'technical-icons',
      title: 'apple-touch-icon absent',
      description:
        'Les appareils iOS utilisent cette icône quand une page est ajoutée à l\'écran d\'accueil.',
      recommendation:
        'Ajouter `<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">`.',
      pointsLost: 0.5,
      effort: 'quick',
    })
  }

  // --- Open Graph ---------------------------------------------------------
  const ogFields: Array<{ name: string; attr: string }> = [
    { name: 'og:title', attr: 'og:title' },
    { name: 'og:description', attr: 'og:description' },
    { name: 'og:image', attr: 'og:image' },
    { name: 'og:url', attr: 'og:url' },
    { name: 'og:type', attr: 'og:type' },
  ]
  for (const { name, attr } of ogFields) {
    const content = $(`meta[property="${attr}"]`).attr('content')
    if (!content) {
      pushCheck({
        severity: 'medium',
        category: 'technical-og',
        title: `${name} absent`,
        description:
          'Les balises Open Graph sont utilisées par les réseaux sociaux et par certains moteurs IA pour afficher une prévisualisation riche.',
        recommendation: `Ajouter \`<meta property="${attr}" content="...">\` dans le \`<head>\`.`,
        pointsLost: 1,
        effort: 'quick',
      })
    } else if (attr === 'og:image') {
      try {
        const absolute = new URL(content, finalUrl).toString()
        if (!/^https?:\/\//i.test(absolute)) {
          pushCheck({
            severity: 'low',
            category: 'technical-og',
            title: 'og:image n\'est pas une URL absolue',
            description:
              'Les crawlers sociaux attendent une URL absolue pour résoudre correctement l\'image.',
            recommendation:
              'Utiliser l\'URL complète (`https://…`) au lieu d\'un chemin relatif.',
            pointsLost: 1,
            effort: 'quick',
          })
        }
      } catch {
        // invalid URL
      }
    }
  }

  // --- Twitter Cards ------------------------------------------------------
  const twitterFields = [
    'twitter:card',
    'twitter:title',
    'twitter:description',
    'twitter:image',
  ]
  for (const name of twitterFields) {
    if (!$(`meta[name="${name}"]`).attr('content')) {
      pushCheck({
        severity: 'low',
        category: 'technical-twitter',
        title: `${name} absent`,
        description:
          'Les Twitter Cards améliorent l\'affichage des partages sur X/Twitter et autres plateformes.',
        recommendation: `Ajouter \`<meta name="${name}" content="...">\`.`,
        pointsLost: 0.5,
        effort: 'quick',
      })
    }
  }

  // --- robots.txt ---------------------------------------------------------
  if (snapshot.robotsTxt === null) {
    pushCheck({
      severity: 'medium',
      category: 'technical-robots',
      title: 'robots.txt introuvable',
      description:
        'L\'absence de robots.txt laisse les crawlers deviner — préférer un fichier explicite, même minimal.',
      recommendation:
        'Ajouter `/robots.txt` avec au moins `User-agent: *` + `Allow: /` + `Sitemap: <url>`.',
      pointsLost: 1,
      effort: 'quick',
    })
  } else if (hasDisallowRoot(snapshot.robotsTxt)) {
    pushCheck({
      severity: 'critical',
      category: 'technical-robots',
      title: 'robots.txt bloque tout le site',
      description:
        'Le robots.txt contient `Disallow: /` pour `User-agent: *` — toutes les pages sont invisibles des crawlers.',
      recommendation:
        'Retirer le blocage global, ne conserver que les exclusions ciblées (ex: `/admin`).',
      pointsLost: 3,
      effort: 'quick',
    })
  }

  // --- sitemap.xml --------------------------------------------------------
  if (snapshot.sitemapXml === null) {
    pushCheck({
      severity: 'medium',
      category: 'technical-sitemap',
      title: 'sitemap.xml introuvable',
      description:
        'Un sitemap aide Google et les crawlers à découvrir toutes les URLs importantes du site.',
      recommendation:
        'Générer un `/sitemap.xml` listant toutes les pages indexables, avec `lastmod` à jour.',
      pointsLost: 2,
      effort: 'medium',
    })
  } else {
    const looksEmpty =
      !/<url>/i.test(snapshot.sitemapXml) &&
      !/<sitemap>/i.test(snapshot.sitemapXml)
    if (looksEmpty) {
      pushCheck({
        severity: 'low',
        category: 'technical-sitemap',
        title: 'sitemap.xml apparaît vide',
        description:
          'Le fichier existe mais ne contient ni `<url>` ni `<sitemap>` — il ne remplit pas son rôle.',
        recommendation:
          'Vérifier la génération du sitemap. Il doit lister au moins les pages principales avec `loc` + `lastmod`.',
        pointsLost: 1,
        effort: 'medium',
      })
    }
  }

  // Clamp score between 0 and SCORE_MAX
  score = Math.max(0, Math.min(SCORE_MAX, score))

  return {
    phaseKey: PHASE_KEY,
    score,
    scoreMax: SCORE_MAX,
    status: 'completed',
    summary: `Phase technique — ${findings.length} constat${findings.length > 1 ? 's' : ''}, score ${score}/${SCORE_MAX}`,
    findings,
  }
}

export const TECHNICAL_SCORE_MAX = SCORE_MAX
