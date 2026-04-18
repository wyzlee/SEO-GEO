import crypto from 'node:crypto'

/**
 * Comparaison de chaînes en temps constant (anti timing-attack).
 *
 * - Retourne `false` immédiatement si l'une des deux valeurs est vide/nulle.
 * - Évite le leak de longueur : pad la plus courte à la longueur de la plus
 *   longue avant `timingSafeEqual`, puis compare les longueurs en sortie.
 * - Safe pour comparer des secrets (HMAC, JWT, cron bearer, API key).
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (!a || !b) return false
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  // timingSafeEqual throw si les longueurs diffèrent → on pad, puis on
  // valide la longueur après coup (le timing reste équivalent car on
  // exécute toujours `timingSafeEqual` sur la même longueur).
  const len = Math.max(bufA.length, bufB.length)
  const padA = Buffer.concat([bufA, Buffer.alloc(len - bufA.length)])
  const padB = Buffer.concat([bufB, Buffer.alloc(len - bufB.length)])
  const equal = crypto.timingSafeEqual(padA, padB)
  return equal && bufA.length === bufB.length
}

/**
 * Vérifie un header `Authorization: Bearer <secret>` en temps constant.
 * - Retourne `false` si format invalide OU secret absent de l'env.
 * - Ne fuit ni le secret attendu, ni sa longueur, ni la raison du rejet.
 */
export function verifyBearerSecret(
  authHeader: string | null,
  expected: string | undefined,
): boolean {
  if (!expected) return false
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false
  const provided = authHeader.slice('Bearer '.length)
  return constantTimeEqual(provided, expected)
}
