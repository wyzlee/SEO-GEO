---
description: Bootstrap l'app Next.js 16 format Wyzlee depuis la référence wyz-scrib. No-op si package.json déjà présent.
argument-hint: [--force]
---

# /scaffold-wyz

Scaffold initial de l'app Next.js 16 + Stack Auth + Neon + design system Wyzlee.

**Prérequis** : les docs `.claude/docs/` sont toutes écrites (CLAUDE.md référence le Golden Stack, `data-model.md` défini, etc.).

**Idempotent** : si `package.json` existe déjà à la racine, refuse de tourner (utiliser `--force` pour écraser, mais attention destructif).

## Étapes

### Étape 0 — Guards

1. Vérifier qu'on est dans `~/Developer/Chloe/SEO-GEO/` (`pwd` == path attendu)
2. Vérifier absence de `package.json` (si présent et pas `--force`, abort avec message)
3. Vérifier que `/Users/olivier/Developer/wyz-scrib/` existe (référence) — sinon message d'erreur explicite

### Étape 1 — Copier structure référence

Copier de `wyz-scrib` vers le projet courant, en nettoyant :

- `app/` (structure App Router) → copier `layout.tsx`, `globals.css`, `page.tsx`, `auth/`, `api/health/route.ts`
- `components/` → copier `auth-guard.tsx`, `layout/` (Sidebar, Header)
- `lib/` → copier `db/` (index.ts, schema.ts vide), `auth/` (stack-auth.ts, server.ts, context.tsx, session.ts), `types/`, `api/` (authFetch helper)
- `public/` → copier fonts Cabinet Grotesk woff2 (si présentes dans wyz-scrib)
- `next.config.ts` — adapter (`output: 'standalone'`, external packages si besoin)
- `tsconfig.json` — copier tel quel (paths `@/*`, strict mode)
- `drizzle.config.ts` — adapter (`DATABASE_URL` pour seo-geo DB)
- `tailwind.config.ts` + PostCSS — copier, Tailwind v4 avec `@theme {}` dans globals.css
- `.gitignore` — copier (inclut `.env.local`, `node_modules`, `.next`, `dist`)
- `.env.template` — copier + adapter avec vars du projet (voir `security.md`)
- `proxy.ts` — copier (pattern Next 16)
- `Dockerfile` — multi-stage `node:20-alpine` (adapter image name à `seo-geo`)
- `docker-compose.yml` — labels Traefik (route `seo-geo.wyzlee.cloud`)

### Étape 2 — Personnaliser pour SEO-GEO

Remplacer dans tous les fichiers copiés :
- `wyz-scrib` → `seo-geo`
- `WyzScrib` → `SEO-GEO`
- `wyzscrib.wyzlee.cloud` → `seo-geo.wyzlee.cloud`
- Name in `package.json` → `seo-geo`
- Description in `package.json` → "SEO & GEO audit platform for 2026"

### Étape 3 — Package.json final

Générer `package.json` avec :
- Dépendances Golden Stack (versions exactes de `.claude/docs/` ou de `wyz-hub/CLAUDE.md`)
- `"overrides": { "lucide-react": "^0.577.0" }` — obligatoire
- Scripts :
  - `dev`, `build`, `start`, `typecheck`, `lint`
  - `db:generate`, `db:migrate`, `db:studio`
- Engines : `node >= 20`

### Étape 4 — Initialiser le schema Drizzle

Créer `lib/db/schema.ts` avec les tables définies dans `.claude/docs/data-model.md` :
- `organizations`
- `users`
- `memberships`
- `audits`
- `auditPhases`
- `findings`
- `reports`
- `sourcesTable` (optionnel)

### Étape 5 — Créer le worker

- Créer `worker/index.ts` avec la boucle claim/run/retry
- Créer `worker/Dockerfile` (réutilise l'image runtime, CMD différent)
- Ajouter service `worker` dans `docker-compose.yml`

### Étape 6 — Setup Stack Auth

- Configurer `lib/auth/stack-auth.ts` avec `tokenStore: 'cookie'` et project ID Wyzlee SSO
- Créer pages `/auth/login`, `/auth/callback`, `/auth/logout`
- Configurer webhook `app/api/webhooks/stack-auth/route.ts` pour sync users

### Étape 7 — Design system

- Créer `app/globals.css` avec :
  - `@import "tailwindcss"`
  - `@theme {}` block définissant les CSS vars sémantiques (`--color-bg`, `--color-surface`, etc.)
  - Import fonts Cabinet Grotesk (local) + Fira Code (Google Fonts)
- Créer `components/ui/` de base : `Button`, `Input`, `Card` (stubs conformes design system)

### Étape 8 — Pages stubs

- `/` — landing interne basique (titre + CTA "Aller au dashboard")
- `/dashboard` — liste audits (vide initialement, table stub)
- `/dashboard/audits/new` — form stub (URL input)
- `/dashboard/audits/[id]` — détail stub
- `/login` — Stack Auth flow

Toutes les pages privées wrappées dans `<AuthGuard>`.

### Étape 9 — Créer les dossiers vides

- `lib/audit/phases/` (pour les 11 phases, à remplir Sprint 03)
- `lib/report/` (pour le report generator, Sprint 05)
- `tests/` (tests E2E et unitaires)
- `drizzle/` (migrations générées)

### Étape 10 — Validation

1. Lancer `npm install`
2. Lancer `npm run typecheck` — doit passer
3. Lancer `npm run lint` — doit passer
4. Lancer `/wyzlee-stack-validate` (skill global) — doit retourner PASS
5. Lancer `npm run dev` — app boot, `http://localhost:3000` répond
6. `GET /api/health` retourne `{ status: "ok" }` (200)

### Étape 11 — Commit initial

- `git add -A`
- `git commit -m "scaffold: app Next.js 16 Wyzlee format (Sprint 01)"`
- Pas de push automatique — laisser Olivier décider

### Étape 12 — STATUS

Créer (si absent) `STATUS.md` à la racine :
```
# Status

**Dernière mise à jour** : {{date}}

## État actuel
- ✅ Scaffold Next.js 16 + Stack Auth + Neon done (Sprint 01)
- ⏳ Next : Sprint 02 — data model multi-tenant migrations appliquées
```

## Règles strictes

- **Ne jamais** écraser un fichier existant sans `--force` explicite.
- **Ne jamais** commit de secrets (utiliser `.env.template` uniquement, pas `.env`).
- **Vérifier** Golden Stack après scaffold via `/wyzlee-stack-validate`.
- **Un seul scaffold** par repo. Si re-run nécessaire, passer par `--force` et backup manuel au préalable.

## Erreurs et recovery

- Si `npm install` échoue → log l'erreur, laisser le dossier tel quel, demander investigation manuelle
- Si `typecheck` échoue après scaffold → identifier les fichiers non compatibles wyz-scrib → adapter (peut-être que wyz-scrib utilise une version plus ancienne de Stack Auth que celle ciblée ici)
- Si wyz-scrib lui-même n'est pas à jour avec le Golden Stack → prévenir Olivier, peut-être utiliser wyz-rfp comme référence alternative
