# Diagnostic SWOT — SEO-GEO
> Mis à jour le 2026-04-20 (Phase 1 re-run)

---

## Forces

1. **Moteur d'audit le plus complet du marché** : 11 phases, scoring 100pts, rubric sourcée — aucun concurrent ne combine cette granularité + GEO intégré
2. **Input code unique** (ZIP/GitHub) : fonctionnalité introuvable chez tous les concurrents y compris enterprise — ouvre le segment "studios dev pre-launch"
3. **Rapport white-label FR jargon-free** : livrable directement au client final, bilingue tech/marketing (TechView / MarketingView)
4. **Architecture robuste V1** : 0 erreurs TS, 62/62 tests, org isolation systématique, SSRF guard multi-couche
5. **GEO au cœur** (18pts/100) : le GEO n'est pas un add-on mais la phase la plus pondérée — différenciant structurel
6. **Stack Golden Stack conforme** : upgrade zero-friction si besoin
7. **Prompt caching Anthropic** : coût LLM optimisé dès V1
8. **Citation tracking** (Perplexity/OpenAI) : feature rare, uniquement chez les GEO purs à $90-300/m

---

## Faiblesses

1. **Pas encore en production** : app opérationnelle mais déploiement prod repoussé (Neon dev branch, Stack Auth test credentials)
2. **Sprint 08 incomplet** : Stripe non activé en prod, landing publique manquante — bloque l'acquisition self-serve
3. **CSP absent** : seul trou de sécurité notable — commenté "à définir progressivement" dans next.config.ts
4. **Wikidata et CrUX = stubs** : phases entity et performance partiellement implémentées (fallback static)
5. **Worker séparé** : infrastructure séparée pour les audits longs, complexifie le déploiement Vercel-only
6. **Crawl JS-rendered** : fetch+cheerio ne rend pas le JS — ~35% des sites SPA détectés mais non crawlés correctement
7. **UX d'attente sous-optimale** : les phases terminées ne sont pas affichées pendant que le crawl continue
8. **Pas de Cmd+K** : attendu des users B2B 2025
9. **Pas de MSW dans les tests** : mocks API externes fragiles
10. **TODO org-admins /api/admin/org/audits** : 403 pour org-admins (non-bloquant V1, bloquant multi-org)

---

## Opportunités Quick-Win (< 1 jour)

| Item | Fichier | Effort |
|------|---------|--------|
| console.log → logger.info | lib/audit/crawl.ts L~385, L~405 | 20 min |
| maxRetries: 2 client Anthropic | lib/audit/briefs.ts | 30 min |
| waitUntil: 'load' PDF | lib/report/ (render PDF) | 10 min |
| Skip link #main-content | app/layout.tsx | 30 min |
| next/image + alt images admin | app/admin/organizations/[id]/page.tsx, app/admin/members/page.tsx | 1h |
| Guard last owner deletion | app/api/admin/org/members/[userId]/route.ts | 1h |
| Fix org-admins /api/admin/org/audits | app/api/admin/org/audits/route.ts | 2h |
| Structured outputs Claude tool_use | lib/audit/briefs.ts | 3h |
| Token cost logging Anthropic | lib/audit/briefs.ts | 1h |
| Sentry tag audit_id dans worker | worker/index.ts | 1h |

---

## Opportunités Stratégiques (> 1 jour)

1. **Finir Sprint 08** : Stripe prod + landing publique → débloque revenus (priorité absolue)
2. **CSP en report-only** puis enforced → différenciant sécurité enterprise + conformité EAA
3. **Partial results UI** : afficher phases terminées pendant crawl (pattern GitHub Actions) → réduit abandon
4. **Score ring animé SVG** sur l'audit detail → différenciant visuel immédiat
5. **Stepper de phases** pendant l'audit en cours → réduit anxiété sur les audits 5-10 min
6. **Cmd+K command palette** (cmdk/shadcn-ui) → standard B2B 2025 attendu
7. **Cache CrUX + Wikidata** en Upstash (TTL 24h/7j) → divise ×10 les appels API externes
8. **MSW** pour mocks API externes dans les tests → tests Anthropic/Stripe/Perplexity sans dépendance réseau
9. **Alertes régression** (score baisse > X pts → email) → rétention mécanique, "sentinel"
10. **Crawl JS/SPA** via Firecrawl API optionnel → couvre ~35% des sites SPA non crawlés

---

## Menaces

1. **Semrush** approfondit son AI Search Health score en 2026-2027 (ressources illimitées)
2. **Profound/AthenaHQ** ajoutent un module d'audit technique pour compléter leur offre GEO
3. **Retard go-to-market** : chaque mois sans landing publique = mois sans acquisition organique
4. **European Accessibility Act** (EAA, juin 2025) : sans CSP et skip link, risque légal EU B2B
5. **Dépendance @sparticuz/chromium** : bundle 50-70MB, cold start 4-8s sur Vercel
6. **DNS rebinding TOCTOU** : fenêtre théorique entre validation SSRF et fetch réel

---

## Synthèse

**SEO-GEO occupe un vide de marché réel** : aucun concurrent ne combine audit SEO complet + GEO intégré + input code + rapport FR white-label.

**Fenêtre d'opportunité 12-18 mois** avant que Semrush ou un GEO pur comble le fossé.

**Priorité absolue** : déverrouiller Sprint 08 (Stripe + landing). Les Quick Wins techniques peuvent être faits en parallèle ou juste avant.
