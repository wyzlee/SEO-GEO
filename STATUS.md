# Status

**Dernière mise à jour** : 2026-04-15

## État actuel

- Sprint 00 — Scope & fondations docs : **terminé**
- Sprint 01 — Scaffold Next.js 16 + Stack Auth + Neon : **terminé**
- Sprint 02 — Data model + auth opérationnelle : **terminé** (login email/password testé end-to-end)
- Sprint 03 — Moteur d'audit : **terminé** — 11/11 phases, flow bout en bout live
- Sprint 04 — Dashboard polish : **terminé** (breakdown chart + points critiques highlight)
- Sprint 05 — Report generator white-label FR : **terminé** (template FR + HTML auto-contained + route publique `/r/:slug`)

**MVP V1 agency mode : livrable.**

## Infra live

- **Neon** : projet `hidden-rice-16181693`, `aws-eu-central-1` (Frankfurt), Postgres 17
- **Stack Auth** : projet dédié `seo-geo` (id `2f01f2d7-054d-4847-b4db-2348dc272f4f`), email/password only
- Seed : org `Wyzlee` + user `olivier.podio@pm.me` (password `Almeria2`) + membership owner
- `.env.local` : DATABASE_URL + Stack Auth keys en place

## Flow produit complet

1. `/login` — email/password (Stack Auth)
2. `/dashboard` — 5 derniers audits + CTA
3. `/dashboard/audits/new` — form URL + client → POST 202
4. `/dashboard/audits/:id` — polling 2s, ScoreBadge coloré, ScoreBreakdownChart 11 phases, section "Points à corriger en priorité" (top 5), détail par phase expandable avec findings
5. Bouton "Générer le rapport" → POST `/api/audits/:id/report` → ouvre `/r/:slug` dans nouvel onglet
6. `/r/:slug` — rapport public FR auto-contained (Cabinet Grotesk + Fira Code), expire 30j

## Moteur complet — phases implémentées (V1 URL mode)

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
| 11 | synthesis | 0 | placeholder (rapport généré depuis findings) |

## Rapport client — structure livrée

- **Page de garde** : eyebrow indigo "Audit SEO & GEO", titre client, URL, scoreBadge coloré (Excellent/Bon/À améliorer/Critique), date FR, consultant
- **Synthèse** : score global, executive summary déterministe (forces/faiblesses détectées), gain potentiel min-max
- **Scoring détaillé** : tableau 11 phases + résumé par phase FR
- **Points à corriger en priorité** : top 5 findings critical/high avec impact, description, recommandation, effort
- **Victoires rapides** : findings `effort=quick` triés par points_lost (max 10)
- **Feuille de route 90 jours** : 3 sprints (Victoires rapides / Structurant / Stratégique) avec checkboxes et points estimés
- **Annexes** : méthodologie 11 phases + contact

## Validations

- `npm run typecheck` : 0 erreur
- `npm run lint` : 0 erreur / 0 warning
- `npm run test` : **62/62 passent**, 13 fichiers
- `/wyzlee-stack-validate` : 53/53 (100%)
- Live wyzlee.com : score 70/100, 26 findings, rapport HTML 14.6 ko généré + accessible via `/r/:slug`

## Commits (session)

- scaffold: Next.js 16 Wyzlee format (Sprint 01)
- test: Vitest + Testing Library + components.json
- db: migration 0000 Drizzle + applied Neon
- auth: Stack Auth projet dédié + seed user/membership
- fix(auth): dashboard bloqué spinner
- auth: cleanup email-password only
- audit: phase 1 technical + orchestrateur
- audit: flow bout en bout (API + UI + persistance + polling)
- audit: phase 3 GEO (18 pts)
- audit: phase 2 Structured Data (15 pts)
- audit: phases 4-10 complètes
- test: couverture tests phases 4-10
- report: moteur de rapport white-label FR + `/r/:slug`
- ui: polish détail audit (breakdown chart + points critiques)

## Ce qui reste — V1.5 / V2

- PDF export (Puppeteer)
- Wikidata lookup réel (WebFetch) pour Phase 4
- Crawl multi-pages (pages internes, hreflang bidirectional, pillar/cluster)
- CrUX API pour LCP/INP/CLS réels (Phase 8)
- Phantom refresh detection (Phase 6)
- Worker claim loop séparé (remplacer after() si audits > quelques minutes)
- Webhook Stack Auth prod (à configurer au deploy sur VPS)
- Filtres sur la liste audits (par status, par date)
- Branding white-label (logo agence, couleur custom)
- Sprint 06 : upload code (zip + GitHub)
- Sprint 07 : deploy prod sur `seo-geo.wyzlee.cloud`
- Sprint 08 : bascule V2 self-serve (Stripe, signup public, landing marketing)

## Points d'attention

- `eslint-config-next` non compatible ESLint 9 flat config (bug circular JSON) — remplacé par `typescript-eslint` natif.
- `ignoreBuildErrors: false` dès le départ.
- Versions Golden Stack exactes (zod@4, sonner@2, tailwind-merge@3).
- `processAudit` tourne dans `after()` de Next 16 (fire-and-forget). Si les audits grossissent en durée, migrer vers worker loop dédié (`worker/index.ts` déjà stubé).
