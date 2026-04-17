# MVP Roadmap — SEO-GEO

> Sprints séquentiels. Un sprint = ~1-2 semaines. Chaque sprint livre un incrément démontrable.
> Objectif V1 : app Wyzlee déployée sur `seo-geo-orcin.vercel.app`, Olivier lance des audits en agency mode, rapports FR livrés aux clients.
> Objectif V2 : bascule self-serve avec signup public + Stripe.

## Sprint 00 — Scope & fondation documentaire

**Objectif** : cadrer le MVP, lister ce qui est out-of-scope, documenter l'architecture.

- [x] `CLAUDE.md` racine
- [x] `.claude/docs/product-vision.md`, `sources.md`, `mvp-roadmap.md`
- [x] `.claude/docs/architecture.md`, `data-model.md`, `security.md`, `ui-conventions.md`
- [x] `.claude/docs/seo-geo-knowledge.md`, `audit-engine.md`, `report-templates.md`
- [x] `.claude/agents/` + `.claude/commands/`

**Out of scope V1 explicite** :
- Stripe / paiements en ligne
- Onboarding public, signup self-serve
- Landing page marketing (V2)
- Dashboard client-facing (V2 — V1 a un dashboard interne Olivier uniquement)
- Intégrations outils tiers (Peec, Semrush, Ahrefs, Profound) — recommandations textuelles seulement
- Génération automatique de contenu

**Critère de fin** : tous les docs `.claude/` écrits, cohérents, sources traçables.

## Sprint 01 — Scaffold app Next.js + auth + DB

**Objectif** : app qui boot, se déploie, `/api/health` retourne 200.

Actions :
1. Lancer `/scaffold-wyz` → bootstrap depuis `wyz-scrib` comme référence
2. Configurer Stack Auth singleton (SSO partagé Wyzlee)
3. Configurer Neon (nouvelle DB `seo-geo`), lazy Proxy pattern dans `lib/db/index.ts`
4. Dockerfile multi-stage + docker-compose avec labels Traefik
5. Deploy pipeline : push → VPS → Traefik → `seo-geo-orcin.vercel.app`
6. `/api/health` endpoint retournant `{ status: "ok", version, db: "connected" }`

Livrable : app accessible en HTTPS, Stack Auth login fonctionnel, DB connectée.

Validation : `/wyzlee-stack-validate` passe.

## Sprint 02 — Data model multi-tenant

**Objectif** : schéma Drizzle complet, migrations appliquées, tables peuplables.

Actions :
1. Définir schema `lib/db/schema.ts` : `organizations`, `memberships`, `users`, `audits`, `audit_phases`, `findings`, `reports` (voir `.claude/docs/data-model.md`)
2. Webhook Stack Auth pour sync `users` locale
3. Drizzle migrate (dev + prod via Neon branching)
4. Seed script minimal (1 org, 1 user test, 0 audit)

Livrable : tables créées, FK cohérentes, seed script idempotent.

## Sprint 03 — Audit engine V1 (URL-only)

**Objectif** : lancer un audit sur une URL, 11 phases s'exécutent, score calculé, findings stockés.

Actions :
1. Implémenter chaque phase dans `lib/audit/phases/<name>.ts` (voir `.claude/docs/audit-engine.md` pour la spec de chaque phase)
2. Crawler URL : fetch HTML rendu (Playwright headless via worker ou fallback WebFetch), `/robots.txt`, `/sitemap.xml`, `/llms.txt`
3. Orchestrateur : `lib/audit/engine.ts` qui lance les 11 phases séquentiellement, stocke `findings` au fil de l'eau
4. API route `POST /api/audits` (create) + `GET /api/audits/:id` (status + findings)
5. Worker : queue via Postgres `SELECT ... FOR UPDATE SKIP LOCKED`, un worker Node.js dédié

Livrable : `POST /api/audits { url: "https://example.com" }` → audit complet en < 10 min, score dans [0, 100], findings stockés.

Validation : score calculé reproductible (audit 2× la même URL → même score ± tolérance sur timestamps).

## Sprint 04 — Dashboard interne

**Objectif** : Olivier peut voir la liste de ses audits, ouvrir le détail, consulter les findings phase par phase.

Actions :
1. Page `/dashboard` : liste audits (date, URL, score, status)
2. Page `/dashboard/audits/:id` : détail avec 11 phases expandables, score badge, findings par phase
3. Composants design system Wyzlee (sidebar collapsible, palette sémantique, Cabinet Grotesk + Fira Code)
4. Protection par `auth-guard.tsx` wyz-scrib pattern

Livrable : Olivier crée un audit via UI, suit le statut, consulte les findings.

Validation : `/wyzlee-design-validate` passe.

## Sprint 05 — Report generator white-label FR

**Objectif** : générer le rapport client (web + PDF) à partir d'un `audit_id`.

Actions :
1. Agent `report-generator` (ou route API directe) consume findings → render Markdown → render HTML (template FR de `.claude/docs/report-templates.md`)
2. PDF via Puppeteer headless (ou équivalent serverless-compatible)
3. Web share link public `seo-geo-orcin.vercel.app/r/<slug>` (tokenisé, expirable)
4. Branding variable : logo agence partenaire injectable

Livrable : un audit → rapport FR de 15 pages max, jargon-free, variables substituées, PDF téléchargeable + lien partageable.

Validation : revue manuelle par Olivier sur 3 audits réels, ≥ 4/5 perçu.

## Sprint 06 — Input code upload (zip + GitHub)

**Objectif** : accepter en plus de l'URL, un upload de code ou une connexion GitHub pour audit pre-launch.

Actions :
1. UI upload zip (max 50 MB, voir `security.md` pour guards)
2. GitHub OAuth + clone temporaire (branche par défaut)
3. Sandboxing : parsing read-only, aucune exécution, timeout 5 min, filesize limits
4. Stack detection : Next.js (pages vs app), Nuxt, Remix, Astro, React SPA (Vite), static HTML
5. Adapter les phases pertinentes pour raisonner sur le code (ex: phase 2 Structured Data → parser les composants `<script type="application/ld+json">` dans le JSX)

Livrable : audit fonctionne sur upload de repo wyz-hub (test), score cohérent avec une version URL si déployée.

Validation : pas de code client persisté >24h, zéro secret client logué.

## Sprint 07 — Polish V1 + deploy prod

**Objectif** : ship V1 agency mode sur `seo-geo-orcin.vercel.app`.

Actions :

1. [x] Tests d'intégration sur les routes critiques `/api/audits*` (22 tests : auth, validation, SSRF, rate-limit, isolation org, lifecycle rapport) — commit `3530bca`
2. [x] Logs structurés JSON 1-ligne PII-free (`lib/observability/logger.ts`, sérialisation auto des Error, contexte propagé via `.with()`, niveaux via `LOG_LEVEL`) — commit `81543ab`. Error tracking Sentry à brancher après le 1er audit prod si nécessaire.
3. [x] Rate limiting burst (3/min/user) + daily (50/24h/org) sur POST /api/audits — commit `f4db886`
4. [ ] Documentation onboarding (variables d'env, lancer un audit, lire les logs JSON, générer un rapport)
5. [ ] Premier audit "vrai" sur un prospect réel — validation locale d'abord (port ≠ 3000), puis prod

Livrable : V1 en prod, 3+ audits réels livrés à des clients.

État : tests E2E API + observabilité bouclés. Reste validation manuelle bout-en-bout, doc onboarding, deploy VPS.

## Sprint 08 — Bascule V2 self-serve

**Objectif** : ouvrir l'app à l'inscription publique avec paiement Stripe.

Actions :
1. Signup public (Stack Auth public endpoint)
2. Onboarding guidé (questionnaire en 5 étapes → premier audit offert freemium)
3. Stripe integration : 3 plans (Free 1 audit/mois, Pro 10/mois, Agence illimité + white-label)
4. Landing page marketing (copy, témoignages, CTA)
5. Mise en conformité RGPD (CGU, politique confidentialité, DPA template)

Livrable : `seo-geo-orcin.vercel.app` ouvert au public, premiers signups organiques.

**Important** : sprints 00-07 doivent avoir validé que l'audit engine est robuste et que les rapports sont de qualité AVANT d'ouvrir au public. Pas de bascule V2 prématurée.

## Ce qui suit (hors MVP)

- API publique pour agences qui veulent intégrer l'audit dans leur propre dashboard
- Tracking continu avec alertes (KPI Mention Rate / Citation Rate / Position)
- Générateur de contenu (pillar pages, FAQ, schemas) — agent dédié
- Intégrations profondes Peec / Semrush / Ahrefs
- Marketplace consultants agréés
