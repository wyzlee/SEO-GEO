# Audit codebase — SEO-GEO
> Mis à jour le 2026-04-20 (Phase 1 re-run)

## Stack technique

| Composant | Version | Conforme Golden Stack |
|-----------|---------|----------------------|
| Next.js | 16.1.6 | ✅ |
| React | 19.2.3 | ✅ |
| Drizzle ORM | 0.45.1 | ✅ |
| @neondatabase/serverless | ^1.0.2 | ✅ |
| @stackframe/react | 2.8.77 | ✅ |
| jose | 6.2.1 | ✅ |
| zustand | 5.0.11 | ✅ |
| @tanstack/react-query | 5.90.21 | ✅ |
| zod | 4.3.6 | ✅ |
| tailwindcss | 4.1.9 | ✅ |
| lucide-react | 0.577.0 | ✅ |
| sonner | 2.0.7 | ✅ |
| @anthropic-ai/sdk | 0.90.0 | Extra — content briefs |
| stripe | 22.0.2 | Extra — billing |
| @sentry/nextjs | ^10.49.0 | Extra — monitoring |
| upstash/redis | 1.37.0 | Extra — rate limiting |
| puppeteer-core + @sparticuz/chromium | 24.41.0 | Extra — PDF génération |
| cheerio | 1.2.0 | Extra — HTML parsing |

## Architecture

```
/app/               — 40 pages (Next.js App Router)
  (root)/           — landing
  admin/            — super-admin (8 pages)
  api/              — 47 route handlers
  auth/             — callback + logout
  blog/             — MDX blog (dynamique)
  dashboard/        — app principale (17 pages)
  legal/            — CGU, DPA, privacy, mentions
  r/[slug]          — rapport public partageable
/components/
  audit/            — 11 composants (ScoreBadge, PhaseCard, FindingItem, etc.)
  layout/           — 6 composants (AppShell, Sidebar, Header, etc.)
  ui/               — ~15 headless composants (shadcn pattern)
  billing/          — 1 composant (BillingClient)
/lib/
  audit/            — moteur complet (process.ts, 11 phases, crawl, compare, etc.)
  auth/             — Stack Auth JWT + org scope
  db/               — Drizzle lazy proxy + 14 tables
  billing/          — Stripe integration
  email/            — Resend transactionnel
  hooks/            — 20+ React Query hooks
  report/           — génération rapport white-label
  security/         — rate limit, SSRF guard, validation
  stores/           — Zustand UI store
/worker/            — worker Node.js dédié (claim loop)
/tests/             — 41 fichiers (62/62 passent)
/drizzle/           — 13 migrations SQL
/content/blog/      — articles MDX
```

## DB — 14+ tables Drizzle

| Table | Champs clés |
|-------|-------------|
| organizations | id, name, slug, branding JSONB, plan, stripe_customer_id |
| users | id, email, is_super_admin, is_active |
| memberships | user_id FK, organization_id FK, role (owner/admin/member) |
| audits | 19 champs, org_id FK, status, score_total, score_breakdown JSONB |
| audit_phases | audit_id FK, phase_key, score, score_max, status, summary |
| findings | 16 champs, severity, category, recommendation, points_lost |
| reports | audit_id FK, share_slug unique, content_md, pdf_storage_key |
| webhooks | org_id FK, url, secret HMAC, events CSV |
| sources | id, claim, url (citations dans findings) |
| scheduled_audits | org_id FK, frequency, nextRunAt, alertThreshold |
| invitations | org_id FK, token unique, expiresAt |
| org_admin_grants | user_id FK, org_id FK (accès cross-org) |
| benchmarks | org_id FK, mode, status |
| citation_checks | org_id FK, domain, tool (perplexity/openai), isCited |
| content_briefs | audit_id FK, outline JSONB, brief_md |

## Moteur d'audit — 11 phases (100 pts)

| # | Phase | Pts | Fichier | LOC |
|---|-------|-----|---------|-----|
| 1 | technical | 12 | lib/audit/phases/technical.ts | 537 |
| 2 | structured_data | 15 | lib/audit/phases/structured-data.ts | 551 |
| 3 | geo | **18** | lib/audit/phases/geo.ts | 529 |
| 4 | entity | 10 | lib/audit/phases/entity.ts | 265 |
| 5 | eeat | 10 | lib/audit/phases/eeat.ts | 428 |
| 6 | freshness | 8 | lib/audit/phases/freshness.ts | 303 |
| 7 | international | 8 | lib/audit/phases/international.ts | 293 |
| 8 | performance | 8 | lib/audit/phases/performance.ts | 295 |
| 9 | topical | 6 | lib/audit/phases/topical.ts | 516 |
| 10 | common_mistakes | 5 | lib/audit/phases/common-mistakes.ts | 365 |
| 11 | synthesis | 0 | lib/audit/phases/synthesis.ts | 301 |

**Inputs** : URL live (fetch+cheerio+BFS, pas Playwright), ZIP upload (50 Mo max), GitHub clone (public repos V1)

**Modes** :
- `flash` — 4 phases (technical, structured_data, geo, common_mistakes), 15s timeout
- `standard` — 8 phases, 120s
- `full` — 11 phases, 600s, BFS crawl 50 pages max

**PDF** : @sparticuz/chromium sur Vercel (memory: 2048MB, maxDuration: 60s)

**Worker** : process Node.js séparé, claim loop, backoff/jitter, graceful shutdown 30s

## Tests (62/62 passent)

- 5 tests API routes
- 22 tests moteur d'audit (phases + orchestration)
- 13 tests librairies (compare, report, sécurité, webhooks)
- 1 test composant (button)
- 1 test observabilité (logger)
- 1 test e2e Playwright (critical path)

Coverage thresholds : 85% security, 80% phases.

## Qualité code

**Forces** :
- 0 erreurs TypeScript (strict mode ES2022)
- 0 warnings ESLint
- Design system compliance 95% (53/53 validé)
- Org isolation SQL systématique
- SSRF guard multi-couche (assertSafeUrl + assertSafeDnsUrl + redirect re-validation)
- Rate limiting durable (Upstash Redis sliding window)
- Prompt caching Anthropic sur system prompt

**Points faibles identifiés** :
- `console.log` dans `lib/audit/crawl.ts` lignes ~385, 405 → utiliser `logger.info`
- 5 `<img>` sans next/image dans pages admin
- TODO: guard "last owner deletion" dans `app/api/admin/org/members/[userId]/route.ts`
- TODO: `/api/admin/org/audits` non scopé pour org-admins (403)
- Skip link `#main-content` absent de `app/layout.tsx`
- Wikidata lookup (phase entity) = stub vide
- CrUX API (phase performance) = fallback static
- Pas de CSP header actif
- `waitUntil: 'networkidle0'` dans PDF → remplacer par `'load'`
- Pas de `maxRetries` sur client Anthropic SDK
- Crawl fetch+cheerio ne rend pas le JS (~35% des sites SPA non crawlés correctement)

## Sprint status

| Sprint | Contenu | État |
|--------|---------|------|
| 00-07 | Scaffold → Polish V1 final | ✅ Tous terminés |
| 08 | Stripe prod + landing publique + RGPD | ⏳ En cours |
