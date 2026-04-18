---
name: security-guidelines
description: Règles de sécurité SEO-GEO — SSRF guard, auth boundaries, rate limiting, upload zip, secrets, CSP, HMAC webhooks. Basé sur security.md et recommandations tech avril 2026.
type: skill
---

# Skill : security-guidelines

## Frontières d'authentification

### Route API protégée (PATTERN OBLIGATOIRE)
```ts
import { authenticateRequest } from '@/lib/auth/authenticate'

export async function GET(req: Request) {
  const { user, org } = await authenticateRequest(req)
  // Toujours vérifier que org.id === resourceOrganizationId
  // Ne JAMAIS exposer des données cross-org
}
```

### Route publique (rapport partagé)
```ts
// app/r/[slug]/page.tsx — pas d'auth mais pas d'org data non publique
// Vérifier shareExpiresAt < now() → 404
// Jamais exposer user IDs, emails, org secrets dans les rapports publics
```

## SSRF Guard (vecteur critique)

### Gap documenté (S1.10 — à corriger)
Le `crawl.ts` actuel ne fait pas de résolution DNS + blocage RFC-1918 post-DNS. Vecteur DNS rebinding actif.

### Fix requis dans `lib/security/url-guard.ts`
```ts
import dns from 'node:dns/promises'
import { isPrivateIP } from './ip-utils'

export async function assertSafeUrl(rawUrl: string): Promise<URL> {
  const url = new URL(rawUrl)
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Protocol non autorisé')
  }

  const BLOCKED_HOSTS = ['localhost', '0.0.0.0', '[::]', '::1']
  if (BLOCKED_HOSTS.includes(url.hostname)) throw new Error('Host bloqué')

  // CRITIQUE : résolution DNS + check RFC-1918 post-résolution
  try {
    const { address } = await dns.lookup(url.hostname, { family: 4 })
    if (isPrivateIP(address)) throw new Error(`IP privée détectée : ${address}`)
  } catch (e) {
    if (e instanceof Error && e.message.includes('IP privée')) throw e
    throw new Error('Résolution DNS échouée')
  }

  return url
}
```

**isPrivateIP ranges** : 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.1/8, 169.254.0.0/16.

## Rate Limiting

### État actuel (in-memory)
- 3 req/min par IP sur `POST /api/audits`
- 50 req/24h par org
- **Limite** : ne fonctionne que sur single instance — migration Upstash si >100 req/min ou multi-région

### Headers attendus en réponse
```ts
'X-RateLimit-Limit': '3'
'X-RateLimit-Remaining': '0'
'Retry-After': '60'
// Status 429 avec message FR
```

## Upload ZIP

### Guards en place (`lib/audit/upload/`)
- Zip bomb : vérifier taille décompressée < 500 MB avant extraction
- Path traversal : normaliser chaque path entry, rejeter `../`
- Extension whitelist : `.ts, .tsx, .js, .jsx, .json, .md, .css, .html` uniquement
- Pas de scan antivirus V1 (acceptable agence) → ajouter ClamAV V2 si upload public

## Secrets

**Jamais en dur dans le code.** Toujours via `process.env.VARIABLE`.

Variables critiques :
```
DATABASE_URL          → Neon HTTP driver URL
STACK_SECRET_SERVER_KEY → Stack Auth server key
RESEND_API_KEY        → Email (manquant en prod — S1.1 BLOQUANT)
EMAIL_FROM            → Adresse expéditeur
GOOGLE_CRUX_API_KEY   → CrUX API (manquant — S1.1 BLOQUANT)
WEBHOOK_SIGNING_SECRET → HMAC webhooks
ANTHROPIC_API_KEY     → Phase synthesis (S2.4)
SENTRY_DSN            → Monitoring (S1.3)
```

`.env.local` git-ignoré. `.env.template` committé avec clés documentées, valeurs vides.

## Headers sécurité (next.config.ts)

En place : `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `HSTS 2 ans`, `Referrer-Policy: strict-origin-when-cross-origin`.

**Manquant (à ajouter)** :
```ts
// CSP report-only d'abord, puis enforcing après 2 semaines
{
  key: 'Content-Security-Policy-Report-Only',
  value: "default-src 'self'; script-src 'self' 'unsafe-inline'; report-uri /api/csp-report"
}
```

## HMAC Webhooks

```ts
// lib/webhooks/dispatch.ts
const signature = createHmac('sha256', secret)
  .update(JSON.stringify(payload))
  .digest('hex')
// Header : X-Webhook-Signature: sha256=<hex>
```

Vérifier signature côté récepteur avant de traiter l'événement.

## PII & Logs

- **Jamais** logger le HTML source crawlé (contenu client potentiellement sensible)
- Logguer uniquement les `findings` structurés (catégorie, severity, score)
- User IDs et emails : logger seulement en debug (jamais en info/warn/error)
- RGPD Art. 28 : Neon, Stack Auth, Vercel, Resend listés comme sous-traitants dans DPA

## CVE à surveiller

- CVE-2025-57822 (Next.js SSRF via Middleware headers) → patchée en Next 16.1.6 ✅
- Vérifier `npm audit` avant chaque release

## Checklist avant deploy

- [ ] `npm audit` 0 high/critical
- [ ] SSRF guard DNS en place (`assertSafeUrl` appelé dans `crawl.ts`)
- [ ] Rate limit actif sur `POST /api/audits`
- [ ] Tous les secrets dans Vercel env vars (pas en `.env.local` committé)
- [ ] `/api/health` retourne 200 sans exposer d'infos internes
