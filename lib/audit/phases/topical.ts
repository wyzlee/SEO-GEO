/**
 * Phase 9 — Topical Authority (6 pts)
 *
 * V1.5 URL mode : maillage interne + anchors (single page) + signaux
 * multi-page issus de `snapshot.subPages` — orphelines, thin content,
 * couverture des clusters depuis la home.
 */
import * as cheerio from 'cheerio'
import type {
  Finding,
  PhaseResult,
  CrawlSnapshot,
  SubPageSnapshot,
} from '../types'

const SCORE_MAX = 6
const PHASE_KEY = 'topical' as const

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

const GENERIC_ANCHORS = [
  'ici',
  'cliquez',
  'cliquez ici',
  'voir plus',
  'en savoir plus',
  'lire la suite',
  'click here',
  'read more',
  'learn more',
  'more',
]

function normalizePath(raw: string, origin: string): string | null {
  try {
    const u = new URL(raw, origin)
    if (u.origin !== origin) return null
    const path = u.pathname.replace(/\/+$/, '')
    return path === '' ? '/' : path
  } catch {
    return null
  }
}

function extractInternalLinkPaths(html: string, origin: string): Set<string> {
  const $ = cheerio.load(html)
  const set = new Set<string>()
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? ''
    if (!href || href.startsWith('#') || href.startsWith('mailto:')) return
    const path = normalizePath(href, origin)
    if (path) set.add(path)
  })
  return set
}

function bodyWordCount(html: string): number {
  const $ = cheerio.load(html)
  const txt = $('body').text().replace(/\s+/g, ' ').trim()
  if (!txt) return 0
  return txt.split(' ').filter(Boolean).length
}

function detectUrlClusters(
  paths: string[],
  minSize = 4,
): Map<string, string[]> {
  const groups = new Map<string, string[]>()
  for (const p of paths) {
    const segments = p.split('/').filter(Boolean)
    if (segments.length < 2) continue
    const prefix = `/${segments[0]}`
    if (!groups.has(prefix)) groups.set(prefix, [])
    groups.get(prefix)!.push(p)
  }
  const clusters = new Map<string, string[]>()
  for (const [prefix, pages] of groups) {
    if (pages.length >= minSize) clusters.set(prefix, pages)
  }
  return clusters
}

const AUTHORITY_DOMAIN_PATTERNS: RegExp[] = [
  /\.gov(\.[a-z]{2})?$/i,
  /\.edu(\.[a-z]{2})?$/i,
  /(^|\.)wikipedia\.org$/i,
  /(^|\.)wikidata\.org$/i,
  /(^|\.)britannica\.com$/i,
  /(^|\.)who\.int$/i,
  /(^|\.)europa\.eu$/i,
  /(^|\.)insee\.fr$/i,
  /(^|\.)nature\.com$/i,
  /(^|\.)sciencedirect\.com$/i,
  /(^|\.)nih\.gov$/i,
  /(^|\.)ieee\.org$/i,
  /(^|\.)acm\.org$/i,
]

function extractExternalAuthorityLinks(
  html: string,
  currentOrigin: string,
): { total: number; authority: number } {
  const $ = cheerio.load(html)
  let total = 0
  let authority = 0
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? ''
    if (!href.startsWith('http')) return
    try {
      const u = new URL(href)
      if (u.origin === currentOrigin) return
      total++
      if (AUTHORITY_DOMAIN_PATTERNS.some((re) => re.test(u.hostname))) {
        authority++
      }
    } catch {
      /* ignore */
    }
  })
  return { total, authority }
}

function computeInboundCounts(
  primaryHtml: string,
  subPages: SubPageSnapshot[],
  origin: string,
): Map<string, number> {
  // For each subPage path, count how many OTHER documents link to it.
  const subPagePaths = subPages
    .map((sp) => normalizePath(sp.url, origin))
    .filter((p): p is string => p !== null)
  const inbound = new Map<string, number>(subPagePaths.map((p) => [p, 0]))

  const addFrom = (html: string, excludePath: string | null) => {
    const links = extractInternalLinkPaths(html, origin)
    for (const path of links) {
      if (excludePath && path === excludePath) continue
      if (inbound.has(path)) inbound.set(path, inbound.get(path)! + 1)
    }
  }

  addFrom(primaryHtml, null)
  for (const sp of subPages) {
    const selfPath = normalizePath(sp.url, origin)
    addFrom(sp.html, selfPath)
  }
  return inbound
}

export async function runTopicalPhase(
  snapshot: CrawlSnapshot,
): Promise<PhaseResult> {
  const findings: Finding[] = []
  let score = SCORE_MAX
  const $ = cheerio.load(snapshot.html)
  const finalUrl = snapshot.finalUrl
  const currentHost = new URL(finalUrl).host

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

  const anchors = $('a[href]')
    .toArray()
    .map((el) => ({
      href: $(el).attr('href') ?? '',
      text: $(el).text().trim().toLowerCase(),
    }))
    .filter((a) => a.href && a.text)

  const internal = anchors.filter((a) => {
    if (a.href.startsWith('/')) return true
    if (a.href.startsWith('.')) return true
    try {
      return new URL(a.href, finalUrl).host === currentHost
    } catch {
      return false
    }
  })
  const external = anchors.filter((a) => !internal.includes(a))

  // --- Internal / external ratio ----------------------------------------
  if (anchors.length >= 10 && external.length > internal.length * 0.5) {
    pushCheck({
      severity: 'low',
      category: 'topical-linking-ratio',
      title: 'Trop de liens externes par rapport aux liens internes',
      description:
        'Un ratio liens internes / externes ≥ 4:1 favorise le passage de jus SEO entre pages d\'un même site. Ici le ratio est trop faible.',
      recommendation:
        'Ajouter des liens internes vers pages apparentées (pillar / cluster / catégorie) dans le contenu éditorial.',
      pointsLost: 1,
      effort: 'medium',
      metricValue: `${internal.length} internes vs ${external.length} externes`,
      metricTarget: 'ratio ≥ 4:1',
    })
  }

  // --- Anchor text diversity ---------------------------------------------
  if (internal.length >= 6) {
    const textCounts = new Map<string, number>()
    internal.forEach((a) => textCounts.set(a.text, (textCounts.get(a.text) ?? 0) + 1))
    const maxCount = Math.max(...Array.from(textCounts.values()))
    const ratio = maxCount / internal.length
    if (ratio > 0.8) {
      pushCheck({
        severity: 'medium',
        category: 'topical-anchor-overopt',
        title: 'Anchor text sur-optimisé',
        description:
          'Plus de 80 % des liens internes utilisent le même anchor text. Signal de sur-optimisation ou de navigation dupliquée.',
        recommendation:
          'Varier les anchors — utiliser le contexte éditorial plutôt qu\'un mot-clé répété.',
        pointsLost: 1,
        effort: 'medium',
        metricValue: `${Math.round(ratio * 100)} % même anchor`,
      })
    }
  }

  // --- Anchor text descriptivité ----------------------------------------
  if (anchors.length >= 8) {
    const genericCount = anchors.filter((a) =>
      GENERIC_ANCHORS.some((g) => a.text === g || a.text.endsWith(` ${g}`)),
    ).length
    const ratio = genericCount / anchors.length
    if (ratio > 0.2) {
      pushCheck({
        severity: 'medium',
        category: 'topical-anchor-generic',
        title: 'Anchors génériques fréquents',
        description: `Plus de 20 % des liens utilisent un anchor générique ("ici", "cliquez", "voir plus"). Les crawlers et les moteurs IA y lisent peu de contexte sémantique.`,
        recommendation:
          'Remplacer les anchors génériques par des titres descriptifs (ex: "Guide complet sur la GEO" plutôt que "voir plus").',
        pointsLost: 1,
        effort: 'medium',
        metricValue: `${Math.round(ratio * 100)} % génériques`,
        metricTarget: '< 20 %',
      })
    }
  }

  // --- Suggestion pillar / cluster (info) --------------------------------
  // V1 — on n'a pas de crawl multi-page. On suggère juste si c'est une page
  // riche (~ SaaS blog) mais sans structure pillar/cluster identifiable.
  const hasH1 = $('h1').length > 0
  const wordCount = ($('body').text() || '').split(/\s+/).filter(Boolean).length
  if (hasH1 && wordCount >= 2000 && internal.length < 5) {
    pushCheck({
      severity: 'low',
      category: 'topical-pillar-hint',
      title: 'Page longue sans forte architecture topical',
      description:
        'Cette page ≥ 2 000 mots pourrait être un pillar, mais ne link pas vers suffisamment de pages internes (cluster). Analyse à confirmer avec un crawl élargi.',
      recommendation:
        'Structurer l\'architecture en pillar + cluster : une page pillar complète + articles cluster qui s\'y rattachent par liens et par thématique.',
      pointsLost: 0.5,
      effort: 'heavy',
    })
  }

  // --- External authority links -----------------------------------------
  // Les moteurs IA valorisent les sources qui elles-mêmes citent de la
  // littérature autoritaire (.gov, .edu, Wikipedia, sources scientifiques).
  // Un site qui ne link vers aucune référence externe crédible dégrade son
  // signal d'intégration à l'écosystème d'autorité.
  const authorityStats = extractExternalAuthorityLinks($.html(), new URL(finalUrl).origin)
  if (authorityStats.total >= 5 && authorityStats.authority === 0) {
    pushCheck({
      severity: 'low',
      category: 'topical-authority-outbound',
      title: 'Aucun lien sortant vers des sources d\'autorité',
      description: `La page a ${authorityStats.total} liens externes mais aucun ne cible une source d'autorité reconnue (.gov, .edu, Wikipedia, presse scientifique). Les moteurs génératifs pondèrent positivement l'ancrage à l'écosystème académique et institutionnel.`,
      recommendation:
        'Citer une étude, une norme, un article Wikipedia quand c\'est pertinent. Viser 1-2 backlinks vers des sources académiques ou institutionnelles par page de fond.',
      pointsLost: 0.5,
      effort: 'quick',
      metricValue: `0 / ${authorityStats.total} externes autoritaires`,
    })
  }

  // --- Multi-page signals (V1.5 via subPages) ---------------------------
  // Le crawl multi-page est plafonné à 50 pages. Sur les grands sites,
  // la détection de pillar/cluster et d'orphelines est donc partielle.
  const subPages = snapshot.subPages ?? []

  if (subPages.length >= 50) {
    findings.push({
      phaseKey: PHASE_KEY,
      severity: 'info',
      category: 'topical-crawl-scope',
      title: `Analyse topical limitée à ${subPages.length} pages`,
      description:
        'Le crawl multi-page est plafonné à 50 pages. Pour les sites plus grands, les pillar, clusters et pages orphelines ne peuvent être détectés que sur cet échantillon — les résultats sont indicatifs.',
      recommendation:
        'Pour un audit topical complet sur un site large (> 50 pages), utiliser un outil de crawl dédié (Screaming Frog, Sitebulb) pour couvrir l\'ensemble du site.',
      pointsLost: 0,
      effort: 'quick',
      locationUrl: finalUrl,
    })
  }

  if (subPages.length >= 5) {
    const origin = new URL(finalUrl).origin

    // --- Orphan pages ---------------------------------------------------
    const inbound = computeInboundCounts(snapshot.html, subPages, origin)
    const orphans = Array.from(inbound.entries()).filter(
      ([, count]) => count === 0,
    )
    const orphanRatio = orphans.length / subPages.length
    if (orphanRatio >= 0.2) {
      pushCheck({
        severity: 'medium',
        category: 'topical-orphan-pages',
        title: 'Pages orphelines détectées',
        description: `${orphans.length} page(s) du sitemap ne reçoivent aucun lien interne depuis la home ni depuis les autres pages crawlées. Les crawlers les découvrent mal et les moteurs IA peinent à leur associer du contexte.`,
        recommendation:
          'Intégrer ces pages dans la navigation principale, un hub ou des articles voisins. Pages d\'exemple : ' +
          orphans
            .slice(0, 3)
            .map(([p]) => p)
            .join(', ') +
          (orphans.length > 3 ? '…' : ''),
        pointsLost: 1,
        effort: 'medium',
        metricValue: `${orphans.length}/${subPages.length} orphelines`,
        metricTarget: '< 20 %',
      })
    }

    // --- Thin content site ----------------------------------------------
    // Utiliser wordCount pré-calculé par BFS si disponible (évite re-parse HTML)
    const wordCounts = subPages.map((sp) => sp.wordCount ?? bodyWordCount(sp.html))
    const thinCount = wordCounts.filter((w) => w > 0 && w < 300).length
    const coverable = wordCounts.filter((w) => w > 0).length
    if (coverable >= 5) {
      const thinRatio = thinCount / coverable
      if (thinRatio >= 0.5) {
        pushCheck({
          severity: 'medium',
          category: 'topical-thin-content',
          title: 'Site à contenu majoritairement pauvre',
          description: `${thinCount}/${coverable} pages crawlées ont moins de 300 mots de contenu. Les moteurs IA citent rarement des sources perçues comme trop courtes pour apporter un signal sémantique substantiel.`,
          recommendation:
            'Enrichir les pages principales : ajouter un paragraphe de contexte, une section FAQ, un exemple concret. Cibler 600-1 200 mots sur les pages-clé.',
          pointsLost: 1,
          effort: 'heavy',
          metricValue: `${Math.round(thinRatio * 100)} % < 300 mots`,
          metricTarget: '< 30 %',
        })
      }
    }

    // --- Pages longues candidates pillar (BFS réel) -----------------------
    // Avec le BFS, on a les vrais wordCount — on peut identifier des pages
    // suffisamment longues pour être des pillar pages (≥ 3000 mots)
    const pillarCandidates = subPages.filter((sp) => {
      const wc = sp.wordCount ?? bodyWordCount(sp.html)
      return wc >= 3000
    })
    const _pillarPaths = new Set(
      pillarCandidates.map((sp) => normalizePath(sp.url, origin)).filter((p): p is string => p !== null),
    )
    // Vérifier que les pillar candidates reçoivent au moins un lien interne
    const pillarWithoutLinks = pillarCandidates.filter((sp) => {
      const path = normalizePath(sp.url, origin)
      return path && (inbound.get(path) ?? 0) === 0
    })
    if (pillarCandidates.length > 0 && pillarWithoutLinks.length === pillarCandidates.length) {
      pushCheck({
        severity: 'medium',
        category: 'topical-pillar-isolated',
        title: 'Pages longues sans lien entrant (pillar potentiel isolé)',
        description: `${pillarCandidates.length} page(s) font ≥ 3 000 mots mais ne reçoivent aucun lien interne dans le crawl. Un pillar non référencé n'accumule pas d'autorité thématique.`,
        recommendation: 'Lier ces pages depuis la home, le menu ou les articles de cluster. Exemples : ' +
          pillarWithoutLinks.slice(0, 3).map((sp) => normalizePath(sp.url, origin)).join(', '),
        pointsLost: 0.5,
        effort: 'medium',
        metricValue: `${pillarCandidates.length} pillar(s) candidat(s) isolé(s)`,
      })
    }

    // --- Pages orphelines avec h1/title manquant (via BFS) -----------------
    // Si une page n'a ni h1 ni title, elle ne peut pas ancrer un cluster
    const noHeadingOrphans = subPages.filter((sp) => {
      const path = normalizePath(sp.url, origin)
      const isOrphan = path && (inbound.get(path) ?? 0) === 0
      return isOrphan && sp.h1 === undefined && sp.title === undefined
    })
    if (noHeadingOrphans.length >= 3) {
      pushCheck({
        severity: 'low',
        category: 'topical-orphan-no-heading',
        title: 'Pages orphelines sans titre ni H1',
        description: `${noHeadingOrphans.length} pages n'ont pas de lien entrant ET sont sans <h1> ni <title> exploitable. Double problème : invisibles pour le crawl et sémantiquement neutres pour les moteurs IA.`,
        recommendation: 'Corriger les templates qui n\'injectent pas de <h1> ou <title>. Ces pages ne peuvent pas contribuer à l\'autorité topical du site.',
        pointsLost: 0,
        effort: 'medium',
        metricValue: `${noHeadingOrphans.length} page(s)`,
      })
    }

    // --- Pillar intra-cluster -------------------------------------------
    // Pour chaque cluster détecté, on regarde quelle page concentre le plus
    // de liens entrants parmi les pages du cluster. Si aucune n'atteint 30 %,
    // le cluster est "plat" — pas de pivot éditorial identifiable.
    const subPagePathsForPillar = subPages
      .map((sp) => normalizePath(sp.url, origin))
      .filter((p): p is string => p !== null)
    const clustersForPillar = detectUrlClusters(subPagePathsForPillar)
    const fragmented: Array<{ prefix: string; pagesInCluster: number }> = []
    for (const [prefix, pages] of clustersForPillar) {
      const inboundInCluster = pages.map((p) => inbound.get(p) ?? 0)
      const totalInbound = inboundInCluster.reduce((a, b) => a + b, 0)
      if (totalInbound === 0) continue
      const topInbound = Math.max(...inboundInCluster)
      const topRatio = topInbound / totalInbound
      if (topRatio < 0.3) {
        fragmented.push({ prefix, pagesInCluster: pages.length })
      }
    }
    if (fragmented.length > 0) {
      pushCheck({
        severity: 'low',
        category: 'topical-pillar-missing',
        title: 'Clusters sans page-pivot identifiable',
        description: `${fragmented.length} cluster(s) n'ont pas de pillar : les liens internes sont dispersés uniformément sans page-pivot qui centralise l'autorité. Les moteurs IA favorisent les architectures où un hub thématique agrège les articles satellites.`,
        recommendation:
          'Créer ou désigner une page pillar par cluster (ex: "Guide complet X"), puis y linker depuis chaque article du cluster. Clusters concernés : ' +
          fragmented
            .slice(0, 3)
            .map((f) => f.prefix)
            .join(', '),
        pointsLost: 0.5,
        effort: 'heavy',
        metricValue: fragmented
          .slice(0, 3)
          .map((f) => `${f.prefix} (${f.pagesInCluster})`)
          .join(' · '),
      })
    }

    // --- Cluster coverage depuis la home --------------------------------
    const subPagePaths = subPages
      .map((sp) => normalizePath(sp.url, origin))
      .filter((p): p is string => p !== null)
    const clusters = detectUrlClusters(subPagePaths)
    if (clusters.size >= 2) {
      const homeLinks = extractInternalLinkPaths(snapshot.html, origin)
      const clustersLinkedFromHome = Array.from(clusters.entries()).filter(
        ([prefix, pages]) =>
          homeLinks.has(prefix) ||
          pages.some((p) => homeLinks.has(p) || Array.from(homeLinks).some((hl) => hl.startsWith(prefix + '/'))),
      )
      const coverage = clustersLinkedFromHome.length / clusters.size
      if (coverage < 0.5) {
        const missing = Array.from(clusters.keys())
          .filter(
            (prefix) =>
              !clustersLinkedFromHome.some(([p]) => p === prefix),
          )
          .slice(0, 3)
        pushCheck({
          severity: 'low',
          category: 'topical-cluster-coverage',
          title: 'Clusters non reliés depuis la home',
          description: `${clusters.size} clusters thématiques détectés mais la home n'en relie que ${clustersLinkedFromHome.length}. Signal de silo fermé — réduit la transmission d'autorité vers les sous-thèmes.`,
          recommendation:
            'Ajouter une section "Nos expertises" ou un méga-menu qui lie chaque cluster. Manquants : ' +
            missing.join(', '),
          pointsLost: 0.5,
          effort: 'medium',
          metricValue: `${Math.round(coverage * 100)} % liés`,
          metricTarget: '≥ 50 %',
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
    summary: `Phase Topical — ${findings.length} constat${findings.length > 1 ? 's' : ''}, score ${score}/${SCORE_MAX}`,
    findings,
  }
}

export const TOPICAL_SCORE_MAX = SCORE_MAX
