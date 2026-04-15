# Status

**Dernière mise à jour** : 2026-04-14

## État actuel

- Sprint 00 — Scope & fondations docs : **terminé**
- Sprint 01 — Scaffold Next.js 16 + Stack Auth + Neon : **terminé**
- Sprint 02 — Data model + auth opérationnelle : **terminé** (login email/password testé end-to-end Chrome → dashboard)
- Sprint 03 — Moteur d'audit : **11/11 phases implémentées**, flow end-to-end live, test live wyzlee.com = 69.5/100

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

## Moteur complet — phases implémentées

| # | Clé | Points | Couverture V1 |
|---|-----|--------|---------------|
| 1 | technical | 12 | meta + canonical + lang + OG + Twitter + robots + sitemap |
| 2 | structured_data | 15 | JSON-LD parse + Organization + WebSite + Article + stacking |
| 3 | geo | 18 | llms.txt + AI bots + semantic + answer blocks + evidence |
| 4 | entity | 10 | brand coherence + Wikidata + Wikipedia + entity linking |
| 5 | eeat | 10 | HTTPS + trust pages + auteur + Person schema + citations |
| 6 | freshness | 8 | dateModified + time + sitemap lastmod + tolérance par type |
| 7 | international | 8 | hreflang + x-default + og:locale + ccTLD detection |
| 8 | performance | 8 | HashRouter + SSR + images modernes + CLS + preconnect + defer |
| 9 | topical | 6 | ratio liens + anchors diversity + anchors génériques |
| 10 | common_mistakes | 5 | noindex + mixed content + noopener + canonical |
| 11 | synthesis | 0 | placeholder, rapport généré en Sprint 05 |

**Tests** : 62/62 passent (13 fichiers), typecheck 0, lint 0.
**Live wyzlee.com** : 69.5/100 (breakdown : 0 + 10 + 12 + 9 + 8 + 6.5 + 8 + 6 + 6 + 4 + 0).

## Ce qui reste — V1.5 / V2

- Wikidata lookup (WebFetch) pour Phase 4
- Crawl multi-pages pour Phase 9 (pillar/cluster) et 7 (bidirectional hreflang)
- CrUX API pour LCP/INP/CLS réels (Phase 8)
- Phantom refresh detection (Phase 6 content hash diff)
- Worker claim loop réel (remplacer after() si audits > quelques minutes)
- Webhook Stack Auth prod (à configurer au deploy)
- Sprint 04 : Dashboard Olivier polish + filtres audits
- Sprint 05 : Report generator white-label FR + PDF

## Points d'attention

- `eslint-config-next` non compatible ESLint 9 flat config (bug circular JSON) — remplacé par `typescript-eslint` natif. À ré-évaluer si Next publie une version flat-compatible.
- `ignoreBuildErrors: false` dès le départ — aucune dette TS tolérée.
- Versions Golden Stack exactes (zod@4, sonner@2, tailwind-merge@3) — ne pas downgrader.
