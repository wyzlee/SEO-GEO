# Status

**Dernière mise à jour** : 2026-04-14

## État actuel

- Sprint 00 — Scope & fondations docs : **terminé**
- Sprint 01 — Scaffold Next.js 16 + Stack Auth + Neon : **terminé**
- Sprint 02 — Data model + auth opérationnelle : **terminé** (login email/password testé end-to-end Chrome → dashboard)
- Sprint 03 — Moteur d'audit : **flow end-to-end live** (Phase 1 `technical` + API + UI détail/liste + persistance Neon + polling 2s, 10 phases restantes en `skipped`)

## Ce qui est en place

- Next.js 16.2.3 + React 19 (Server Components par défaut)
- Stack Auth singleton (`lib/auth/stack-auth.ts`), SSO cookie `tokenStore: 'cookie'`
- Neon HTTP driver avec lazy Proxy (`lib/db/index.ts`)
- Drizzle schema complet (`lib/db/schema.ts`) : organizations, users, memberships, audits, audit_phases, findings, reports, sources
- `proxy.ts` (Next 16) : security headers + CSP + gating routes protégées
- API routes : `/api/health` (DB check), `/api/webhooks/stack-auth` (sync users, HMAC-verified)
- Design system Wyzlee : Cabinet Grotesk + Fira Code, palette sémantique CSS vars, helpers `.btn-primary` / `.input-modern` / `.card-premium`
- Pages : `/` (landing), `/login`, `/auth/callback`, `/auth/logout`, `/dashboard`, `/dashboard/audits`, `/dashboard/audits/new`, `/dashboard/audits/[id]`, `/dashboard/settings`
- Worker stub (`worker/index.ts`) prêt pour la boucle claim/run en Sprint 03
- Dockerfile multi-stage `node:20-alpine` + `worker/Dockerfile`
- `docker-compose.yml` avec labels Traefik pour `seo-geo.wyzlee.cloud`

## Validations passées

- `npm install` : 793 paquets installés
- `npm run typecheck` : 0 erreur
- `npm run lint` : 0 erreur / 0 warning (ESLint 9 flat config)
- `npm run test` : 10 tests / 3 fichiers / 100% pass (Vitest + Testing Library + jsdom)
- `npm run dev` : boot en ~500ms, landing/login rendus, dashboard gated (307 → /login)
- `/api/health` structuré OK (503 attendu sans vraie DB, 200 une fois Neon branché)
- `/wyzlee-stack-validate` : **53/53 (100%)** après ajout du harness Vitest et de `components.json`

## Infra live

- **Neon** : projet `hidden-rice-16181693`, région `aws-eu-central-1` (Frankfurt), Postgres 17, branch `main` (`br-odd-bar-alzt0i4e`)
- **Migration 0000** appliquée sur `main` (8 tables, 7 FK cascade, 8 indexes métier)
- **Seed** :
  - org `Wyzlee` (id `93851689-012d-44d6-8175-2f97bd4ee9d3`, slug `wyzlee`, plan `agency`)
  - user `Olivier Podio` / `olivier.podio@pm.me` (id `48ef7a13-369b-47da-805d-76286557ddb8`)
  - membership `owner` user → org
- **Stack Auth** : projet dédié `seo-geo` (id `2f01f2d7-054d-4847-b4db-2348dc272f4f`), apps `Authentication + Emails + Webhooks`, auth methods `email/password + magic link + Google + GitHub`, user Olivier créé (email verified, magic link activé)
- **`.env.local`** : `DATABASE_URL` Neon + `NEXT_PUBLIC_STACK_PROJECT_ID` + `STACK_SECRET_SERVER_KEY` en place

## Validation live

- `GET /api/health` → `200 OK` avec `{status: "healthy", database: {status: "ok", latencyMs: ~500}}`
- `GET /` → 200, `GET /dashboard` → 307 (AuthGuard)
- 3 suites de tests passent (10 tests)

## Moteur d'audit — état

- `lib/audit/types.ts` : Finding, PhaseResult, AuditInput, CrawlSnapshot…
- `lib/audit/crawl.ts` : fetchHtml, fetchText, crawlUrl (avec robots.txt + sitemap.xml + llms.txt en parallèle, user-agent dédié, timeout 15s)
- `lib/audit/phases/technical.ts` : **Phase 1 implémentée** (12 pts) — title, meta description, canonical, lang, viewport, charset, favicons, Open Graph (5 champs), Twitter Cards (4 champs), robots.txt (Disallow: / critical), sitemap.xml
- `lib/audit/engine.ts` : orchestrateur avec PHASE_ORDER + PHASE_SCORE_MAX, dispatcher runPhase(key). 10 phases restantes en status `skipped`.
- Tests `tests/audit/phases/technical.test.ts` : 7 suites (perfect page, missing title, Disallow: /, canonical cross-domain, missing robots/sitemap, missing OG, golden determinism)

## Flow bout en bout validé (2026-04-15)

- Dashboard `/dashboard` → liste 5 derniers audits + CTA
- `/dashboard/audits/new` → form url + client, submit → POST /api/audits → 202 { id }
- Redirect `/dashboard/audits/:id` avec polling 2s via React Query
- processAudit via `after()` Next 16 (fire-and-forget, pas de blocking)
- Phase 1 crawl HTML + robots.txt + sitemap.xml → findings persisted au fil
- Page détail : ScoreBadge 0-100 coloré, PhaseCard expandable, FindingItem avec severity/recommandation/metrics/effort
- Tests E2E manuel sur `https://wyzlee.com` : 15 findings remontés, score 0/12 clampé
- Migration Neon : `points_lost`, `score`, `score_max`, `score_total` → `real` (support décimaux 0.5)

## Ce qui reste — Sprint 03

- Phase 3 `geo` (18 pts, poids max — différenciant produit)
- Phase 2 `structured_data` (15 pts)
- Phase 4 `entity`, 5 `eeat`, 6 `freshness`, 7 `international`, 8 `performance`, 9 `topical`, 10 `common_mistakes`, 11 `synthesis`
- Worker claim loop réel (remplacer after() en prod si audits > quelques minutes)
- Webhook Stack Auth prod (à configurer au deploy)

## Points d'attention

- `eslint-config-next` non compatible ESLint 9 flat config (bug circular JSON) — remplacé par `typescript-eslint` natif. À ré-évaluer si Next publie une version flat-compatible.
- `ignoreBuildErrors: false` dès le départ — aucune dette TS tolérée.
- Versions Golden Stack exactes (zod@4, sonner@2, tailwind-merge@3) — ne pas downgrader.
