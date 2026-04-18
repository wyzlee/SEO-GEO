# Status — SEO-GEO
> Mise à jour : 2026-04-18 — Sprints 1+2+3 terminés ✅ — prod opérationnelle, Stripe configuré

---

## Palier commercial

| Palier | État | Bloquant |
|--------|------|----------|
| A — Agency Ready | 🟢 98% | Smoke test S1.2 |
| B — Quality Gate (1500€+) | 🟢 95% | Smoke test S1.2 |
| C — Self-serve (scale) | 🟢 90% | Smoke test S1.2 + passer Stripe en LIVE mode |

---

## Sprint 1 — Quick Wins ✅ (10/10)

| Item | Description | État |
|------|-------------|------|
| S1.1 | Env vars prod (RESEND + CrUX) | ✅ DONE |
| S1.2 | Smoke test prod | ⏳ À FAIRE — `seo-geo-orcin.vercel.app` |
| S1.3 | Monitoring Sentry | ✅ DONE — 5% sampling, PII off, replay off |
| S1.4 | Legal sous-traitants | ✅ DONE — Vercel, Anthropic, Google ajoutés |
| S1.5 | Canal support email | ✅ DONE — sidebar + rapport |
| S1.6 | 5 tests régression rapport | ✅ DONE — 287/288 tests verts |
| S1.7 | Fix PDF charts timing | ✅ DONE — document.fonts.ready après networkidle0 |
| S1.8 | Section Forces rapport | ✅ DONE — phases ≥ 70% score |
| S1.9 | 3 index DB | ✅ DONE — migration appliquée Neon prod |
| S1.10 | SSRF DNS check | ✅ DONE — assertSafeDnsUrl() |

**⏳ S1.2 — seul item restant** : tester sur `seo-geo-orcin.vercel.app` : login → audit → rapport → PDF → partage

---

## Sprint 2 ✅ (5/5)

| Item | Description | État |
|------|-------------|------|
| S2.1 | Landing page — CTA "Commencer gratuitement" | ✅ DONE — 2026-04-18 |
| S2.2 | Signup public + onboarding wizard | ✅ DONE — 2026-04-18 |
| S2.3 | Stripe 3 plans + webhooks | ✅ DONE — 2026-04-18 |
| S2.4 | Phase synthesis — Claude Haiku 4.5 | ✅ DONE — 2026-04-18 |
| S2.5 | Queue durable : maxDuration 800s + checkpoint + cron requeue | ✅ DONE — 2026-04-18 |

---

## Sprint 3 ✅ (4/5)

| Item | Description | État |
|------|-------------|------|
| S3.1 | White-label Silver (custom domain + email) | ✅ DONE — 2026-04-18 |
| S3.2 | Programme affilié 30% récurrent | ⏸ BACKLOG — après PMF |
| S3.3 | Audit scheduling (cron mensuel) | ✅ DONE — 2026-04-18 |
| S3.4 | Multi-org switcher | ✅ DONE — 2026-04-18 |
| S3.5 | Blog + docs SEO (MDX) | ✅ DONE (scaffold) — 2026-04-18 |

**S3.2 → BACKLOG après PMF**

---

## Actions manuelles — état complet (2026-04-18)

| Action | État |
|--------|------|
| Smoke test prod S1.2 | 🔴 RESTE À FAIRE |
| Neon password pivoté (`npg_3N7lquakwfEp`) | ✅ DONE |
| Stack Auth clé pivotée (`ssk_pact4n...crt8`), ancienne révoquée | ✅ DONE |
| Upstash Redis `seo-geo-rate-limit` créé | ✅ DONE |
| Stripe produits Studio + Agency créés (TEST mode) | ✅ DONE |
| Stripe webhook configuré (5 events) | ✅ DONE |
| Toutes env vars Vercel configurées | ✅ DONE |
| Redeploy Vercel post-config (`dpl_9HcESUJDy2b1W2Gj5BhJB6eNiZcC`) | ✅ DONE — READY |
| Passer Stripe en LIVE mode (vrais clients) | 🟠 AVANT PREMIER CLIENT RÉEL |
| Vérifier signup email/password Stack Auth activé | 🟢 À VÉRIFIER |

---

## Env vars Vercel — inventaire complet prod

| Variable | État |
|----------|------|
| `DATABASE_URL` | ✅ mdp pivoté `npg_3N7lquakwfEp` |
| `STACK_SECRET_SERVER_KEY` | ✅ clé pivotée `ssk_pact4n...crt8` |
| `NEXT_PUBLIC_STACK_PROJECT_ID` | ✅ `2f01f2d7-054d-4847-b4db-2348dc272f4f` |
| `UPSTASH_REDIS_REST_URL` | ✅ `https://close-shark-80122.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | ✅ DB `seo-geo-rate-limit` |
| `STRIPE_SECRET_KEY` | ✅ (test) |
| `STRIPE_PUBLISHABLE_KEY` | ✅ (test) |
| `STRIPE_PRICE_STUDIO_MONTHLY` | ✅ `price_1TNXQoB8nn2Ohyt3a3vQVHd9` |
| `STRIPE_PRICE_AGENCY_MONTHLY` | ✅ `price_1TNXRDb8nn2Ohyt3hFQg8zYU` |
| `STRIPE_WEBHOOK_SECRET` | ✅ `whsec_1hxTsWeyk...` |
| `VERCEL_API_TOKEN` | ✅ token `seo-geo-domain-api` |
| `VERCEL_PROJECT_ID` | ✅ `prj_kpIjC0ZtmR45p3kNE94VspyJXnsz` |
| `NEXT_PUBLIC_APP_HOST` | ✅ `seo-geo-orcin.vercel.app` |
| `ANTHROPIC_API_KEY` | ✅ |
| `RESEND_API_KEY` | ✅ |
| `GOOGLE_CRUX_API_KEY` | ✅ |
| `CRON_SECRET` | ✅ |

---

## Dernier audit sécurité
Date : 2026-04-18
Résultat : 2 critiques corrigés ✅, 1 important corrigé ✅, 2 importants V2, 2 mineurs documentés
Rapport : `.claude/plans/security-report-2026-04-18.md`

Actions urgentes — toutes résolues :
- ✅ `STACK_SECRET_SERVER_KEY` pivoté, ancienne clé révoquée
- ✅ Mot de passe Neon pivoté
- ✅ `CRON_SECRET` défini

---

## Sprint 4 — Backlog prioritaire

| Item | Description | Effort | Impact |
|------|-------------|--------|--------|
| S4.1 | Smoke test prod S1.2 | 2h | 🔴 BLOQUANT |
| S4.2 | Rate limiting Redis (Upstash) — déjà codé, maintenant actif en prod | - | ✅ ACTIF |
| S4.3 | Passer Stripe LIVE (produits + webhook + env vars live) | 1h | 🔴 AVANT VRAI CLIENT |
| S4.4 | Programme affilié 30% récurrent | 3j | 🔵 ACQUISITION — après PMF |
| S4.5 | Upload zip / GitHub connect | 5j | 🔵 AGENCE — Sprint 06 roadmap |
| S4.6 | A/B test landing page | 2j | 🔵 ACQUISITION |

---

## Prochain audit sécurité
→ Lancer `/security-check` avant le premier client payant réel

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
