# Recommandations techniques — SEO-GEO 2025/2026
> Mis à jour le 2026-04-20 (Phase 1 re-run)

---

## 1. Worker async — claim loop Postgres

**État actuel** : process Node.js séparé, UPDATE WHERE status='queued' comme claim atomique, backoff/jitter, graceful shutdown 30s. Séquentiel V1.

**Verdict** : solide pour V1, mais limites structurelles sur Vercel (nécessite infrastructure séparée).

**Recommandation immédiate** : garder le claim loop Postgres. Ajouter `console.log → logger.info` dans `crawl.ts`.

**Migration V2 recommandée → Inngest** :
- SDK Next.js natif, step-by-step (chaque phase = un step → retry granulaire)
- Crash recovery natif sans logique dans persist.ts
- Plan free 50k function-runs/mois, ensuite $20/mois
- Source : https://www.inngest.com/docs/quick-start

**Alternatives évaluées** :
- Vercel Queues : en beta fermée Q1 2026 — surveiller pour H2 2026
- BullMQ + Redis : incompatible avec Upstash HTTP driver

---

## 2. PDF Generation — @sparticuz/chromium

**État actuel** : puppeteer-core + @sparticuz/chromium sur Vercel (memory: 2048MB, maxDuration: 60s). Pas de Gotenberg Docker.

**Fix immédiat** : remplacer `waitUntil: 'networkidle0'` par `waitUntil: 'load'` dans le render PDF — évite l'attente réseau inutile sur HTML self-contained.

**Cold start 4-8s** : acceptable en V1. Si problème UX :
- Court terme : pré-warm via ping /api/health toutes les 5min (Vercel cron)
- Moyen terme : migrer vers browserless.io ou PDFShift (zero cold start)

| Solution | Coût/appel | Latence | Vercel compat |
|----------|-----------|---------|---------------|
| @sparticuz/chromium (actuel) | ~$0 | 5-15s | Oui |
| Browserless.io | $0.02/min | 3-8s | Oui |
| PDFShift | $0.004/page | 2-5s | Oui |

---

## 3. Crawl HTML — fetch + cheerio

**État actuel** : fetch natif + cheerio. Pas de Playwright headless. SSRF guard complet.

**Ce qui est très bien fait** :
- SSRF guard multi-couche (url-guard.ts)
- Redirect chain validation (max 5 hops, re-validation SSRF à chaque hop)
- BFS multi-pages avec concurrence limitée (3 simultanés)
- AbortController global

**Lacunes** :
- JS-rendered content : fetch+cheerio ne rend pas le JS. ~35% des sites SPA non crawlés correctement.
- console.log direct dans `lib/audit/crawl.ts` lignes ~385, 405 → utiliser logger structuré.
- Pas de délai entre les batches de pages (risque rate-limiting côté cible).

**Recommandation** : pour le crawl statique, l'approche actuelle est optimale. Ajouter mode "JS rendering" optionnel via Firecrawl API pour les SPAs détectées (V1.5, pas un refactoring immédiat).
- Source : https://firecrawl.dev

---

## 4. LLM Integration — Claude content briefs

**État actuel** : @anthropic-ai/sdk avec cache_control: ephemeral sur system prompt. 3 appels en parallèle, timeout 30s, validation Zod, graceful degradation.

**Ce qui est très bien fait** :
- Prompt caching (économise ~80% tokens input pour appels répétés)
- Promise.allSettled (pas Promise.all — les 3 briefs sont indépendants)
- Graceful degradation (null si Claude fail, audit se termine quand même)

**Fixes immédiats** :

1. **maxRetries: 2** sur le client Anthropic — ajouter dans `lib/audit/briefs.ts` :
   ```ts
   const client = new Anthropic({ apiKey, maxRetries: 2 })
   ```

2. **Structured outputs via tool_use** (plus robuste que JSON.parse + stripCodeFences) :
   ```ts
   const message = await client.messages.create({
     tools: [{ name: 'generate_brief', input_schema: zodToJsonSchema(schema) }],
     tool_choice: { type: 'tool', name: 'generate_brief' },
     ...
   })
   ```
   Source : https://docs.anthropic.com/en/docs/tool-use

3. **Token cost logging** : logger `message.usage.cache_read_input_tokens`, `cache_creation_input_tokens`, `input_tokens`, `output_tokens` — monitoring coût réel par audit.

---

## 5. Testing Strategy

**État actuel** : 41 tests Vitest + 1 test E2E Playwright. Coverage thresholds différenciés.

**Ce qui manque** :

1. **MSW (Mock Service Worker)** : intercepte fetch en Node de façon transparente. Priorité haute — couvre tous les appels Anthropic, Stripe, Perplexity, Wikidata.
   - Source : https://mswjs.io/docs/getting-started

2. **Golden tests sur les phases** : audit 2 fois la même URL → même score. Détecte les régressions silencieuses de scoring.

3. **Tests d'intégration worker** : worker/index.ts exclu des thresholds. Créer un audit `queued` en DB test, lancer un tick, vérifier statut.

4. **Tests de charge légère** : autocannon ou wrk sur /api/audits avec 10 users simultanés → détecte race conditions.

---

## 6. Rate Limiting — Upstash Redis

**État actuel** : @upstash/ratelimit, sliding window, fail-closed en prod. Bien configuré.

**Points d'attention** :
- **Fail-open sur erreur Upstash** : si Upstash retourne une erreur, le code retourne `allowed: true`. Décision volontaire pour ne pas bloquer les users, mais fenêtre d'abus en cas de panne. À documenter.
- **DDoS au niveau crawl** : ajouter une limite de concurrence globale (max N audits running simultanément par org) en complément du rate limiter par user.
- **Vercel Firewall Rules** (WAF natif Pro) : absorbe le brute-force avant d'atteindre les API routes. Recommandé en complément.

---

## 7. Caching — Opportunités identifiées

1. **Cache CrUX** : données qui changent peu (28j rolling). Cacher en Upstash Redis avec TTL 24h. Divise ×10 les appels API externe dans les benchmarks.
2. **Cache Wikidata** : données stables. TTL 7 jours en Upstash.
3. **Vercel Data Cache** : pages rapport public `/r/:slug` → `cache: 'force-cache', revalidate: 3600`. Le rapport HTML ne change pas après génération.
4. **Déduplication d'audits** : proposer de réutiliser un résultat existant si même URL dans les 24h.

---

## 8. Sécurité — Lacunes résiduelles

**Ce qui est excellent** : SSRF multi-couche, DNS rebinding protection, redirect chain cap, Drizzle ORM parameterized, XSS via DOMPurify, headers HSTS/CORP/COOP.

**Lacunes à corriger** :

1. **CSP absent** : ajouter Content-Security-Policy-Report-Only dans next.config.ts. Démarrer en report-only, passer en enforced après 30j de monitoring.
   - Source : https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy

2. **TOCTOU DNS rebinding** : fenêtre théorique entre assertSafeDnsUrl et fetch. Risque faible (requiert DNS autoritaire avec TTL=0 contrôlé par l'attaquant). À documenter comme risque accepté.

3. **Zip bomb guard** : vérifier que le ratio 100:1 est vérifié en streaming (pas après extraction complète en mémoire).

4. **Audit logging admin** : aucun audit trail des actions admin (create org, delete audit). Nécessaire en V2 pour support + conformité.

---

## 9. Observabilité

**État actuel** : Sentry (Next.js) + logger JSON structuré + automaticVercelMonitors.

**Ce qui manque** :

1. **Sentry sur le worker** : ajouter `Sentry.setTag('audit_id', auditId)` dans worker/index.ts + configurer SENTRY_DSN dans l'env worker.

2. **Métriques métier** : logger `audit.duration_ms` par phase, `audit.score_total`, `pdf.render_duration_ms`, `claude.tokens_used`, `claude.cache_hit_rate`.

3. **Worker health endpoint** : simple HTTP server sur WORKER_PORT répondant 200 OK à GET /health. Permet le health check des orchestrateurs.

4. **Phase duration logging** : ajouter `phase_durations: { technical: 120ms, geo: 450ms, ... }` dans le log `worker.audit.processed` — identifie les phases lentes.

---

## 10. Architecture — Monorepo

**État actuel** : monorepo flat — Next.js + worker dans le même repo, worker importe via @/* alias.

**Recommandation** : rester en monorepo flat jusqu'à ce qu'un deuxième package distinct émerge (CLI d'audit standalone, package npm public). Turborepo ne devient pertinent qu'à ce moment — ne pas migrer prématurément (coût 3-5 jours).

---

## Priorités par impact/effort

| # | Action | Impact | Effort | Sprint |
|---|--------|--------|--------|--------|
| 1 | CSP report-only | Sécurité + EAA | 2h | Sprint 3 |
| 2 | Structured outputs tool_use Claude | Robustesse | 3h | Sprint 3 |
| 3 | maxRetries: 2 Anthropic | Résilience | 30 min | Sprint 3 |
| 4 | Token cost logging Anthropic | Cost tracking | 1h | Sprint 3 |
| 5 | MSW pour tests API externes | Tests | 4h | Sprint 4 |
| 6 | Cache CrUX + Wikidata Upstash | Perf + coût | 3h | Sprint 4 |
| 7 | Rate limit global audits running/org | Sécurité | 2h | Sprint 4 |
| 8 | Sentry sur worker | Observabilité | 1h | Sprint 3 |
| 9 | console.log → logger.info crawl.ts | Uniformité | 20 min | Sprint 3 |
| 10 | waitUntil: 'load' PDF | Perf PDF | 10 min | Sprint 3 |

---

## Sources

- Inngest docs : https://www.inngest.com/docs/quick-start
- Anthropic tool use : https://docs.anthropic.com/en/docs/tool-use
- Anthropic prompt caching : https://docs.anthropic.com/en/docs/prompt-caching
- Upstash Ratelimit : https://upstash.com/docs/redis/sdks/ratelimit/overview
- Vercel Data Cache : https://nextjs.org/docs/app/building-your-application/caching
- Next.js CSP : https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy
- MSW : https://mswjs.io/docs/getting-started
- Browserless PDF : https://www.browserless.io/docs/pdf
- Sentry Node : https://docs.sentry.io/platforms/node/
- Firecrawl : https://firecrawl.dev
