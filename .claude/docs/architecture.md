# Architecture

## Vue d'ensemble

```
            ┌──────────────────────────────────────────────────────┐
            │                  Client browser                       │
            │   (Next.js SSR + React 19 + Stack Auth cookie SSO)    │
            └───────────┬──────────────────────────┬────────────────┘
                        │                          │
                        │ HTTPS                    │ HTTPS
                        ▼                          ▼
            ┌─────────────────────┐      ┌──────────────────────┐
            │  seo-geo.wyzlee.cloud│      │  auth.wyzlee.com     │
            │  (Traefik + Docker)  │      │  (Stack Auth SSO)    │
            │  Next.js 16 standalone│     │  shared across Wyz*  │
            └───────────┬──────────┘      └──────────────────────┘
                        │
      ┌─────────────────┼─────────────────┐
      │                 │                 │
      ▼                 ▼                 ▼
 ┌────────┐     ┌──────────────┐     ┌──────────┐
 │ App    │     │ API routes   │     │ Worker   │
 │ pages  │     │ Next 16      │     │ Node.js  │
 │ (SSR)  │     │ /api/*       │     │ audit    │
 └────────┘     └──────┬───────┘     │ engine   │
                       │              └────┬─────┘
                       ▼                   │
                 ┌──────────────────────────┐
                 │  Neon Postgres           │
                 │  (HTTP driver serverless)│
                 │  DB per app (seo-geo)    │
                 └──────────────────────────┘
                             ▲
                             │
                 ┌───────────┴────────────┐
                 │ Queue = same Postgres  │
                 │ (SELECT ... FOR UPDATE │
                 │  SKIP LOCKED)          │
                 └────────────────────────┘
```

## Pièces principales

### Frontend (Next.js 16 App Router)

- Server Components par défaut, Client Components opt-in (`'use client'`)
- Pages :
  - `/` → landing interne (V1) / marketing (V2)
  - `/login` + `/auth/callback` → Stack Auth
  - `/dashboard` → liste audits (protégé par `auth-guard.tsx`)
  - `/dashboard/audits/:id` → détail audit (11 phases, findings)
  - `/dashboard/audits/new` → formulaire création audit (URL ou upload)
  - `/r/:slug` → rapport public partageable (lien tokenisé)
- State :
  - Server state : `@tanstack/react-query` (audits list, audit detail)
  - Client state : `zustand` (filtres UI, modales)
- Design system : Cabinet Grotesk (display) + Fira Code (body), palette sémantique CSS vars (voir `ui-conventions.md`)

### API routes (Next.js 16)

Chaque route privée commence par `authenticateRequest(req)` (pattern wyz-scrib `lib/auth/server.ts`) qui :
1. Lit le JWT Stack Auth depuis cookie
2. Valide via `jose` + JWKS distant
3. Charge `user` + `org` + `membership` depuis Neon
4. Rejette 401 si invalide, 403 si user n'appartient pas à l'org

Routes principales :
- `POST /api/audits` — crée un audit, enqueue
- `GET /api/audits` — liste audits de l'org courante
- `GET /api/audits/:id` — détail + findings
- `POST /api/audits/:id/report` — génère le rapport (async)
- `GET /api/audits/:id/report` — récupère le rapport généré
- `POST /api/uploads/code` — upload zip (V1.5 sprint 06)
- `POST /api/github/connect` — OAuth GitHub (V1.5)
- `GET /api/health` — healthcheck public, 200 OK si DB connectée

Chaque input validé par Zod (schemas dans `lib/types/`).

### Worker (audit engine)

Processus Node.js séparé (`worker/` dir), 1 seul container V1. Boucle :

```ts
while (true) {
  const audit = await claimNextAudit()  // SELECT ... FOR UPDATE SKIP LOCKED
  if (!audit) { await sleep(2000); continue }
  try {
    await runAudit(audit)               // 11 phases séquentielles
  } catch (e) {
    await markFailed(audit.id, e)
  }
}
```

Lock-free multi-worker possible V2 (ajouter workers si queue backlog).

### Database (Neon Postgres)

- HTTP driver `@neondatabase/serverless` (jamais `pg` brut)
- Lazy Proxy pattern dans `lib/db/index.ts` (voir wyz-scrib)
- Schema défini dans `lib/db/schema.ts` via Drizzle — voir `data-model.md`
- Migrations via `drizzle-kit`, workflow dans `.claude/commands/db-migrate.md`
- Neon branching : `main` = prod, branches éphémères pour dev / preview

## Flux d'un audit URL (bout en bout)

```
1. User (Olivier)  →  POST /api/audits { url: "https://client.com", org_id }
2. API route        →  INSERT audits (status=queued) RETURNING id
3. API route        →  return 202 Accepted + { audit_id }
4. Worker           →  claimNextAudit() → audit_id, lock
5. Worker           →  UPDATE status=running, started_at=now()
6. Worker           →  fetch URL HTML (Playwright headless)
7. Worker           →  fetch /robots.txt, /sitemap.xml, /llms.txt (WebFetch)
8. Worker           →  Phase 1 (Technical) → INSERT findings + INSERT audit_phases (score_phase_1)
9. Worker           →  Phase 2 (Structured Data) → ... idem
10. Worker          →  ... 11 phases ...
11. Worker          →  UPDATE audits SET status=completed, score_total, finished_at
12. Frontend        →  polls GET /api/audits/:id every 3s → reçoit status=completed
13. User            →  clique "Générer rapport" → POST /api/audits/:id/report
14. API route       →  enqueue report generation (ou lance sync si court)
15. User            →  télécharge PDF ou partage lien /r/:slug
```

## Flux d'un audit code upload (Sprint 06)

```
1. User        →  UI upload zip OU connect GitHub
2. Frontend    →  POST /api/uploads/code (multipart) OU GitHub OAuth dance
3. API route   →  write zip to ephemeral storage (S3-compat ou /tmp avec cleanup) ou clone repo
4. API route   →  validate size, zip bomb check, extract
5. API route   →  POST /api/audits { upload_id, org_id }
6. Worker      →  claim, same 11 phases mais phases adaptées au code (pas crawl live)
7. Worker      →  delete ephemeral storage après audit (retention max 24h)
8. ... reste idem URL flow
```

Voir `security.md` pour garde-fous sandboxing.

## Multi-tenant

Toutes les tables métier portent `organization_id` (+ `workspace_id` V2 si besoin de sous-organisations).

Chaque query de data domain passe par une helper qui injecte `WHERE organization_id = :current_org`. Jamais de query directe sans le scope.

Un user peut être membre de plusieurs orgs (table `memberships` avec role). L'org courante est dans le JWT Stack Auth (ou sélectionnée via UI si multi-org).

## Déploiement

- Dockerfile multi-stage : `deps → builder → runner`, base `node:20-alpine`
- `output: 'standalone'` dans `next.config.ts`
- docker-compose.yml avec labels Traefik (route `seo-geo.wyzlee.cloud`, Let's Encrypt auto)
- Worker : container séparé, même image, `CMD ["node", "dist/worker/index.js"]`
- Secrets : env vars injectés par docker-compose depuis `.env` VPS (git-ignored)

## Scalabilité (notes V2+)

- Workers horizontaux : plusieurs containers worker, la queue SKIP LOCKED gère
- Cache layer : Redis pour résultats d'audit récents (si re-runs fréquents)
- Storage long-terme : S3-compat pour PDF rapports, HTML snapshots archivés
- CDN : Cloudflare ou Vercel pour assets statiques (fonts Cabinet Grotesk, etc.)

## Décisions non-discutables

- **Pas de microservices**. Tout dans un monorepo Next.js + 1 worker Node.
- **Pas de GraphQL V1**. REST + Zod suffit.
- **Pas de serveur Node custom**. Next.js standalone only.
- **Pas de tRPC**. REST ok pour V1, tRPC à considérer V2 si friction DX.
