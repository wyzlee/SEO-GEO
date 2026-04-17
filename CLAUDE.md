# CLAUDE.md — SEO-GEO

> **Projet** : App SaaS d'audit SEO / GEO (Generative Engine Optimization) format Wyzlee.
> **Cible déploiement** : Vercel (projet `seo-geo-wyzlee`), domaine `seo-geo-orcin.vercel.app`.
> **Modèle commercial** : hybride progressif — agency tool V1, self-serve V2.
> **Clients** : agences SEO, dir marketing B2B SaaS, studios dev voulant auditer leurs sites / code source avant release.

---

## Golden Stack — source de vérité

Toutes les règles de stack sont définies dans **`/Users/olivier/Developer/wyz-hub/CLAUDE.md`** (section "Golden Stack"). Ce fichier n'en est pas une copie : il pointe.

**Non-négociables résumés** (à jour mars 2026, re-vérifier via `/wyzlee-stack-validate` avant chaque release) :

- `next@^16.1.6` — App Router, Server Components par défaut, `proxy.ts` (jamais `middleware.ts`)
- `react@^19.2.3`
- `@neondatabase/serverless@^1.0.2` — HTTP driver uniquement, jamais `pg` brut ni Supabase
- `drizzle-orm@^0.45.1` — schema dans `lib/db/schema.ts`, pattern lazy Proxy (voir `wyz-scrib/lib/db/index.ts`)
- `@stackframe/react@^2.8.77` — singleton Stack Auth, `tokenStore: 'cookie'`, SSO partagé Wyzlee
- `jose@^6.2.1` — JWT validation OIDC via remote JWKS
- `zustand@^5.0.11` (client state only) + `@tanstack/react-query@^5.90.21` (server state)
- `zod@^4.3.6` — v4 (`.issues` pas `.errors`)
- `tailwindcss@^4` + `@tailwindcss/postcss`, block `@theme {}` dans le CSS
- `lucide-react@^0.577.0` — **override obligatoire** dans `package.json` : `"overrides": { "lucide-react": "^0.577.0" }`
- `sonner@^2.0.7` — seule lib de toasts autorisée
- `tailwind-merge@^3.5.0`

**Infra déploiement** : Vercel (Next.js natif), `output: 'standalone'` désactivé pour Vercel, `/api/health` endpoint 200 OK.

**DB par app** : chaque app Wyzlee a sa propre DB Neon (jamais partagée). Connexion via HTTP driver serverless.

---

## Design system — source de vérité

Références dans **`/Users/olivier/Developer/wyz-hub/.claude/docs/design-system.md`** + règles locales adaptées SaaS audit dans `.claude/docs/ui-conventions.md`.

**Résumé** :
- Display font : **Cabinet Grotesk** (local woff2, `--font-display`) — h1-h6, boutons, labels, nav sections
- Body font : **Fira Code** (Google Fonts, `--font-sans`) — paragraphes, inputs, nav items
- Palette sémantique CSS variables (`--color-bg`, `--color-surface`, `--color-text`, accents indigo `#4F46E5` / violet `#7C3AED`, statuts green/amber/blue/red)
- Dark mode via `html.dark`, bg dark `#080C10`
- Touch targets min 44×44px (WCAG 2.2)
- Transitions : 150ms micro / 200ms focus / 300ms panels (cubic-bezier 0.4,0,0.2,1)
- Reduced motion : `@media (prefers-reduced-motion: reduce)` → 0.01ms

**Interdit** : Tailwind colors brutes (`bg-blue-500`, `bg-purple-*`). Toujours la palette sémantique.

---

## Conventions projet

**Langues** :
- Code, commentaires, noms de variables, schemas DB → **anglais**
- UI client, labels visibles utilisateur → **français**
- Rapports d'audit générés → **français, jargon-free** (template dans `.claude/docs/report-templates.md`)

**Secrets** : jamais en dur. `.env.local` git-ignored, `.env.template` committé avec les clés documentées (valeurs vides).

**Commits** :
- Messages en français, impératif, court
- Scope préfixé si pertinent : `audit-engine: ajouter phase GEO`
- Jamais de `--no-verify` ni bypass pre-commit hooks

**Déploiement** :
- Workflow : `git commit` → `git push origin main` → Vercel déploie automatiquement
- Variables d'env à configurer dans le dashboard Vercel (jamais dans le code)
- Preview deployments sur chaque branche/PR automatiquement

---

## IP guardrails

La **logique d'audit** est le cœur commercial de ce produit :
- 11 phases d'audit avec leur scoring rubric (100pt)
- Règles de détection des signaux SEO / GEO / E-E-A-T
- Templates de rapport white-label

**Ne jamais** :
- Inclure de contenu client brut dans les prompts partagés, logs, traces
- Committer de clés API clients (Stack Auth app keys, Neon URLs de prod)
- Logger le HTML source crawlé des sites clients (stocker seulement les `findings` structurés)
- Partager les templates de rapport hors git interne

---

## Architecture produit (bref)

- Multi-tenant dès V1 : `organization_id` / `workspace_id` sur toutes les tables métier
- Sync users via Stack Auth webhook → table `users` locale
- Moteur d'audit lancé en worker asynchrone (queue simple via Postgres `SELECT ... FOR UPDATE SKIP LOCKED` pour V1, Redis si scale)
- 2 modes d'input : URL (crawl live) | code upload (zip / GitHub connect) — URL-only d'abord, upload au Sprint 06

Détails complets dans `.claude/docs/architecture.md`, `.claude/docs/data-model.md`, `.claude/docs/audit-engine.md`.

---

## Workflow développement

**Skills globaux à invoquer** (définis dans `~/.claude/skills/`) :

| Quand | Skill | Pourquoi |
|-------|-------|----------|
| Avant premier scaffold app | `/create-wyz-app` | Bootstrap Next.js 16 + structure Wyzlee standard |
| Avant chaque commit sur code app | `/wyzlee-stack-validate` | Vérifie versions Golden Stack |
| Avant chaque PR UI | `/wyzlee-design-validate` | Vérifie design system (fonts, palette, composants) |
| Trimestriellement | `/refresh-sources` (projet) | Re-vérifie les URLs dans `.claude/docs/sources.md` |

**Commandes projet** (dans `.claude/commands/`) :

| Commande | Usage |
|----------|-------|
| `/scaffold-wyz` | Sprint 01 — bootstrap l'app Next.js depuis référence `wyz-scrib` |
| `/new-audit-module` | Scaffold d'une phase d'audit (logic + schema + API + UI) |
| `/new-api-route` | Route API Next.js 16 avec `authenticateRequest` + Zod |
| `/new-feature` | End-to-end schema → migration → API → hook → UI → test |
| `/db-migrate` | Workflow Drizzle (generate → review → apply dev/prod) |
| `/refresh-sources` | Refresh trimestriel des URLs dans `sources.md` |
| `/client-report` | Génère rapport white-label FR pour un `audit_id` |

**Sous-agents** (dans `.claude/agents/`) :

| Agent | Rôle |
|-------|------|
| `audit-engine` | Orchestrateur des 11 phases, crawl URL, parse code |
| `frontend-builder` | Next 16 + design system Wyzlee |
| `backend-builder` | API routes + Drizzle + migrations |
| `report-generator` | Rapports white-label FR à partir des findings |
| `qa-reviewer` | Code review, stack compliance, sécurité |

---

## Index docs

| Fichier | Contenu |
|---------|---------|
| `.claude/docs/product-vision.md` | Pitch, personas, packages commerciaux, pricing |
| `.claude/docs/architecture.md` | Schéma système, multi-tenant, flux d'audit |
| `.claude/docs/data-model.md` | Schémas Drizzle (orgs, audits, findings, reports) |
| `.claude/docs/audit-engine.md` | Spec technique des 11 phases + scoring 100pt |
| `.claude/docs/seo-geo-knowledge.md` | Digest domaine 2026 (signaux, failure modes) |
| `.claude/docs/sources.md` | Index canonique URLs + date consultation |
| `.claude/docs/ui-conventions.md` | Patterns UI spécifiques (table findings, score badge…) |
| `.claude/docs/security.md` | Sandboxing upload, auth boundaries, PII |
| `.claude/docs/report-templates.md` | Structure rapport white-label FR |
| `.claude/docs/mvp-roadmap.md` | Sprints 00-08 |

**Spec source** : `parallel-chasing-corbato.md` (racine) — lecture seule, référence narrative détaillée du domaine.
