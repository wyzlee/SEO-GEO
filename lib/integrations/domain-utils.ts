/**
 * Utilitaires partagés pour la normalisation de domaines.
 * Utilisé par citation-monitor pour l'extraction et la comparaison.
 */

/**
 * Normalise une URL ou un nom d'hôte en domaine simple :
 * - Retire le protocole (https://)
 * - Retire le "www." initial
 * - Met en minuscules
 * - Retourne null si l'entrée est invalide / non-parseable
 *
 * Exemples :
 *   "https://www.wyzlee.com/blog" → "wyzlee.com"
 *   "www.Example.com" → "example.com"
 *   "example.com" → "example.com"
 */
export function normalizeDomain(urlOrHost: string): string | null {
  if (!urlOrHost) return null
  let candidate = urlOrHost.trim()

  // Si ça ressemble à une URL, on parse
  if (candidate.includes('://') || candidate.startsWith('//')) {
    try {
      const url = new URL(candidate.startsWith('//') ? `https:${candidate}` : candidate)
      candidate = url.hostname
    } catch {
      return null
    }
  } else {
    // Prendre la partie avant le premier slash si c'est un path
    candidate = candidate.split('/')[0].split('?')[0].split('#')[0]
  }

  candidate = candidate.toLowerCase()

  // Retirer le port éventuel
  const colonIdx = candidate.indexOf(':')
  if (colonIdx !== -1) candidate = candidate.slice(0, colonIdx)

  // Retirer "www."
  if (candidate.startsWith('www.')) candidate = candidate.slice(4)

  // Validation basique : doit avoir au moins un point
  if (!candidate.includes('.') || candidate.length < 3) return null

  return candidate
}

/**
 * Extrait tous les domaines uniques depuis un texte et une liste d'URLs explicites.
 * Retourne un tableau de domaines normalisés, dédupliqués.
 */
export function extractDomains(text: string, urls: string[]): string[] {
  const found = new Set<string>()

  // URLs explicites passées en paramètre
  for (const u of urls) {
    const d = normalizeDomain(u)
    if (d) found.add(d)
  }

  // URLs extraites par regex depuis le texte brut
  const urlRegex = /https?:\/\/[^\s"'<>)\]]+/gi
  const matches = text.match(urlRegex) ?? []
  for (const m of matches) {
    const d = normalizeDomain(m)
    if (d) found.add(d)
  }

  return Array.from(found)
}
