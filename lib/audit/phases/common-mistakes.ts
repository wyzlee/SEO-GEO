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

  // --- Redirect chains check impossible V1 (faudrait fetch plusieurs fois)

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
