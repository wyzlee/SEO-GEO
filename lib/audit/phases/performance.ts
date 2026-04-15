/**
 * Phase 8 — Performance CWV 2026 (8 pts)
 *
 * Proxies statiques V1 (pas de CrUX / Lighthouse headless) :
 *  - HashRouter / SPA sans SSR (critical)
 *  - Images modernes, lazy loading, width/height
 *  - Preconnect, preload, scripts async/defer
 *
 * LCP / INP / CLS réels via CrUX arriveront V1.5 (nécessite CrUX API key ou
 * Lighthouse en worker séparé).
 */
import * as cheerio from 'cheerio'
import type { Finding, PhaseResult, CrawlSnapshot } from '../types'

const SCORE_MAX = 8
const PHASE_KEY = 'performance' as const

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

export async function runPerformancePhase(
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

  // --- HashRouter detection (critical) -----------------------------------
  const anchors = $('a[href]').toArray()
  const hashLinks = anchors.filter((el) => {
    const href = $(el).attr('href') ?? ''
    return /^#\/\w/.test(href) || /^\/#\/\w/.test(href)
  })
  if (hashLinks.length >= 3) {
    pushCheck({
      severity: 'critical',
      category: 'performance-hashrouter',
      title: 'HashRouter détecté',
      description:
        'Les URLs en `#/…` ne sont pas comprises par les crawlers : toutes les routes sont agrégées en une seule page pour Google et les moteurs IA.',
      recommendation:
        'Migrer vers un router history-mode (Next.js routing, React Router history, Vue Router history). Impact SEO majeur.',
      pointsLost: 3,
      effort: 'heavy',
    })
  }

  // --- SPA sans SSR (warn) -----------------------------------------------
  const bodyText = ($('body').text() || '').trim()
  const hasContentInHtml = bodyText.length > 200
  const hasNoscriptFallback = $('noscript').length > 0
  if (!hasContentInHtml && !hasNoscriptFallback) {
    pushCheck({
      severity: 'high',
      category: 'performance-ssr',
      title: 'Rendu JS-only probable (pas de SSR)',
      description:
        'Le HTML initial contient peu de contenu texte et pas de <noscript>. GPTBot et Perplexity rendent peu de JS — contenu invisible.',
      recommendation:
        'Passer en SSR ou Static Generation (Next.js App Router default, Nuxt, Astro, Remix). Minimum un `<noscript>` avec le contenu essentiel.',
      pointsLost: 2,
      effort: 'heavy',
    })
  }

  // --- Images modernes ---------------------------------------------------
  const imgs = $('img').toArray()
  if (imgs.length > 0) {
    const modernImgs = imgs.filter((el) => {
      const src = $(el).attr('src') ?? $(el).attr('srcset') ?? ''
      return /\.(webp|avif)(\?|$|\s)/i.test(src)
    })
    if (modernImgs.length === 0) {
      pushCheck({
        severity: 'low',
        category: 'performance-images-format',
        title: 'Aucune image au format WebP / AVIF',
        description:
          'Les formats WebP et AVIF réduisent le poids des images de 30-50 % par rapport au JPG/PNG. Impact direct sur LCP.',
        recommendation:
          'Convertir les images principales en WebP (AVIF si build compatible). next/image gère ça automatiquement.',
        pointsLost: 0.5,
        effort: 'medium',
        metricValue: `0 / ${imgs.length} images modernes`,
      })
    }

    // Lazy loading below-the-fold
    const lazyImgs = imgs.filter(
      (el) => $(el).attr('loading')?.toLowerCase() === 'lazy',
    )
    if (imgs.length >= 4 && lazyImgs.length === 0) {
      pushCheck({
        severity: 'low',
        category: 'performance-lazy-loading',
        title: 'Lazy loading absent des images',
        description:
          'Sans `loading="lazy"`, les images hors écran ralentissent le premier chargement.',
        recommendation:
          'Ajouter `loading="lazy"` sur toutes les images below-the-fold.',
        pointsLost: 0.5,
        effort: 'quick',
      })
    }

    // CLS : images sans width/height
    const imgsWithoutDim = imgs.filter(
      (el) => !$(el).attr('width') || !$(el).attr('height'),
    )
    if (imgsWithoutDim.length / imgs.length > 0.3) {
      pushCheck({
        severity: 'medium',
        category: 'performance-cls',
        title: 'Images sans width/height (risque CLS)',
        description:
          'Les images sans dimensions explicites provoquent des décalages de layout (Cumulative Layout Shift), signal Core Web Vitals négatif.',
        recommendation:
          'Définir `width` et `height` sur chaque <img> (les valeurs intrinsèques, le CSS s\'occupe du responsive).',
        pointsLost: 1,
        effort: 'quick',
        metricValue: `${imgsWithoutDim.length}/${imgs.length} sans dim.`,
      })
    }
  }

  // --- Preconnect / preload ---------------------------------------------
  const fonts = $('link[rel="preload"][as="font"]').length > 0
  const preconnects = $('link[rel="preconnect"]').length
  if (preconnects === 0 && $('link[rel="stylesheet"][href^="http"]').length > 0) {
    pushCheck({
      severity: 'low',
      category: 'performance-preconnect',
      title: 'Aucune directive preconnect',
      description:
        'Les assets critiques servis depuis un autre domaine bénéficient d\'un `<link rel="preconnect">` pour anticiper la résolution DNS + TLS.',
      recommendation:
        'Ajouter `<link rel="preconnect" href="https://cdn.exemple.com">` pour chaque domaine externe critique.',
      pointsLost: 0.5,
      effort: 'quick',
    })
  }
  if (!fonts && $('link[href*=".woff2"]').length > 0) {
    pushCheck({
      severity: 'low',
      category: 'performance-font-preload',
      title: 'Fonts critiques sans preload',
      description:
        'Les fonts web chargées sans `rel="preload"` retardent la disponibilité du texte (FOIT/FOUT) et peuvent dégrader LCP.',
      recommendation:
        'Ajouter `<link rel="preload" as="font" type="font/woff2" href="..." crossorigin>` pour les fonts critiques.',
      pointsLost: 0.5,
      effort: 'quick',
    })
  }

  // --- Scripts async / defer ---------------------------------------------
  const blockingScripts = $('head script[src]').filter((_, el) => {
    const $el = $(el)
    return !$el.attr('async') && !$el.attr('defer')
  })
  if (blockingScripts.length > 0) {
    pushCheck({
      severity: 'medium',
      category: 'performance-scripts',
      title: 'Scripts bloquants dans <head>',
      description:
        'Les scripts externes sans `async` ni `defer` bloquent le parsing HTML — impact INP + LCP.',
      recommendation:
        'Ajouter `defer` (préférable pour scripts déterministes) ou `async` sur chaque <script src>. Si possible, déplacer en fin de `<body>`.',
      pointsLost: 0.5,
      effort: 'quick',
      metricValue: `${blockingScripts.length} script(s) bloquant(s)`,
    })
  }

  score = Math.max(0, Math.min(SCORE_MAX, score))

  return {
    phaseKey: PHASE_KEY,
    score,
    scoreMax: SCORE_MAX,
    status: 'completed',
    summary: `Phase Performance — ${findings.length} constat${findings.length > 1 ? 's' : ''}, score ${score}/${SCORE_MAX}`,
    findings,
  }
}

export const PERFORMANCE_SCORE_MAX = SCORE_MAX
