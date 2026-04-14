# Status

**Dernière mise à jour** : 2026-04-14

## État actuel

- Sprint 00 — Scope & fondations docs : **terminé**
- Sprint 01 — Scaffold Next.js 16 + Stack Auth + Neon : **terminé** (code en place, à configurer)

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

## Prochain sprint — Sprint 02

- Configurer Neon (nouvelle DB `seo-geo`), remplir `.env.local` avec la connection string
- Configurer Stack Auth project (réutiliser le projet SSO Wyzlee)
- Générer et appliquer les migrations Drizzle initiales : `npm run db:generate` puis `npm run db:migrate`
- Brancher le webhook Stack Auth (`https://seo-geo.wyzlee.cloud/api/webhooks/stack-auth`) côté dashboard Stack Auth, injecter `STACK_WEBHOOK_SECRET`
- Seed script minimal (1 org, 1 membership pour Olivier)

## Points d'attention

- `eslint-config-next` non compatible ESLint 9 flat config (bug circular JSON) — remplacé par `typescript-eslint` natif. À ré-évaluer si Next publie une version flat-compatible.
- `ignoreBuildErrors: false` dès le départ — aucune dette TS tolérée.
- Versions Golden Stack exactes (zod@4, sonner@2, tailwind-merge@3) — ne pas downgrader.
