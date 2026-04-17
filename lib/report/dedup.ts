/**
 * Dédup sémantique des findings pour le rapport.
 *
 * Problème observé : la dédup par premiers 80 caractères de la recommandation
 * (`dedupeByRecommendation` V1) laissait passer des doublons quand deux phases
 * distinctes émettaient un constat sur le même sujet mais avec un phrasing
 * différent (ex. `datePublished` apparaissant 2× : une fois côté `freshness`,
 * une fois côté `structured_data`).
 *
 * Solution : extraire un SUJET canonique depuis le titre + recommendation via
 * un catalogue de patterns, puis dédupe par sujet. Les findings sans sujet
 * détectable retombent sur la dédup string legacy (fallback sûr).
 */
import type { ReportFinding } from './render'

/**
 * Sujets techniques canoniques reconnus. L'ordre compte : le premier pattern
 * qui match gagne. Les patterns plus spécifiques doivent précéder les plus
 * génériques (ex. `llms-full.txt` avant `llms.txt`).
 *
 * Les regex matchent sur titre + recommandation lowercased, sans ponctuation
 * fine (on normalise avant test). Garder les patterns courts et robustes.
 */
const SUBJECT_PATTERNS: Array<{ subject: string; pattern: RegExp }> = [
  { subject: 'llms-full.txt', pattern: /\bllms-full\.txt\b/ },
  { subject: 'llms.txt', pattern: /\bllms\.txt\b/ },
  { subject: 'robots.txt', pattern: /\brobots\.txt\b/ },
  { subject: 'sitemap.xml', pattern: /\bsitemap(\.xml)?\b/ },
  { subject: 'datepublished', pattern: /\bdate\s*published\b|\bdatepublished\b|\bdate de publication\b/ },
  { subject: 'datemodified', pattern: /\bdate\s*modified\b|\bdatemodified\b|\bdate de (modification|mise à jour)\b/ },
  { subject: 'sameas', pattern: /\bsameas\b|\bsame\s*as\b/ },
  { subject: 'canonical', pattern: /\bcanonical\b|\brel\s*=\s*["']?canonical/ },
  { subject: 'hreflang', pattern: /\bhreflang\b/ },
  { subject: 'noindex', pattern: /\bnoindex\b/ },
  { subject: 'og-meta', pattern: /\bopen\s*graph\b|\bog\s*:\s*(?:title|description|image|url|type|locale)\b/ },
  { subject: 'twitter-cards', pattern: /\btwitter\s*cards?\b|\btwitter\s*:\s*(?:card|title|description|image)\b/ },
  { subject: 'meta-description', pattern: /\b(?:meta\s*)?description\s*(?:manquante?|absente?|vide|non renseignée)\b|\b<meta\s+name=["']description/ },
  { subject: 'title-tag', pattern: /\b<?title>?\s*(?:manquant|absent|vide)\b|\bbalise\s*title\b/ },
  { subject: 'favicon', pattern: /\bfavicon\b/ },
  { subject: 'schema-organization', pattern: /\bschema\s*organization\b|\borganization\s*(?:schema|json-?ld)\b/ },
  { subject: 'schema-website', pattern: /\bschema\s*website\b|\bwebsite\s*(?:schema|json-?ld)\b/ },
  { subject: 'schema-article', pattern: /\bschema\s*article\b|\barticle\s*(?:schema|json-?ld)\b|\bblogposting\b/ },
  { subject: 'schema-person', pattern: /\bschema\s*person\b|\bperson\s*(?:schema|json-?ld)\b/ },
  { subject: 'schema-breadcrumb', pattern: /\bbreadcrumb(?:list)?\b|\bfil\s*d'ariane\b/ },
  { subject: 'schema-product', pattern: /\bschema\s*product\b|\bproduct\s*(?:schema|json-?ld)\b/ },
  { subject: 'schema-faqpage', pattern: /\bfaqpage\b|\bschema\s*faq\b/ },
  { subject: 'schema-howto', pattern: /\bschema\s*howto\b|\bhow-?to\s*(?:schema|json-?ld)\b/ },
  { subject: 'web-vital-lcp', pattern: /\blcp\b|\blargest\s*contentful\s*paint\b/ },
  { subject: 'web-vital-inp', pattern: /\binp\b|\binteraction\s*to\s*next\s*paint\b/ },
  { subject: 'web-vital-cls', pattern: /\bcls\b|\bcumulative\s*layout\s*shift\b/ },
  { subject: 'mixed-content', pattern: /\bmixed\s*content\b|\bcontenu\s*mixte\b/ },
  { subject: 'redirect-chain', pattern: /\bredirect\s*chain\b|\bcha[iî]nes?\s*de\s*redirections?\b/ },
  { subject: 'wikidata', pattern: /\bwikidata\b/ },
  { subject: 'wikipedia', pattern: /\bwikipedia\b/ },
]

/**
 * Normalise un texte pour matching : lowercase, remplace caractères spéciaux
 * par espaces, collapse espaces. Garde `.` et `-` car ils sont sémantiques
 * dans `llms.txt`, `same-as`, etc.
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Retourne le sujet canonique d'un finding, ou null si aucun pattern ne match.
 * On concatène titre + recommandation pour maximiser la couverture.
 */
export function extractSubject(finding: ReportFinding): string | null {
  const haystack = normalize(`${finding.title} ${finding.recommendation}`)
  for (const { subject, pattern } of SUBJECT_PATTERNS) {
    if (pattern.test(haystack)) return subject
  }
  return null
}

/**
 * Dédup sémantique : regroupe les findings qui parlent du même sujet
 * technique, garde celui avec le `pointsLost` max, merge les recommandations
 * distinctes en bullet list si elles apportent de l'information supplémentaire.
 *
 * Les findings sans sujet détectable passent par une dédup string legacy
 * (premiers 80 car. de la reco) pour ne pas laisser passer les doublons
 * évidents.
 */
export function dedupeFindings(findings: ReportFinding[]): ReportFinding[] {
  const bySubject = new Map<string, ReportFinding>()
  const byRecoKey = new Map<string, ReportFinding>()

  for (const f of findings) {
    const subject = extractSubject(f)
    if (subject) {
      const key = `s:${subject}`
      const existing = bySubject.get(key)
      if (!existing) {
        bySubject.set(key, { ...f })
      } else {
        bySubject.set(key, mergeFindings(existing, f))
      }
      continue
    }
    const recoKey = `r:${f.recommendation.toLowerCase().trim().slice(0, 80)}`
    const existing = byRecoKey.get(recoKey)
    if (!existing) {
      byRecoKey.set(recoKey, { ...f })
    } else {
      byRecoKey.set(recoKey, mergeFindings(existing, f))
    }
  }

  return [...bySubject.values(), ...byRecoKey.values()]
}

/**
 * Merge deux findings dédupliqués : garde le plus impactant (pointsLost,
 * puis severity), concatène les recommandations distinctes en bullets.
 */
function mergeFindings(a: ReportFinding, b: ReportFinding): ReportFinding {
  const winner = pickStronger(a, b)
  const other = winner === a ? b : a
  const recoA = winner.recommendation.trim()
  const recoB = other.recommendation.trim()
  const sameReco =
    recoA === recoB ||
    recoA.toLowerCase().includes(recoB.toLowerCase()) ||
    recoB.toLowerCase().includes(recoA.toLowerCase())
  const mergedReco = sameReco
    ? recoA
    : `${recoA}\n- ${recoB}`
  return {
    ...winner,
    pointsLost: Math.max(a.pointsLost, b.pointsLost),
    recommendation: mergedReco,
  }
}

const SEVERITY_WEIGHT: Record<ReportFinding['severity'], number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
}

function pickStronger(a: ReportFinding, b: ReportFinding): ReportFinding {
  if (a.pointsLost !== b.pointsLost) return a.pointsLost > b.pointsLost ? a : b
  return SEVERITY_WEIGHT[a.severity] >= SEVERITY_WEIGHT[b.severity] ? a : b
}
