/**
 * Phase 9 — Topical Authority (6 pts)
 *
 * V1 URL mode : single-page analyse du maillage interne et des anchors.
 * Détection pillar/cluster et pages orphelines sont V1.5 (multi-page crawl).
 */
import * as cheerio from 'cheerio'
import type { Finding, PhaseResult, CrawlSnapshot } from '../types'

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
