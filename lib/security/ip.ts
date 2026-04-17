/**
 * Extraction de l'IP client derrière Traefik / CDN.
 *
 * Priorité :
 *   1. `x-forwarded-for` : première IP de la chaîne (Traefik en ajoute une).
 *   2. `x-real-ip` : fallback Traefik ancien.
 *   3. `cf-connecting-ip` : si on passe derrière Cloudflare un jour.
 *   4. Fallback : "unknown".
 *
 * On ne fait pas de strict check IPv4/IPv6 ici — on veut juste un
 * identifiant stable pour le rate-limit, pas une preuve d'identité.
 */
export function getClientIp(headers: Headers): string {
  const xff = headers.get('x-forwarded-for')
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
