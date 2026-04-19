/**
 * Phase 10 — Common Mistakes (5 pts)
 *
 * Regression guard pour les pièges classiques : noindex accidentel, mixed
 * content, rel=noopener manquant, canonical incohérent.
 */
import * as cheerio from 'cheerio'
import type { Finding, PhaseResult, CrawlSnapshot } from '../types'

const SCORE_MAX = 5
const PHASE_KEY = 'common_mistakes' as const

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

export async function runCommonMistakesPhase(
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

  // --- noindex ------------------------------------------------------------
  const robotsMeta = $('meta[name="robots"]').attr('content')?.toLowerCase() ?? ''
  const isAdmin = /\/(admin|dashboard|login|auth)\b/.test(finalUrl)
  if (/noindex/.test(robotsMeta) && !isAdmin) {
    pushCheck({
      severity: 'critical',
      category: 'common-noindex',
      title: 'noindex détecté sur page publique',
      description:
        'La balise `<meta name="robots" content="noindex">` empêche l\'indexation Google. Sur une page publique, c\'est presque toujours un accident (staging oublié, build flag qui fuit).',
      recommendation:
        'Retirer la balise `noindex` ou conditionner son ajout uniquement aux environnements non-production.',
      pointsLost: 2,
      effort: 'quick',
    })
  }

  // --- Mixed content (https page -> http resources) ----------------------
  if (finalUrl.startsWith('https://')) {
    const insecureResources = [
      ...$('[src^="http://"]').toArray(),
      ...$('[href^="http://"]').toArray(),
    ].map((el) => $(el).attr('src') ?? $(el).attr('href') ?? '')
    const nonAnchorInsecure = insecureResources.filter(
      (u) => u && !u.startsWith('http://localhost'),
    )
    if (nonAnchorInsecure.length > 0) {
      pushCheck({
        severity: 'high',
        category: 'common-mixed-content',
        title: `Mixed content (${nonAnchorInsecure.length} ressource${nonAnchorInsecure.length > 1 ? 's' : ''})`,
        description:
          'Des ressources http:// sont chargées depuis une page https://. Les navigateurs bloquent ou avertissent l\'utilisateur.',
        recommendation:
          'Forcer toutes les ressources en https:// (ou relative //). Utiliser `Content-Security-Policy: upgrade-insecure-requests` en transition.',
        pointsLost: 1,
        effort: 'quick',
        metricValue: nonAnchorInsecure.slice(0, 3).join(', '),
      })
    }
  }

  // --- rel="noopener" on external _blank links ---------------------------
  const externalBlanks = $('a[target="_blank"]')
    .toArray()
    .filter((el) => {
      const href = $(el).attr('href') ?? ''
      if (!/^https?:\/\//i.test(href)) return false
      try {
        return new URL(href).host !== new URL(finalUrl).host
      } catch {
        return false
      }
    })
  const missingNoopener = externalBlanks.filter((el) => {
    const rel = ($(el).attr('rel') ?? '').toLowerCase()
    return !/noopener/.test(rel)
  })
  if (externalBlanks.length >= 3 && missingNoopener.length / externalBlanks.length > 0.3) {
    pushCheck({
      severity: 'low',
      category: 'common-noopener',
      title: 'rel="noopener" manquant sur des liens externes _blank',
      description:
        'Un lien externe en `target="_blank"` sans `rel="noopener"` peut permettre à la page cible d\'accéder à `window.opener` — risque de tabnabbing.',
      recommendation:
        'Ajouter `rel="noopener noreferrer"` sur tous les liens externes `target="_blank"`.',
      pointsLost: 0.5,
      effort: 'quick',
      metricValue: `${missingNoopener.length}/${externalBlanks.length} sans noopener`,
    })
  }

  // --- Canonical coherence ----------------------------------------------
  const canonical = $('link[rel="canonical"]').attr('href')?.trim()
  if (canonical) {
    try {
      const canonicalAbsolute = new URL(canonical, finalUrl).toString()
      const normalize = (u: string) =>
        u.replace(/\/$/, '').replace(/^http:/, 'https:')
      if (
        normalize(canonicalAbsolute) !== normalize(finalUrl) &&
        new URL(canonicalAbsolute).host === new URL(finalUrl).host
      ) {
        pushCheck({
          severity: 'medium',
          category: 'common-canonical',
          title: 'Canonical incohérent avec l\'URL courante',
          description:
            'La balise canonical pointe vers une URL différente de la page actuelle alors qu\'elles sont sur le même domaine. Cela peut diluer le signal ou désindexer cette page.',
          recommendation:
            'Vérifier si c\'est intentionnel (canonicalisation delibérée). Sinon corriger la canonical pour qu\'elle soit self-referential.',
          pointsLost: 1,
          effort: 'medium',
          metricValue: canonicalAbsolute,
        })
      }
    } catch {
      /* ignore */
    }
  }

  // --- Multiple <title> tags ---------------------------------------------
  const titleCount = $('head > title, title').length
  if (titleCount > 1) {
    pushCheck({
      severity: 'medium',
      category: 'common-duplicate-title',
      title: `${titleCount} balises <title> dans la page`,
      description:
        'Plusieurs balises <title> : les crawlers ne savent pas laquelle choisir et Google prend généralement la première. Signal d\'erreur de templating (layout double-inclus).',
      recommendation: 'Conserver une seule <title> dans <head>.',
      pointsLost: 0.5,
      effort: 'quick',
      metricValue: `${titleCount} <title>`,
    })
  }

  // --- Images sans alt attribute ----------------------------------------
  const allImgs = $('img').toArray()
  if (allImgs.length >= 5) {
    const missingAlt = allImgs.filter((el) => {
      const alt = $(el).attr('alt')
      return alt === undefined
    })
    const ratio = missingAlt.length / allImgs.length
    if (ratio > 0.3) {
      pushCheck({
        severity: 'medium',
        category: 'common-img-alt',
        title: 'Images sans attribut alt',
        description: `${missingAlt.length}/${allImgs.length} images n'ont pas d'attribut \`alt\`. Accessibilité WCAG 1.1.1 + signal SEO image search.`,
        recommendation:
          'Ajouter `alt=""` (décoratif) ou `alt="description concise"` sur chaque image. Jamais omettre l\'attribut.',
        pointsLost: 0.5,
        effort: 'medium',
        metricValue: `${missingAlt.length}/${allImgs.length} sans alt`,
      })
    }
  }

  // --- Noindex + canonical contradictoires -------------------------------
  if (/noindex/.test(robotsMeta) && canonical) {
    try {
      const canonicalAbsolute = new URL(canonical, finalUrl).toString()
      const normalize = (u: string) => u.replace(/\/+$/, '')
      if (normalize(canonicalAbsolute) === normalize(finalUrl)) {
        pushCheck({
          severity: 'high',
          category: 'common-noindex-canonical',
          title: 'noindex + canonical self-référent contradictoires',
          description:
            'La page est marquée `noindex` tout en ayant une canonical pointant vers elle-même. Les deux directives se contredisent ; Google peut ignorer la canonical et exclure la page des signaux.',
          recommendation:
            'Choisir : soit `noindex` (pas de canonical nécessaire), soit indexable avec canonical self-ref. Sur une page désindexée délibérément, la canonical doit pointer vers la version consolidée.',
          pointsLost: 1,
          effort: 'quick',
        })
      }
    } catch {
      /* ignore */
    }
  }

  // --- Navigation JS-only (aucun <a href> dans <nav>) --------------------
  const navs = $('nav').toArray()
  if (navs.length > 0) {
    const navWithoutHref = navs.filter((nav) => {
      const hrefLinks = $(nav).find('a[href]').length
      const onclickLinks =
        $(nav).find('[onclick], button[role="link"], [role="button"]').length
      return hrefLinks === 0 && onclickLinks >= 3
    })
    if (navWithoutHref.length > 0) {
      pushCheck({
        severity: 'medium',
        category: 'common-js-only-nav',
        title: 'Navigation sans <a href> détectée',
        description:
          'Au moins un <nav> ne contient aucun lien <a href> mais utilise des onclick / role=button. Les crawlers et les moteurs IA n\'exécutent pas le JS client dans la majorité des cas — la navigation est invisible.',
        recommendation:
          'Toujours utiliser `<a href="...">` pour la navigation (même avec un onclick additionnel). Le fallback HTML est crawlable.',
        pointsLost: 1,
        effort: 'medium',
      })
    }
  }

  // Charger les subPages une fois pour les vérifications multi-page
  const subPages = snapshot.subPages ?? []

  // --- Redirections en chaîne (via statuts 3xx dans subPages BFS) ----------
  // Quand BFS crawle les pages, fetchWithTimeout suit les redirects et retourne
  // l'URL finale. Si un lien interne depuis la home (ou des subPages) pointe
  // vers une URL intermédiaire de redirection, on le détecte via les statuts 3xx.
  if (subPages.length > 0) {
    const origin = new URL(finalUrl).origin
    // Pages qui ont retourné un 3xx (= URL intermédiaire de redirect visible)
    const redirectPages = subPages.filter((sp) => sp.status >= 300 && sp.status < 400)
    if (redirectPages.length > 0) {
      // Compter combien de liens internes (home + subPages) pointent vers ces redirects
      const redirectSet = new Set(redirectPages.map((sp) => {
        try { return new URL(sp.url).pathname.replace(/\/+$/, '') || '/' } catch { return sp.url }
      }))
      let redirectLinksCount = 0
      const sampledRedirects: string[] = []
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href') ?? ''
        if (!href || href.startsWith('#')) return
        try {
          const u = new URL(href, finalUrl)
          if (u.origin !== origin) return
          const path = u.pathname.replace(/\/+$/, '') || '/'
          if (redirectSet.has(path)) {
            redirectLinksCount++
            if (sampledRedirects.length < 3) sampledRedirects.push(u.pathname)
          }
        } catch { /* ignore */ }
      })
      if (redirectLinksCount >= 2) {
        pushCheck({
          severity: 'medium',
          category: 'common-redirect-chain',
          title: `Liens internes vers des redirections (${redirectLinksCount})`,
          description: `${redirectLinksCount} lien(s) interne(s) pointent vers des URLs qui redirigent (3xx). Chaque redirection inutile dilue le PageRank et ralentit le crawl. Exemples : ${sampledRedirects.join(', ')}.`,
          recommendation:
            'Mettre à jour les liens internes pour qu\'ils pointent directement vers l\'URL de destination finale (2xx). Évite les chaînes et préserve le passage de jus.',
          pointsLost: 0.5,
          effort: 'medium',
          metricValue: `${redirectLinksCount} lien(s) → redirect`,
        })
      }
    }
  }

  // --- Broken internal links (primary → subPages) ------------------------
  if (subPages.length > 0) {
    const origin = new URL(finalUrl).origin
    const pathByStatus = new Map<string, number>()
    for (const sp of subPages) {
      try {
        const path = new URL(sp.url).pathname.replace(/\/+$/, '') || '/'
        pathByStatus.set(path, sp.status)
      } catch {
        /* ignore */
      }
    }
    const broken: string[] = []
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') ?? ''
      if (!href || href.startsWith('#')) return
      try {
        const u = new URL(href, finalUrl)
        if (u.origin !== origin) return
        const path = u.pathname.replace(/\/+$/, '') || '/'
        const status = pathByStatus.get(path)
        if (status !== undefined && status >= 400) {
          broken.push(u.pathname)
        }
      } catch {
        /* ignore */
      }
    })
    const uniqueBroken = Array.from(new Set(broken))
    if (uniqueBroken.length > 0) {
      pushCheck({
        severity: 'high',
        category: 'common-broken-links',
        title: `Liens internes cassés (${uniqueBroken.length})`,
        description: `La page link vers des URLs internes qui retournent un code d'erreur : ${uniqueBroken.slice(0, 3).join(', ')}${uniqueBroken.length > 3 ? '…' : ''}.`,
        recommendation:
          'Rétablir les pages (2xx) ou rediriger en 301 vers l\'équivalent actuel. Nettoyer les références dans les menus / contenus.',
        pointsLost: 1,
        effort: 'medium',
        metricValue: `${uniqueBroken.length} lien(s) cassé(s)`,
      })
    }
  }

  // --- Duplicate H1 / <title> across subPages ----------------------------
  if (subPages.length >= 5) {
    const titleCounts = new Map<string, number>()
    for (const sp of subPages) {
      const $sp = cheerio.load(sp.html)
      const spTitle = $sp('head > title').first().text().trim().toLowerCase()
      if (spTitle) {
        titleCounts.set(spTitle, (titleCounts.get(spTitle) ?? 0) + 1)
      }
    }
    const maxDup = Math.max(0, ...Array.from(titleCounts.values()))
    if (maxDup >= 3) {
      pushCheck({
        severity: 'medium',
        category: 'common-duplicate-titles',
        title: 'Titres dupliqués entre plusieurs pages',
        description: `${maxDup} sous-pages partagent exactement le même <title>. Problème de templating (pas de substitution du {{pageTitle}}) — cannibalisation de SERP et signal ambigu.`,
        recommendation:
          'Injecter un titre unique par page : {{nom produit}} | {{Marque}}, ou {{H1}} | {{Marque}}.',
        pointsLost: 0.5,
        effort: 'medium',
        metricValue: `${maxDup} pages identiques`,
      })
    }
  }

  score = Math.max(0, Math.min(SCORE_MAX, score))

  return {
    phaseKey: PHASE_KEY,
    score,
    scoreMax: SCORE_MAX,
    status: 'completed',
    summary: `Phase Common Mistakes — ${findings.length} constat${findings.length > 1 ? 's' : ''}, score ${score}/${SCORE_MAX}`,
    findings,
  }
}

export const COMMON_MISTAKES_SCORE_MAX = SCORE_MAX
