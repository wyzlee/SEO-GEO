# Status — SEO-GEO
> Mise à jour : 2026-04-18 — Sprint 2 terminé ✅ — commit 490b142 en prod

---

## Sprint 1 — Quick Wins ✅ (8/10)

| Item | Description | État |
|------|-------------|------|
| S1.1 | Env vars prod (RESEND + CrUX) | ✅ DONE |
| S1.2 | Smoke test prod | ⏳ À FAIRE après deploy Vercel |
| S1.3 | Monitoring Sentry | ✅ DONE — 5% sampling, PII off, replay off |
| S1.4 | Legal sous-traitants | ✅ DONE — Vercel, Anthropic, Google ajoutés |
| S1.5 | Canal support email | ✅ DONE — sidebar + rapport |
| S1.6 | 5 tests régression rapport | ✅ DONE — 287/288 tests verts |
| S1.7 | Fix PDF charts timing | ✅ DONE — 2026-04-18 — document.fonts.ready après networkidle0 |
| S1.8 | Section Forces rapport | ✅ DONE — phases ≥ 70% score |
| S1.9 | 3 index DB | ✅ DONE — migration appliquée Neon prod |
| S1.10 | SSRF DNS check | ✅ DONE — assertSafeDnsUrl() |

**S1.2 → tester sur `seo-geo-orcin.vercel.app` : login → audit → rapport → PDF → partage**
**S1.7 → fixer après validation smoke test**

---

## Palier commercial

| Palier | État | Bloquant |
|--------|------|----------|
| A — Agency Ready | 🟢 95% | S1.2 smoke test |
| B — Quality Gate (1500€+) | 🟢 85% | S1.7 PDF charts |
| C — Self-serve (scale) | 🟡 70% | Config Stripe (Price IDs + Webhook) + smoke test S1.2 |

---

## Sprint 2 — En cours

| Item | Description | Effort | Impact | État |
|------|-------------|--------|--------|------|
| S2.1 | Landing page — CTA "Commencer gratuitement" | 2j | 🔵 SCALE | ✅ DONE — 2026-04-18 |
| S2.2 | Signup public + onboarding wizard | 3j | 🔵 SCALE | ✅ DONE — 2026-04-18 |
| S2.3 | Stripe 3 plans + webhooks | 3j | 🔵 SCALE | ✅ DONE — 2026-04-18 |
| S2.4 | Phase synthesis — Claude Haiku 4.5 | 2j | 🟡 QUALITÉ | ✅ DONE — 2026-04-18 |
| S2.5 | Queue durable : maxDuration 800s + checkpoint + cron requeue | 3-5j | 🟠 INFRA | ✅ DONE — 2026-04-18 |

**Dépendances Sprint 2 :**
- S2.2 dépend de S2.1 (landing + CTA)
- S2.3 dépend de S2.2 (signup actif)
- S2.4 : nécessite `ANTHROPIC_API_KEY` en prod Vercel
- S2.5 : nécessite Vercel Workflow addon activé sur le projet

**Groupe 1 Sprint 2 (parallélisable) : S2.1, S2.4, S2.5**
**Groupe 2 Sprint 2 (dépend Groupe 1) : S2.2, S2.3**

---

## Actions manuelles restantes avant premier client payant

| Action | Quoi | Où |
|--------|------|----|
| 🔴 S1.2 | Smoke test prod end-to-end | `seo-geo-orcin.vercel.app` |
| 🔴 S1.7 | Fix PDF charts timing (attend S1.2) | `app/r/[slug]/pdf/route.ts` |
| 🟠 Stripe | Créer produits Studio 490€ + Agency 990€ | dashboard.stripe.com/products |
| 🟠 Stripe | Ajouter `STRIPE_PRICE_STUDIO_MONTHLY` + `STRIPE_PRICE_AGENCY_MONTHLY` | Vercel env vars |
| 🟠 Stripe | Configurer webhook → `seo-geo-orcin.vercel.app/api/stripe/webhook` | dashboard.stripe.com/webhooks |
| 🟠 Stripe | Ajouter `STRIPE_WEBHOOK_SECRET` | Vercel env vars |
| 🟢 Stack Auth | Vérifier que le signup email/password public est activé | dashboard Stack Auth |

---

## Dernier audit sécurité
Date : 2026-04-18
Résultat : 2 critiques corrigés, 1 important corrigé, 2 importants V2, 2 mineurs documentés
Rapport : `.claude/plans/security-report-2026-04-18.md`

**Actions manuelles URGENTES :**
- 🔴 Pivoter mot de passe Neon → dashboard.neon.tech
- 🔴 Pivoter clé `STACK_SECRET_SERVER_KEY` → app.stack-auth.com
- 🟠 Confirmer `CRON_SECRET` défini dans Vercel env vars prod

---

## Sprint 3 — En cours

| Item | Description | Effort | Impact | État |
|------|-------------|--------|--------|------|
| S3.1 | White-label Silver (custom domain + email) | 5j | 🔵 AGENCE | ✅ DONE — 2026-04-18 |
| S3.2 | Programme affilié 30% récurrent | 3j | 🔵 ACQUISITION | ⏸ BACKLOG — après PMF |
| S3.3 | Audit scheduling (cron mensuel) | 2j | 🔵 RÉTENTION | ✅ DONE — 2026-04-18 |
| S3.4 | Multi-org switcher | 1j | 🔵 AGENCE | ✅ DONE — 2026-04-18 |
| S3.5 | Blog + docs SEO (MDX) | continu | 🔵 ACQUISITION | ✅ DONE (scaffold) — 2026-04-18 |

**S3.3 — Détails :**
- Table `scheduled_audits` migrée sur Neon prod (migration `0006_watery_jack_murdock.sql`)
- API : GET/POST `/api/scheduled-audits`, DELETE `/api/scheduled-audits/[id]`
- Cron Vercel : `/api/cron/run-scheduled` (toutes les heures)
- UI : `/dashboard/audits/schedule` (liste) + `/dashboard/audits/schedule/new` (form)
- Nav sidebar "Planifiés" ajouté

**S3.4 — Détails :**
- `proxy.ts` mis à jour : cookie `seo-geo-org` → header `x-org-id` sur `/api/*`
- GET `/api/organizations` — liste les orgs de l'utilisateur
- Hook `use-organizations.ts` — switcher client-side
- Sidebar : org switcher avec dropdown multi-org + nav "Planifiés"
- `/blog` ajouté aux publicRoutes (accès sans auth)

**S3.5 — Détails :**
- `next-mdx-remote` + `gray-matter` installés
- `content/blog/` : 2 articles FR (GEO vs SEO 2026, llms.txt guide complet)
- `app/blog/` : layout + liste + page article avec MDXRemote/rsc
- Lien "Blog" ajouté dans la landing page nav

**S3.1 — Détails :**
- Migration Neon prod : colonnes `custom_domain UNIQUE` + `custom_email_from_name` dans `organizations`
- `lib/vercel/domains.ts` : `addDomain`, `removeDomain`, `getDomainStatus` via API Vercel REST
- `proxy.ts` : Host header routing → domaine custom redirige tout sauf `/r/**` vers le domaine principal (preview `.vercel.app` exclus)
- PATCH `/api/organizations/me` étendu : gère `customDomain` (plan gate studio/agency) + `customEmailFromName`
- GET `/api/organizations/me/domain-status` : vérifie CNAME via Vercel
- Settings UI : section "Domaine personnalisé" avec formulaire, instructions CNAME, badge DNS
- Email : `sendEmail` accepte `from?` → expéditeur custom `"Agence <notifications@wyzlee.cloud>"`
- Env vars requises sur Vercel : `VERCEL_API_TOKEN`, `VERCEL_PROJECT_ID` (optionnel : `VERCEL_TEAM_ID`), `NEXT_PUBLIC_APP_HOST`

**Reste Sprint 3 :**
- S3.2 : Programme affilié — ⏸ BACKLOG après PMF
- Note build : erreur Stripe checkout pré-existante Sprint 2 (STRIPE_SECRET_KEY manquant en local uniquement)

---

## Phase 1 — Analyse ✅

| Fichier | Contenu | État |
|---------|---------|------|
| `codebase-audit.md` | Architecture, stack, data model, features, qualité | ✅ |
| `competitive-analysis.md` | 12 concurrents, tableau comparatif, gaps marché | ✅ |
| `growth-strategy.md` | Monétisation, onboarding, rétention, acquisition | ✅ |
| `tech-recommendations.md` | Queue, PDF, LLM, DB, sécurité, observabilité | ✅ |
| `diagnosis.md` | SWOT complet | ✅ |
| `roadmap.md` | Sprint 1-3 + Backlog | ✅ |
| `executive-summary.md` | Positionnement, top 5, menaces 2026 | ✅ |
| `sources.md` | URLs sourcées | ✅ |

---

## Prochain audit sécurité
→ Lancer `/security-check` avant le premier client payant (non effectué)
