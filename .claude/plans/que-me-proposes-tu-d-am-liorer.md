# Plan — Amener SEO-GEO à « prêt à vendre »

## Context

**Où on en est** (Sprint 07 quasi terminé) : le moteur d'audit est **solide** — 11/11 phases implémentées (`lib/audit/phases/*.ts`, 4 079 LOC), multi-tenant scopé `organization_id` partout, 185 tests verts, logger JSON structuré (commit `81543ab`), Dockerfile multi-stage + healthcheck, rapport FR HTML sur `/r/[slug]`, SSRF guard et rate-limit. La base technique est production-ready.

**Ce qui manque pour vendre** : le produit est construit pour un mode **agency tool V1** (Olivier vend manuellement), mais il lui manque les briques de livraison professionnelle (PDF, branding dynamique, emails, pages légales) et tout le pan **self-serve V2** (Stripe, signup public, quotas, onboarding). Le modèle commercial est hybride progressif : on ne doit pas sauter à V2 avant d'avoir validé la qualité sur 2-3 contrats agency.

**Signal terrain récent** (16/04/2026) : Olivier a corrigé à la main 5 défauts de qualité du rapport généré (dédup fragile, titres "zéro-value", sections conditionnelles, sprints vides, casse noms propres). Le rapport est le livrable payé — sa qualité perçue conditionne la crédibilité. Ces défauts doivent être **codifiés avant tout premier contrat**.

**Objectif du plan** : séquencement **en 3 vagues** avec gates de décision, fichiers précis à toucher, libs à ajouter. Pas d'exécution dans ce tour — validation de la direction d'abord.

---

## Décisions stratégiques à trancher AVANT exécution

1. **PDF : sidecar gotenberg vs API externe (PDFShift/Api2Pdf) ?** — Recommandation **gotenberg en sidecar docker-compose** : cohérent avec l'auto-hébergement Wyzlee, pas de facturation au volume, pas de PII qui sort, aligné VPS Traefik.
2. **Email transactionnel : Resend vs SMTP custom ?** — Recommandation **Resend** : DKIM auto sur `wyzlee.cloud`, 3 000 free/mois, templates React Email, 10 min de setup DNS.
3. **i18n : maintenant ou après 10 clients FR ?** — Recommandation **après**. Hardcoder FR jusqu'à ce qu'un prospect non-FR signe. Évite 3-5j de refactor prématuré. TAM FR seul suffit à valider V1+V2.
4. **Stripe : Checkout hosted vs Elements ?** — Recommandation **Checkout hosted** pour V2 : conforme PSD2/SCA sans effort, Customer Portal intégré, TVA EU via Stripe Tax.
5. **Signup public : Stack Auth ou migration ?** — Garder **Stack Auth**. Le webhook `user.created` existe déjà (`app/api/webhooks/stack-auth/route.ts`) — créer `organizations` + `memberships` atomiquement dedans.

---

## Vague 1 — « Vendable V1 agency » (≈ 2 semaines, 8 tâches)

**But** : Olivier peut signer et livrer un premier contrat. Audit + rapport manuel, facturation Pennylane manuelle, mais **livrable client irréprochable**.

### 1.1 — Déploiement reproductible sur `seo-geo-orcin.vercel.app` — M
- `scripts/deploy.sh` (build image, push registry, SSH pull, `docker compose up -d`, healthcheck `/api/health`, rollback si 5xx).
- `docker-compose.prod.yml` : service `app` + service `worker` dédié + labels Traefik `seo-geo-orcin.vercel.app`.
- `.env.production.example` avec toutes les vars documentées.
- Migrations via `/db-migrate` sur branche Neon d'abord.
- **Risque** : secrets via Doppler ou Traefik secrets (pas `.env` en clair).

### 1.2 — Validation bout-en-bout sur 2 sites réels — S (non-code)
- 2 prospects identifiés (1 agence SEO, 1 SaaS B2B), audit complet, revue manuelle de chaque finding.
- Documenter bugs de phases trouvés dans `STATUS.md` section « Validation V1 ».
- **Gate de qualité** bloquant pour le premier contrat signé.

### 1.3 — Pages légales (CGU, Privacy, Mentions, DPA) — M
- `app/legal/cgu/page.tsx`, `app/legal/privacy/page.tsx`, `app/legal/mentions/page.tsx`, `app/legal/dpa/page.tsx`.
- Footer partagé (inline dans `app/layout.tsx` pour l'instant, migré vers `app/(marketing)/layout.tsx` en Vague 2).
- PDF DPA statique `/public/legal/dpa-wyzlee-v1.pdf`.
- Contenu : Captain Contrat adaptés, mention hébergement, DPO, base légale RGPD art. 6.1.b.
- **Non-négociable avant premier contrat B2B EU.**

### 1.4 — Email transactionnel « audit terminé » — M
- Ajouter `resend` + `@react-email/components`.
- `lib/email/client.ts` singleton (pattern `lib/auth/stack-auth.ts`).
- `lib/email/templates/audit-completed.tsx` avec lien rapport.
- Déclencher dans `worker/index.ts` quand `audit.status === 'completed'`.
- DNS DKIM/SPF sur `wyzlee.cloud` via OVH (~30 min).

### 1.5 — PDF export du rapport (gotenberg sidecar) — L
- Service `gotenberg/gotenberg:8` dans `docker-compose.prod.yml`.
- `lib/report/pdf.ts` : `renderPdf(html): Promise<Buffer>` → POST `http://gotenberg:3000/forms/chromium/convert/html`.
- `app/api/audits/[id]/report/pdf/route.ts` : GET authentifié, stream PDF. Auth via `authenticateRequest` (`lib/auth/server.ts`).
- `app/r/[slug]/pdf/route.ts` : variante publique avec vérif `shareExpiresAt`.
- Bouton « Télécharger PDF » sur `/dashboard/audits/[id]` et `/r/[slug]`.
- Colonne `reports.pdfStorageKey` existe (`lib/db/schema.ts:172`) : V1 = génération on-demand.
- **Risque** : fonts Cabinet Grotesk + Fira Code à embarquer en base64 (sinon fallback système).

### 1.6 — Branding dynamique au render + page Settings minimale — M
- `organizations.branding` JSONB (`lib/db/schema.ts:18`) existe mais **inutilisé** au render.
- `lib/report/render.ts` : accepter `branding?: { logoUrl, primaryColor, companyName }`, l'appliquer `<head>` et header HTML.
- `lib/report/generate.ts` : charger `branding` depuis `organizations` via `auditId → organizationId`.
- Remplacer stub `app/dashboard/settings/page.tsx:16` par form (logo URL, color picker, nom société).
- `app/api/organizations/me/route.ts` : GET + PATCH, scope via `authenticateRequest` + `lib/db/scope.ts`.
- V1 : **URL externe pour logo** uniquement (pas d'upload S3).

### 1.7 — Empty states + polish dashboard — S
- `app/dashboard/audits/page.tsx` : CTA « Lancer votre premier audit » si vide.
- `app/dashboard/page.tsx` : message d'accueil avec nom org.
- Fil d'Ariane + `<h1>` clair partout.

### 1.8 — **Qualité du rapport généré (codification des correctifs 16/04)** — M

Les 5 défauts corrigés à la main par Olivier le 16/04 doivent être codifiés pour éviter la régression. Fichier cible : `lib/report/generate.ts` + `lib/report/render.ts`.

**1.8.a — Dédup sémantique des findings** (actuellement fragile sur string titre)
- Problème observé : "datePublished" apparaît 2× (recos textuellement différentes, sujet identique).
- Solution : clé de dédup composite `${phaseKey}:${normalizeSubject(title)}:${severity}` où `normalizeSubject` extrait la racine sémantique (stop-words retirés, singularisé, lowercased, stemmé). Garder le finding avec `pointsLost` max, mergeer les recommandations en bullet list si distinctes.
- Tests à ajouter dans `lib/report/__tests__/dedup.test.ts`.

**1.8.b — Titres "zéro-value" remplacés par le finding concret**
- Problème : « Top des constats bloquants — coûte 0 point » est contradictoire (bloquant = points perdus).
- Solution : si le top finding d'une catégorie a `pointsLost > 0`, afficher son titre réel (« sameAs absent du schema Organization — 3 points »). Sinon, fallback informatif (pas de phrasing contradictoire).

**1.8.c — Sections conditionnelles systématiques**
- Problème : « Pages à fort enjeu » avec 1 URL = bruit. Actuellement conditionnel (`generate.ts:303` → `${hotspots ? ...}`) mais seuil à 1, remonter à ≥3.
- Solution : auditer toutes les sections du rapport, définir un seuil minimal par section (`hotspots.length >= 3`, `externalCitations.length >= 2`, etc.) avant rendu. Centraliser dans `lib/report/guards.ts`.

**1.8.d — Sprints roadmap vides → message positif**
- Problème : Sprint 3 vide rendait « — ».
- Solution : helper `fallbackSprintMessage(sprint)` retournant un message contextualisé (« Aucun chantier lourd identifié — votre site est globalement bien construit sur ce plan »).

**1.8.e — Casse des noms propres**
- Problème : "google et les moteurs ia" → "Google et les moteurs IA".
- Solution : helper `capitalizeProperNouns(text)` qui maintient un dictionnaire (`Google`, `IA`, `ChatGPT`, `Claude`, `Perplexity`, `Gemini`, `Copilot`, `Wikipedia`, `Wikidata`, `Ahrefs`, `Semrush`, `Surfer`, `ChatGPT`, `Bing`…) et corrige avant le rendu final. Appelé sur tous les titres, introductions, synthèses générées dynamiquement.
- Tests unitaires : `lib/report/__tests__/proper-nouns.test.ts`.

**Gate Vague 1 → Vague 2** : 1 contrat signé + audit livré + PDF téléchargé + tests dédup/casse/guards verts + CSAT ≥ 4/5.

---

## Vague 2 — « V1.5 polish + scaling agency » (≈ 2-3 semaines, 6 tâches)

**But** : après 2-3 clients agency, renforcer observabilité, sécurité, et arguments commerciaux.

### 2.1 — Sentry + alerting — S
- `@sentry/nextjs`.
- `sentry.client.config.ts` + `sentry.server.config.ts`.
- Wrapper `worker/index.ts` avec `Sentry.captureException`. Intégrer au logger JSON existant.

### 2.2 — CSP strict + headers durcis — M
- `proxy.ts:15-16` contient `'unsafe-eval' 'unsafe-inline'`. Migrer vers nonces + `strict-dynamic`.
- Nonce déjà généré (`proxy.ts:12`) — propager aux `<script>` via `x-nonce`.
- Ajouter headers manquants dans `next.config.ts` : `Strict-Transport-Security`, `Permissions-Policy`, `Referrer-Policy`.
- **Risque** : tester Stack Auth avant retrait unsafe-inline.

### 2.3 — Audit comparison (N vs N-1) — L
- Migration Drizzle : `previousAuditId uuid` self-ref dans `audits`.
- `lib/audit/compare.ts` : diff scores phases + findings (résolus/nouveaux/persistants) via clé de dédup sémantique (1.8.a).
- `app/dashboard/audits/[id]/compare/page.tsx`.
- Section rapport « Évolution depuis audit précédent ».
- **Argument commercial fort** : « 62 → 78 en 30j ».

### 2.4 — Webhooks sortants « audit.completed » — M
- Table `webhooks` : `organizationId, url, secret, events[], active`.
- `lib/webhooks/dispatch.ts` : HMAC-SHA256 signature `X-SEOGEO-Signature`, retry 3x exponentiel.
- Déclenché dans `worker/index.ts`.
- UI `app/dashboard/settings/webhooks/page.tsx`.

### 2.5 — Rate limit `/r/[slug]` + robots noindex — S
- `app/r/[slug]/page.tsx` : `<meta name="robots" content="noindex,nofollow">`.
- Étendre `lib/security/rate-limit.ts` vers IP-based 20 req/min.

### 2.6 — Landing marketing `/` + meta OG — M
- Aujourd'hui `/` redirige vers `/dashboard`/`/login` (`proxy.ts:66-70`). Créer vraie page publique.
- `app/(marketing)/page.tsx` : hero, pitch, pricing preview, demo, footer legal.
- `app/(marketing)/layout.tsx` avec header/footer publics.
- `/public/og-image.png` + meta OG, `sitemap.xml`, `robots.txt`.

**Gate Vague 2 → Vague 3** : 5 clients agency, MRR manuel > 2 k€, 3 demandes inbound spontanées.

---

## Vague 3 — « V2 self-serve SaaS » (≈ 4-6 semaines, 6 tâches)

**But** : ouvrir le signup public avec paiement auto.

### 3.1 — Signup public + onboarding wizard — L
- `app/signup/page.tsx` (Stack Auth `SignUp`).
- Compléter `app/api/webhooks/stack-auth/route.ts` : sur `user.created`, créer atomiquement `organizations` + `memberships` role=`owner`.
- Fallback inline dans `authenticateRequest` si race condition.
- `app/onboarding/page.tsx` : wizard 3 étapes (société → branding → premier audit).

### 3.2 — Plans + quotas + paywall — L
- Table `plan_limits` : `plan, auditsPerMonth, maxOrgMembers, customBranding, pdfExport, webhooks`.
- Seed : `free=1/mois, pro=20/mois, agency=100/mois`.
- `lib/billing/quota.ts` : `assertQuotaAvailable(orgId, 'audit')` depuis `app/api/audits/route.ts` POST.
- Remplacer rate-limit actuel (50/24h hardcodé) par check contextualisé au plan.
- `<QuotaBadge />` dans layout dashboard.

### 3.3 — Stripe Checkout + webhooks + Customer Portal — L
- `stripe` SDK.
- Colonnes `organizations` : `stripeCustomerId`, `stripeSubscriptionId`, `planRenewsAt`.
- `lib/billing/stripe.ts` singleton.
- `app/api/billing/checkout/route.ts` + `app/api/billing/portal/route.ts`.
- `app/api/webhooks/stripe/route.ts` : `checkout.session.completed`, `customer.subscription.updated|deleted` → sync `organizations.plan`.
- Idempotence : table `stripe_events_processed` dédupe par `stripe_event_id`.
- **Activer Stripe Tax** pour TVA EU auto.

### 3.4 — Gestion membres + invitations — M
- Table `invitations` : `orgId, email, role, token, expiresAt, acceptedAt`.
- `app/api/organizations/[id]/members/route.ts` (GET/POST).
- `app/api/invitations/[token]/accept/route.ts`.
- Template Resend `invitation.tsx`.
- UI `app/dashboard/settings/members/page.tsx`.

### 3.5 — RGPD : export + suppression — M
- `app/api/users/me/export/route.ts` : ZIP JSON (user + memberships + audits scope).
- `app/api/users/me/route.ts` DELETE : soft-delete + anonymisation (`email = 'deleted+{uuid}@seo-geo.local'`). Cascade memberships via FK (`schema.ts:39`). Audits restent (propriété org).
- `app/api/organizations/[id]/route.ts` DELETE : owner uniquement, grâce 30j + cron de purge.

### 3.6 — Admin backoffice — M
- `/admin` protégé par role `superadmin` (hardcodé email Olivier au début).
- Listing orgs, impersonate, replay audit, usage/MRR.
- Fichier unique `app/admin/page.tsx`.

---

## Critical files à modifier (résumé)

| Fichier | Vague | Action |
|---|---|---|
| `lib/db/schema.ts` | 2.3, 2.4, 3.2, 3.3 | Ajouts : `previousAuditId`, tables `webhooks`/`plan_limits`/`invitations`, Stripe columns |
| `lib/report/generate.ts` | 1.6, 1.8 | Branding + dédup sémantique + sections conditionnelles + casse |
| `lib/report/render.ts` | 1.5, 1.6, 2.3 | Branding dynamique + section comparaison |
| `lib/report/guards.ts` | 1.8.c | **Nouveau** — seuils de rendu par section |
| `lib/report/proper-nouns.ts` | 1.8.e | **Nouveau** — dictionnaire + capitalisation |
| `worker/index.ts` | 1.4, 2.1, 2.4 | Email + Sentry + webhook dispatch |
| `proxy.ts` | 2.2 | CSP strict nonce |
| `next.config.ts` | 2.2 | Headers sécurité |
| `app/dashboard/settings/page.tsx` | 1.6 | Remplacer stub par form branding |
| `app/api/audits/route.ts` | 3.2 | Check quota plan |
| `app/api/webhooks/stack-auth/route.ts` | 3.1 | Création org+membership auto |
| `docker-compose.prod.yml` | 1.1, 1.5 | Worker + gotenberg |

## Libs à ajouter

| Lib | Vague | Usage |
|---|---|---|
| `resend` + `@react-email/components` | 1.4 | Email transactionnel |
| `@sentry/nextjs` | 2.1 | Error tracking |
| `stripe` | 3.3 | Billing |
| (`next-intl`) | différé | i18n seulement si prospect non-FR |

## Verification (comment tester end-to-end)

**Vague 1** :
- `./scripts/deploy.sh` → `seo-geo-orcin.vercel.app/api/health` = 200 OK.
- Créer audit via UI → email reçu en fin de pipeline.
- Bouton « Télécharger PDF » → fichier avec branding org.
- Pages `/legal/cgu|privacy|mentions|dpa` rendues.
- `/dashboard/settings` → changer couleur → reflété dans prochain rapport.
- Tests `lib/report/__tests__/dedup.test.ts` et `proper-nouns.test.ts` verts.
- Relancer un audit générique (non client réel) → **diff avec ancien rapport** = noms propres capitalisés, pas de doublon "datePublished", sprints non vides, sections mono-URL masquées.

**Vague 2** :
- Erreur worker volontaire → trace Sentry visible.
- Audit #2 sur même URL → `/compare` affiche évolution.
- Webhook URL + audit → POST reçu avec signature valide.
- `observatory.mozilla.org` → grade A/A+.

**Vague 3** :
- Signup nouvel email → org + onboarding auto.
- Dépasser quota `free` → paywall → Stripe Checkout → `organizations.plan` passe à `pro` via webhook.
- Inviter membre → email → `/invitations/[token]/accept` fonctionne.
- `GET /api/users/me/export` → ZIP complet.

## Ce qui n'est PAS dans le plan (explicitement)

- **i18n** : différé jusqu'à prospect non-FR signé.
- **API publique documentée (OpenAPI)** : V3+.
- **Marketplace consultants agréés** : roadmap long terme.
- **Générateur de contenu** : out of scope produit.
- **Sprint 06 code upload (zip/GitHub)** : déjà implémenté, sinon re-ouvrir séparément.
