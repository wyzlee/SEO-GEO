# Status

**Dernière mise à jour** : 2026-04-15

## État actuel — MVP V1 technique terminé

| Sprint | Scope | État |
|--------|-------|------|
| 00 | Scope & fondations docs | ✅ |
| 01 | Scaffold Next.js 16 + Stack Auth + Neon | ✅ |
| 02 | Data model + auth opérationnelle | ✅ |
| 03 | Moteur d'audit 11/11 phases (URL) | ✅ |
| 04 | Dashboard polish (chart + critical) | ✅ |
| 05 | Report generator white-label FR + `/r/:slug` | ✅ |
| 06 | Upload zip + GitHub + code mode phases | ✅ |
| 07 | Polish final (filtres, breadcrumbs, failed audit) | ✅ |
| 08 | V2 self-serve (Stripe, signup, marketing) | ⏳ plus tard |

**Déploiement prod** volontairement repoussé (le projet reste en dev local).

## Infra live (dev)

- **Neon** : projet `hidden-rice-16181693`, `aws-eu-central-1` (Frankfurt), Postgres 17
- **Stack Auth** : projet dédié `seo-geo` (id `2f01f2d7-054d-4847-b4db-2348dc272f4f`), email/password only
- Seed : org `Wyzlee` + user `olivier.podio@pm.me` (password `Almeria2`) + membership owner
- `.env.local` : DATABASE_URL + Stack Auth keys en place

## Flow produit complet

1. `/login` — email/password (Stack Auth)
2. `/dashboard` — 5 derniers audits + CTA
3. `/dashboard/audits` — liste avec filtres par status + recherche URL/dépôt/client + icône input
4. `/dashboard/audits/new` — onglets **URL / Upload code / GitHub** :
   - URL : crawl live 11 phases
   - Upload : drag-and-drop .zip (max 50 Mo) → extract + détection stack + 3 phases code
   - GitHub : `owner/repo[@branch]` clone shallow → 3 phases code
5. `/dashboard/audits/:id` — polling 2s, ScoreBadge, ScoreBreakdownChart 11 phases, points critiques top 5, détail par phase expandable, bouton "Générer le rapport", breadcrumbs
6. `/r/:slug` — rapport public FR auto-contained (HTML, expire 30j)

## Moteur d'audit — 11 phases (URL mode)

| # | Clé | Points | Live wyzlee.com |
|---|-----|--------|-----------------|
| 1 | technical | 12 | 0 |
| 2 | structured_data | 15 | 10 |
| 3 | geo | 18 | 12 |
| 4 | entity | 10 | 9 |
| 5 | eeat | 10 | 8 |
| 6 | freshness | 8 | 6.5 |
| 7 | international | 8 | 8 |
| 8 | performance | 8 | 6 |
| 9 | topical | 6 | 6 |
| 10 | common_mistakes | 5 | 4 |
| 11 | synthesis | 0 | — |
| **Total** | | **100** | **70/100** |

## Moteur d'audit — code mode (zip + GitHub)

3 phases adaptées V1 (regex-based parsing) :
- **technical-code** : `metadata` export, `<head>` static, robots/sitemap files (12 pts)
- **structured-data-code** : JSON-LD dans JSX / HTML, Organization, WebSite, stacking (15 pts)
- **geo-code** : llms.txt, AI bots dans robots.txt, paragraphe intro (18 pts)

7 autres phases restent skipped en code mode (URL mode recommandé pour couverture complète).

Test live GitHub `shadcn-ui/ui` : score 22/100, 12 findings en 6 secondes.

## Rapport client — structure livrée

Page de garde (eyebrow indigo, ScoreBadge coloré par palier, date FR) + Synthèse (exec summary + forces/faiblesses + gain potentiel) + Scoring détaillé (table 11 phases + résumés) + Points à corriger en priorité (top 5) + Victoires rapides (effort quick) + Feuille de route 90j (3 sprints) + Annexes (méthodologie + contact).

## Validations

- `npm run typecheck` : 0 erreur
- `npm run lint` : 0 erreur / 0 warning
- `npm run test` : **62/62 passent**, 13 fichiers
- `/wyzlee-stack-validate` : 53/53 (100%)
- Live URL wyzlee.com : 70/100, rapport HTML généré
- Live GitHub shadcn-ui/ui : 22/100 en 6s, 12 findings

## Commits (session complète)

16 commits : scaffold Sprint 01 → upload code + polish Sprint 07.

## Ce qui reste hors MVP technique

- **V1.5** — extensions incrémentales :
  - AST parsing (remplacer regex dans code mode)
  - CrUX API pour LCP/INP/CLS réels (Phase 8)
  - Wikidata lookup (Phase 4)
  - Crawl multi-pages (pillar/cluster, bidirectional hreflang)
  - PDF export (Puppeteer)
  - Branding white-label (logo agence, couleur)
- **Infrastructure prod** :
  - Deploy VPS `seo-geo.wyzlee.cloud` (Dockerfile + docker-compose déjà prêts)
  - Webhook Stack Auth prod
  - Worker loop dédié si audits > quelques minutes
- **V2 business** :
  - Sprint 08 : Stripe, signup public, landing marketing

## Points d'attention

- `eslint-config-next` non compatible ESLint 9 flat config — remplacé par `typescript-eslint` natif
- `processAudit` via `after()` Next 16 (fire-and-forget). Migrer vers worker dédié en prod si volume
- `.env.local` contient les credentials — ne jamais commiter
- Upload code : archive max 50 Mo, extracted max 500 Mo, cleanup auto après audit
- GitHub clone : public repos only V1, skip node_modules/.git pour le size check
