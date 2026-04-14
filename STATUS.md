# Status

**Dernière mise à jour** : 2026-04-14

## État actuel

- Sprint 00 — Scope & fondations docs : **terminé**
- Sprint 01 — Scaffold Next.js 16 + Stack Auth + Neon : **terminé**
- Sprint 02 — Data model multi-tenant : **en cours** (migrations appliquées, seed initial fait, Stack Auth à configurer)

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
- **Seed** : org `Wyzlee` (id `93851689-012d-44d6-8175-2f97bd4ee9d3`, slug `wyzlee`, plan `agency`) présente
- **`.env.local`** local : `DATABASE_URL` réelle + placeholders Stack Auth à remplacer

## Validation live

- `GET /api/health` → `200 OK` avec `{status: "healthy", database: {status: "ok", latencyMs: ~500}}`
- `GET /` → 200, `GET /dashboard` → 307 (AuthGuard)
- 3 suites de tests passent (10 tests)

## Ce qui reste — Sprint 02

- Remplacer les placeholders Stack Auth dans `.env.local` par les vraies keys (projet SSO Wyzlee)
- Brancher le webhook Stack Auth vers `https://seo-geo.wyzlee.cloud/api/webhooks/stack-auth` + injecter `STACK_WEBHOOK_SECRET`
- Créer une membership pour Olivier sur l'org `Wyzlee` une fois son user_id Stack Auth connu
- Puis Sprint 03 : moteur d'audit 11 phases

## Points d'attention

- `eslint-config-next` non compatible ESLint 9 flat config (bug circular JSON) — remplacé par `typescript-eslint` natif. À ré-évaluer si Next publie une version flat-compatible.
- `ignoreBuildErrors: false` dès le départ — aucune dette TS tolérée.
- Versions Golden Stack exactes (zod@4, sonner@2, tailwind-merge@3) — ne pas downgrader.
