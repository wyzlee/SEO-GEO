/**
 * Extraction de l'IP client derrière un proxy/CDN avec protection anti-spoofing.
 *
 * Problème : `x-forwarded-for` est trivialement spoofable par un client si
 * le serveur le lit sans savoir quels proxies sont "trusted". Exemple :
 *   curl -H "x-forwarded-for: 1.2.3.4" https://app.example
 * → l'app croit que le client est 1.2.3.4 et contourne le rate-limit IP.
 *
 * Solution : on lit XFF différemment selon `TRUSTED_PROXY_MODE` :
 *
 * - `vercel` (défaut) : Vercel réécrit x-forwarded-for côté plateforme —
 *   le premier élément est le client réel, les proxies Vercel sont déjà
 *   strippés. Trust first entry.
 * - `chain` : walk XFF de droite à gauche, skip les IPs présentes dans
 *   `TRUSTED_PROXY_IPS` (comma-separated), prendre la première IP restante.
 *   Pour déploiement derrière Traefik / nginx / Cloudflare self-hosted.
 * - `none` : ignore XFF et x-real-ip. Retourne "unknown". Utile en tests
 *   ou en déploiement sans proxy (debug local).
 */
export function getClientIp(headers: Headers): string {
  const mode = (process.env.TRUSTED_PROXY_MODE ?? 'vercel').toLowerCase()

  if (mode === 'none') return 'unknown'

  const xff = headers.get('x-forwarded-for')

  if (mode === 'chain') {
    if (!xff) {
      const real = headers.get('x-real-ip')
      if (real) return real.trim()
      return 'unknown'
    }
    const trusted = new Set(
      (process.env.TRUSTED_PROXY_IPS ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    )
    const chain = xff.split(',').map((s) => s.trim()).filter(Boolean)
    // Walk right-to-left : le dernier appended est le proxy immédiat.
    for (let i = chain.length - 1; i >= 0; i -= 1) {
      const ip = chain[i]
      if (!trusted.has(ip)) return ip
    }
    // Tout le chain est "trusted" → le client est le premier.
    return chain[0] ?? 'unknown'
  }

  // mode === 'vercel' (défaut) : trust first XFF (Vercel clean la chaîne).
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }
  const real = headers.get('x-real-ip')
  if (real) return real.trim()
  const cf = headers.get('cf-connecting-ip')
  if (cf) return cf.trim()
  return 'unknown'
}
