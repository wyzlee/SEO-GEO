# Rapport sécurité SEO-GEO — 2026-04-18

## Résumé
- Critiques 🔴 : 2 (corrigés)
- Importants 🟠 : 3 (1 corrigé, 2 documentés V2)
- Mineurs 🟡 : 2 (documentés)
- OK ✅ : 10 catégories

---

## Findings corrigés

### 🔴 CORRIGÉ — Fichier `.env.local.bak-prod-20260416-141358` avec credentials prod

Fichier supprimé du disque le 2026-04-18.
Contenait : DATABASE_URL (Neon + password), STACK_SECRET_SERVER_KEY, NEXT_PUBLIC_STACK_PROJECT_ID.
**Action requise : pivoter les credentials Neon et Stack Auth.**

### 🔴 CORRIGÉ — `/api/cron/run-scheduled` : bypass auth via `x-vercel-cron` non signé ou `CRON_SECRET` absent

Fichier : `app/api/cron/run-scheduled/route.ts`
Fix : suppression des branches permissives `xVercelCron !== null` et `!cronSecret`.
Auth stricte désormais : `Bearer ${CRON_SECRET}` uniquement, 401 si secret absent.

### 🟠 CORRIGÉ — SSRF webhook sortant sans guard DNS

Fichier : `app/api/organizations/me/webhooks/route.ts`
Fix : `assertSafeDnsUrl(url)` appelé après validation Zod, avant insertion DB. 422 si adresse privée/interne.

---

## Findings documentés (V2)

### 🟠 Rate limiting in-memory non persistant entre instances Vercel

Fichier : `lib/security/rate-limit.ts`
Détail : Map JavaScript en mémoire → réinitialisé à chaque cold start. Contournement possible multi-région.
Fix V2 : migrer vers Upstash Redis (`@upstash/ratelimit`, sliding window).
Risque V1 : faible (volumétrie actuelle < 100 req/min estimée).

### 🟠 CSP avec `unsafe-inline` sur `script-src` neutralise la protection XSS

Fichier : `proxy.ts:25`
Détail : Le nonce est généré (`x-nonce`) mais non utilisé dans `script-src`. `unsafe-inline` maintenu pour Stack Auth snippets.
Fix V2 : migrer vers `script-src 'nonce-${nonce}' 'strict-dynamic'` + intégration nonce dans les layouts Next.js.

### 🟡 `.env.template` : placeholder `price_xxx` non-vide pour Price IDs Stripe

Fichier : `.env.template:78-79`
Fix : vider les valeurs ou ajouter un commentaire explicite.

### 🟡 DNS rebinding TOCTOU dans le crawl multi-page (risque théorique)

Fichier : `lib/audit/crawl.ts:82-91`
Détail : Fenêtre entre résolution DNS (`assertSafeDnsUrl`) et fetch effectif. Risque très faible en V1.
Fix V2 : utiliser `undici` avec `connect` callback pour vérifier l'IP résolue au moment de la connexion TCP.

---

## Checks OK ✅

1. **Auth boundaries** — 18 routes auditées. Toutes protégées par `authenticateAuto`/`authenticateRequest`. Exceptions légitimes conformes.
2. **SSRF guard DNS-based** — `lib/security/url-guard.ts` : résolution DNS réelle + vérification RFC-1918 + IPv6 privé. `crawlUrl` appelle bien `assertSafeDnsUrl`.
3. **Secrets hardcodés** — Aucun secret dans le code source TypeScript. `.env.template` vierge de valeurs réelles.
4. **Multi-tenant isolation** — `lib/db/scope.ts` + filtre `organizationId` systématique dans toutes les routes vérifiées.
5. **Rate limiting** — Routes lourdes couvertes (audit flash : 5/h/IP, audits POST : 3/60s/user + 50/j/org).
6. **Upload ZIP guards** — Taille max 50MB, ratio compression 100:1 (anti-zip bomb), whitelist extensions, path traversal bloqué.
7. **npm audit** — 0 vulnérabilité high/critical. 4 moderate (drizzle-kit, sans impact runtime prod).
8. **Variables d'environnement** — `.env.local` et `.env.local.bak-*` couverts par `.gitignore` (pattern `.env.*`).
9. **Headers sécurité** — `next.config.ts` : X-Frame-Options DENY, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, COOP, CORP. CSP via `proxy.ts`.
10. **HMAC webhooks entrants** — Stack Auth : HMAC-SHA256 + timingSafeEqual. Stripe : `constructEvent` officiel. Webhooks sortants : signature `sha256=<hex>` par-webhook.

---

## Actions manuelles requises

| Priorité | Action |
|----------|--------|
| 🔴 URGENT | Pivoter le mot de passe Neon (`npg_4Cyq5ZNdpnmi`) → dashboard.neon.tech |
| 🔴 URGENT | Pivoter la clé Stack Auth (`ssk_rbfx5...`) → app.stack-auth.com |
| 🟠 | Vérifier si le répertoire projet est synchronisé sur un cloud (iCloud, Dropbox, Git cloud) et si le fichier .bak a pu être uploadé |
| 🟠 | Confirmer que `CRON_SECRET` est bien défini dans les env vars Vercel prod |
