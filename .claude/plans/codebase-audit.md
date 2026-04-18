# Audit Codebase SEO-GEO — Phase 1

> Généré le 2026-04-18 | Source : exploration exhaustive du codebase

---

## 1. Stack Technique

| Couche | Technologie | Version |
|--------|-------------|---------|
| Framework | Next.js | ^16.1.6 |
| UI | React | ^19.2.3 |
| Langage | TypeScript | ^5 (strict) |
| DB ORM | Drizzle ORM | ^0.45.1 |
| DB Driver | @neondatabase/serverless | ^1.0.2 |
| Auth | @stackframe/react | ^2.8.77 |
| JWT | jose | ^6.2.1 |
| Server State | @tanstack/react-query | ^5.90.21 |
| Client State | zustand | ^5.0.11 |
| Validation | zod | ^4.3.6 |
| Styles | tailwindcss | ^4.1.9 |
| Dark mode | next-themes | ^0.4.6 |
| Icons | lucide-react | ^0.577.0 |
| Toasts | sonner | ^2.0.7 |
| PDF | puppeteer-core + @sparticuz/chromium | ^24 / ^147 |
| Tests | vitest + RTL | ^4.1.4 |
| Crawl | cheerio | ^1.2.0 |
| Git clone | simple-git | ^3.36.0 |
| Zip | adm-zip | ^0.5.17 |
| Email | Resend | latest |
| Logging | custom JSON logger | — |

**Runtime** : Node.js ≥ 20, Vercel Functions (Fluid Compute), Frankfurt (aws-eu-central-1)

---

## 2. Structure des Dossiers

```
/
├── app/                     # Next.js App Router
│   ├── api/                 # Route handlers REST
│   │   ├── audits/          # CRUD + report + PDF
│   │   ├── health/          # /api/health 200 OK
│   │   ├── me/              # User info
│   │   ├── organizations/   # Org + webhooks
│   │   ├── uploads/         # Zip upload
│   │   └── webhooks/        # Stack Auth sync
│   ├── auth/                # OAuth callback + logout
│   ├── dashboard/           # Protected shell
│   │   ├── audits/          # Liste + détail + comparaison
│   │   └── settings/        # Org + webhooks
│   ├── legal/               # CGU, privacy, DPA
│   ├── r/[slug]/            # Rapport public partagé
│   └── login/               # Stack Auth form
│
├── lib/
│   ├── audit/               # Moteur 11 phases
│   │   ├── phases/          # technical, structured_data, geo, entity, eeat, freshness, international, performance, topical, common_mistakes, synthesis
│   │   ├── code/            # Audit code (zip/GitHub)
│   │   ├── process.ts       # Orchestrateur principal
│   │   ├── engine.ts        # PHASE_ORDER, score max
│   │   ├── crawl.ts         # Crawleur URL
│   │   ├── crux.ts          # Chrome UX Report API
│   │   ├── flash.ts         # Mode flash (4 phases, 15s)
│   │   └── modes.ts         # 3 modes : flash/standard/full
│   ├── auth/                # Stack Auth + JWT
│   ├── db/                  # Drizzle schema + lazy proxy
│   ├── report/              # Génération HTML/PDF
│   ├── hooks/               # React Query hooks
│   ├── security/            # SSRF guard, rate-limit, IP
│   ├── email/               # Resend templates
│   ├── webhooks/            # HMAC dispatch
│   └── observability/       # Structured JSON logger
│
├── components/
│   ├── audit/               # Score, charts, findings, views
│   ├── layout/              # App shell, header, sidebar
│   └── ui/                  # Primitives (button, card, input)
│
├── worker/index.ts          # Queue polling worker
├── drizzle/                 # Migrations SQL générées
├── tests/                   # 351 fichiers tests
└── .claude/docs/            # Documentation technique
```

---

## 3. Modèle de Données (7 tables Neon Postgres)

### `organizations`
- id, name, slug, branding (jsonb), plan (free|pro|agency), timestamps

### `users`
- id (Stack Auth ID), email, displayName, avatarUrl, timestamps

### `memberships`
- userId → users, organizationId → organizations, role (member|admin|owner)
- Unique: (userId, organizationId)

### `audits`
- organizationId, createdBy, inputType (url|zip|github)
- targetUrl, uploadId, uploadPath, githubRepo
- status (queued|running|completed|failed)
- scoreTotal (0-100), scoreBreakdown (jsonb)
- clientName, consultantName (agency use)
- mode (full|standard|flash)
- previousAuditId (comparaison)
- queuedAt, startedAt, finishedAt, errorMessage
- Indices: (org, status), (status, queuedAt), (previousAuditId)

### `auditPhases`
- auditId, phaseKey, phaseOrder (1-11), score, scoreMax
- status (pending|running|completed|skipped|failed)
- summary, startedAt, finishedAt
- Unique: (auditId, phaseKey)

### `findings`
- auditId, phaseKey, severity (critical|high|medium|low|info)
- category, title, description, recommendation
- locationUrl, locationFile, locationLine
- metricValue, metricTarget
- pointsLost, effort (quick|medium|heavy)

### `reports`
- auditId, format, language, templateVersion
- contentMd, contentHtml, pdfStorageKey
- shareSlug (UNIQUE), shareExpiresAt (30j TTL)
- generatedAt

### `webhooks`
- organizationId, url, secret (HMAC), events, active
- lastSuccessAt, lastErrorAt, lastErrorMessage

---

## 4. Moteur d'Audit — 11 Phases, 100 pts

| # | Phase Key | Pts | Périmètre |
|---|-----------|-----|-----------|
| 1 | technical | 12 | title, meta desc, canonical, lang, viewport, OG, robots.txt, sitemap |
| 2 | structured_data | 15 | JSON-LD types, required props, nesting |
| 3 | geo | 18 | llms.txt, AI bots robots.txt, localité intro |
| 4 | entity | 10 | Wikidata brand lookup, BreadcrumbList, Organization |
| 5 | eeat | 10 | Auteur, dates, expertise signals, citations sources |
| 6 | freshness | 8 | Sitemap lastmod, recrawl freq |
| 7 | international | 8 | hreflang, lang attr, geo-targeting |
| 8 | performance | 8 | CrUX LCP/INP/CLS p75, heuristiques |
| 9 | topical | 6 | Keyword density, TF-IDF |
| 10 | common_mistakes | 5 | Flash indexing, noindex, 404/503 |
| 11 | synthesis | 0 | Résumé IA (V1.5) |

**3 Modes** :
- flash : 4 phases, 0 sous-pages, timeout 15s
- standard : 8 phases, 3 sous-pages, timeout 120s
- full : 11 phases, 20 sous-pages, timeout 600s

**Scoring** : pointsLost par finding → phase_score = scoreMax - sum(pointsLost). Total clamped [0, 100].

---

## 5. Features Utilisateur

### Flux principal
1. Login (Stack Auth SSO)
2. Dashboard → 5 audits récents + CTA
3. Nouvel audit : URL | zip upload | GitHub repo
4. Lancer en mode flash/standard/full (gating plan)
5. Résultats en temps réel (polling 2s via React Query)
6. Score global + radar 11 phases + phase cards expandables
7. Vue toggle : Marketing vs Technique
8. Générer rapport white-label FR (HTML + PDF)
9. Partager via URL publique (30j TTL)
10. Webhooks `audit.completed` pour intégrations tierces

### Routes API
- `POST /api/audits` — Créer audit (rate limit 3/min, 50/24h)
- `GET /api/audits` — Liste filtrée org
- `GET /api/audits/:id` — Détail + phases + findings
- `POST /api/uploads/code` — Zip upload (max 500 Mo extracté)
- `POST /api/audits/:id/report` — Génération rapport
- `GET /r/:slug` — Rapport public (no auth)
- `/r/[slug]/pdf/route.ts` — Export PDF (Puppeteer, 2048 MB, 60s)

---

## 6. Sécurité

- SSRF guard : validation IP privées sur URL cible
- Rate limiting : sliding window in-memory (3/min, 50/24h)
- JWT : validation OIDC remote JWKS (jose)
- CSP : headers configurés (X-Frame-Options DENY, HSTS 2 ans)
- HMAC : webhooks signés SHA-256
- PII : aucun HTML crawlé en logs, seulement findings structurés
- Secrets : .env.local git-ignoré, .env.template committé

---

## 7. Qualité Code

- **Tests** : 62/62 passing (vitest), 351 fichiers
- **Lint** : 0 erreurs, 0 warnings (ESLint 9 flat config)
- **Types** : 0 erreurs TypeScript strict
- **Stack validate** : 53/53 checks Wyzlee Golden Stack ✅
- **Build** : `next build` passe sans erreur

---

## 8. Points Forts

- Architecture multi-tenant propre dès V1 (organization_id sur toutes les tables)
- Stack technique parfaitement alignée Golden Stack Wyzlee
- Moteur d'audit fonctionnel en production (11 phases, 3 modes)
- PDF white-label via Puppeteer sur Vercel (2048 MB, 60s)
- Worker async robuste (claim mechanism sans race condition)
- Tests exhaustifs (62/62, 351 fichiers)

---

## 9. Points Faibles / Hors Scope V1

- Phase 11 synthesis : pas de LLM call en V1 (placeholder)
- Phase 8 performance : CrUX optionnel (key env), pas de Lighthouse réel
- Phase 7 international : hreflang en V1 minimal (multi-page crawl limité)
- Phase 9 topical : TF-IDF basique (pas de vrai NLP)
- Code audit (zip/GitHub) : regex parsing (pas AST)
- Stripe / billing : non implémenté
- Branding white-label UI : logo/couleurs non configurables
- Redis worker queue : pas de scale horizontal
- Organisation selector multi-org en header (V2)
- Pas de CLI ni SDK public
