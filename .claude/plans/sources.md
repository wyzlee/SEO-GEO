# Sources — Phase 1 Full Analysis
> Avril 2026

---

## Codebase (sources primaires)

- `/Users/olivier/Developer/Chloe/SEO-GEO/` — exploration exhaustive
- `package.json` — versions stack technique
- `lib/db/schema.ts` — modèle de données complet
- `lib/audit/process.ts` + `lib/audit/phases/*` — moteur 11 phases
- `lib/audit/modes.ts` — 3 modes (flash/standard/full)
- `lib/security/url-guard.ts` — SSRF guard actuel
- `next.config.ts` — headers sécurité CSP
- `.claude/plans/vendable-analyse-globale.md` — paliers commerciaux A/B/C + gaps bloquants
- `.claude/docs/audit-engine.md` — spec technique 100pt scoring
- `.claude/docs/mvp-roadmap.md` — sprints 00-08

---

## Concurrents (via agents WebSearch, avril 2026)

| Source | URL | Thème |
|--------|-----|-------|
| Semrush pricing | https://www.semrush.com/prices/ | Tarifs Pro/Guru/Business |
| Semrush One | https://www.semrush.com/semrush-one/ | Bundle SEO+GEO $199/mo |
| Semrush AI Visibility Toolkit | — | Add-on GEO $99/mo lancé sept. 2025 |
| Ahrefs pricing | https://ahrefs.com/pricing | $29-449/mo, pas de freemium |
| Ahrefs revenue 2024 | — | $149M, +49% YoY (bootstrappé) |
| SE Ranking pricing | https://seranking.com/subscription.html | Core $103/mo + Agency Pack $69 |
| Search Atlas | https://searchatlas.com/pricing | $99-999/mo, white-label inclus |
| AgencyAnalytics | https://agencyanalytics.com/pricing | $79-179/mo + repricing oct. 2025 |
| AthenaHQ | https://athenahq.com | $295/mo GEO natif |
| Otterly.ai | https://otterly.ai | $29/mo GEO monitoring |
| Profound | https://profound.co | $99/mo Enterprise GEO |
| Peec AI | https://peec.ai | ~€89/mo GEO monitoring FR |
| Screaming Frog | https://www.screamingfrog.co.uk/seo-spider/ | £199/an SEO technique |
| Sitebulb | https://sitebulb.com | ~£30/mo SEO technique |

---

## Growth / Métriques (via agents, données publiques 2026)

| Source | Donnée |
|--------|--------|
| Semrush FY2025 results | ARR $471M, Revenue $443.6M |
| Adobe acquisition Semrush | $1.9 Md, closing H1 2026 |
| Ahrefs revenue | $149M FY2024, +49% YoY |
| AgencyAnalytics repricing | Oct. 2025 : frais/client doublés ($10→$20) |
| Benchmarks activation SaaS | Médiane 30-36%, Top 10% >50% |
| Freemium→paid conversion | 2.6% marché, 5.1% feature-gated |
| Trial opt-in (sans CB) conversion | 15-30%, top 35-45% |
| Churn annuel agency tools | ~38%, réductible <25% avec white-label |
| LTV agency ($149/mo, 30% churn) | ~$5 960 |
| CAC SEO/content vs paid | $290-480 vs $1 200 (3.3x meilleurs economics) |
| Ahrefs fermeture programme affilié | 2024 — opportunité marché |

---

## Tech (via agents, documentation officielle 2026)

| Source | Donnée |
|--------|--------|
| Vercel Workflow WDK | GA 16 avril 2026, >100M runs en prod |
| Claude Haiku 4.5 pricing | $1/$5 par MTok input/output |
| Anthropic prompt caching | ~90% d'économies si system prompt caché |
| Sentry Next.js | https://docs.sentry.io/platforms/javascript/guides/nextjs/ |
| Upstash Redis rate limit | https://upstash.com/docs/redis/sdks/ratelimit/overview |
| Neon Postgres HTTP driver | https://neon.tech/docs/serverless/serverless-driver |
| WCAG 2.2 AA contrast ratio | 4.5:1 minimum (texte normal) |

---

## UX/UI (via agents, standards 2026)

| Source | Donnée |
|--------|--------|
| WCAG 2.2 (W3C) | https://www.w3.org/TR/WCAG22/ — touch targets 44×44px |
| Print color adjust CSS | `print-color-adjust: exact` requis pour fonds sombres en PDF |
| `red-500` sur `#080C10` | Ratio ~4.4:1 → en-dessous WCAG AA 4.5:1 → utiliser `red-400` |
| Pattern "forces avant findings" | Réduit le "churn psychologique" agences — pattern validé par concurrents |
| White-label Silver 2026 | Custom domain + email agence = standard pour deals agency tier |
