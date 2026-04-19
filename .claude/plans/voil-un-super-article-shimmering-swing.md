# Plan d'implémentation — 6 features majeures (article BDM)

> **Déclencheur** : Article BDM "Comment les agents IA transforment le SEO — 5 exemples concrets" + analyse Sedestral.  
> **Objectif** : Transformer SEO-GEO d'un outil d'audit ponctuel en plateforme de visibilité IA continue.  
> **Date** : 2026-04-19

---

## Context

L'article BDM décrit 5 usages d'agents IA dans le SEO (monitoring continu, analyse concurrent, backlinks, contenu, veille technique). SEO-GEO couvre zéro de ces 5 exemples directement — mais couvre des angles que l'article n'aborde pas (GEO readiness, entité, E-E-A-T, audit code pre-launch).

**Positionnement cible** : SEO-GEO = le diagnostic qui guide les agents d'exécution. Ajout de 6 features pour combler les gaps critiques sans basculer sur le terrain de Sedestral (exécution autonome).

---

## État du codebase pré-implémentation

| Aspect | Existant |
|--------|---------|
| Scheduled audits | Table `scheduledAudits` ✅, cron `/api/cron/run-scheduled` ✅, mais pas d'alertes drift |
| Compare N vs N-1 | `lib/audit/compare.ts` ✅, API `/api/audits/[id]/compare` ✅ |
| CrUX API key | `GOOGLE_CRUX_API_KEY` dans `.env.template` ✅, Phase 8 utilise heuristiques |
| Claude API | `@anthropic-ai/sdk` installé ✅ |
| Multi-page | `subPages?: SubPageSnapshot[]` dans types ✅, `maxSubPages: 20` dans resolveInput ✅, BFS pas encore implémenté |
| Citation monitoring | ❌ Absent |
| Benchmark multi-URL | ❌ Absent |

---

## Les 6 features à implémenter

### Feature 1 — Multi-page Crawl (50 pages)

**Fichiers à modifier :**
- `lib/audit/crawl.ts` — Ajouter BFS crawl, liens internes, max 50 pages
- `lib/audit/types.ts` — Compléter `SubPageSnapshot` (url, html, status, title, h1, wordCount, internalLinks)
- `lib/audit/phases/topical.ts` — Utiliser `crawl.subPages` pour pillar/cluster analysis réelle
- `lib/audit/phases/common-mistakes.ts` — Utiliser subPages pour redirections en chaîne cross-pages
- `lib/audit/process.ts` — Passer `maxSubPages: 50` en mode `full`

**Logique BFS :**
```typescript
async function crawlMultiPage(startUrl: string, maxPages = 50): Promise<SubPageSnapshot[]>
// BFS : queue = [startUrl], visited = Set<string>
// Pour chaque page : fetch HTML, extract <a href> internal links, push to queue
// Respecte robots.txt, timeout global 120s, ignore assets/images/pdf
```

---

### Feature 2 — CrUX API réelle (Performance Phase)

**Fichiers à créer/modifier :**
- `lib/integrations/crux.ts` — Nouveau : wrapper CrUX API (Chrome UX Report)
- `lib/audit/phases/performance.ts` — Remplacer heuristiques par CrUX API si GOOGLE_CRUX_API_KEY présent

**Appel CrUX :**
```
POST https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=API_KEY
Body: { url, formFactor: 'PHONE', metrics: ['largest_contentful_paint', 'interaction_to_next_paint', 'cumulative_layout_shift'] }
```
**Fallback** : si pas de données CrUX → heuristiques actuelles.

---

### Feature 3 — Score Drift Alerts

**Existant réutilisé :** `scheduledAudits`, `compare.ts`, email via Resend

**Fichiers à modifier :**
- `lib/db/schema.ts` — Ajouter `alertThreshold` (int, défaut 5) + `lastAlertSentAt` sur `scheduledAudits`
- `lib/audit/schedule.ts` — Après re-audit : comparer score vs précédent, envoyer email si drift ≥ threshold
- `lib/email/notify-score-drift.ts` — Nouveau : template email drift (score avant/après, phases impactées)
- `drizzle/` — Migration pour nouvelles colonnes

---

### Feature 4 — Benchmark Concurrent (multi-URL)

**Nouvelles tables DB :**
```sql
benchmarks (id, organization_id, created_by, name, status, created_at, finished_at)
benchmark_urls (id, benchmark_id, url, label, is_reference, audit_id)
```

**Fichiers à créer :**
- `lib/db/schema.ts` — Tables `benchmarks` + `benchmarkUrls`
- `app/api/benchmarks/route.ts` — POST + GET
- `app/api/benchmarks/[id]/route.ts` — GET résultats comparatifs
- `lib/audit/benchmark.ts` — Lance audit pour chaque URL, agrège écarts
- `app/dashboard/benchmarks/page.tsx` — Liste
- `app/dashboard/benchmarks/new/page.tsx` — Formulaire (max 5 URLs)
- `app/dashboard/benchmarks/[id]/page.tsx` — Tableau comparatif
- `components/audit/benchmark-table.tsx` — Tableau par phase

**Fichiers à modifier :**
- `worker/index.ts` — Poll `benchmarks` en plus d'`audits`
- `drizzle/` — Migration

---

### Feature 5 — AI Citation Monitoring

**Nouvelle table DB :**
```sql
citation_checks (
  id, organization_id, domain, query,
  tool ('perplexity'|'openai'),
  is_cited bool, competitor_domains_cited text[],
  raw_response text, checked_at
)
```

**Fichiers à créer :**
- `lib/integrations/citation-monitor.ts` — Appels Perplexity API + OpenAI + parsing citations
- `app/api/citations/route.ts` — POST (run check) / GET (list)
- `lib/db/schema.ts` — Table `citationChecks`
- `app/dashboard/citations/page.tsx` — Dashboard citations
- `components/audit/citation-monitor.tsx` — Widget tableau requêtes × outils × statut

**Variables d'env (.env.template) :**
```
PERPLEXITY_API_KEY=
OPENAI_API_KEY=
```

---

### Feature 6 — Content Brief Generation (Claude-powered)

**Nouvelle table DB :**
```sql
content_briefs (
  id, audit_id, organization_id,
  title, target_keyword, search_intent, content_type,
  word_count_target, outline jsonb, eeat_angle,
  semantic_keywords text[], brief_md, created_at
)
```

**Fichiers à créer :**
- `lib/audit/briefs.ts` — Findings → prompt Claude → brief structuré JSON
- `app/api/audits/[id]/briefs/route.ts` — POST + GET
- `components/audit/content-brief.tsx` — Affichage brief
- `app/dashboard/audits/[id]/briefs/page.tsx` — Page briefs

---

### Feature 7 — /guide mis à jour

**Fichiers à modifier :**
- `guide/seo-geo.html` — Section "Nouvelles fonctionnalités 2026" (multi-page, CrUX, drift, benchmark, citations, briefs)
- `guide/index.html` — Mettre à jour entrée SEO-GEO

---

## Ordre d'implémentation

```
1. DB schema (benchmarks, citationChecks, contentBriefs, alertThreshold) + migrations
2. lib/integrations/crux.ts + performance.ts (CrUX réel)
3. lib/audit/crawl.ts multi-page BFS + topical.ts
4. Score drift alerts (schedule.ts + email)
5. Benchmark (lib + API + worker + UI)
6. Citation monitoring (lib + API + UI)
7. Content briefs (lib + API + UI)
8. /guide mis à jour
```

---

## Vérification end-to-end

- [ ] CrUX : audit wyzlee.com → Phase Performance affiche métriques réelles (LCP, INP, CLS)
- [ ] Multi-page : audit wyzlee.com → Phase Topical affiche pages crawlées + orphelines
- [ ] Drift alert : re-audit forcé avec score simulé en baisse → email reçu
- [ ] Benchmark : wyzlee.com + sedestral.com → tableau comparatif par phase
- [ ] Citation : query "audit SEO 2026" → résultat Perplexity avec domaines cités
- [ ] Brief : post-audit wyzlee.com → brief généré pour gap topical détecté
- [ ] Guide : seo-geo.html mis à jour visible dans navigateur
