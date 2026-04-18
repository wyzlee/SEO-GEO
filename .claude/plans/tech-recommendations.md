# Recommandations techniques SEO-GEO — 2025/2026

> Document interne — architecte technique senior.
> Basé sur l'analyse du codebase + recherches documentaires avril 2026.
> Sources tracées en fin de document.

---

## Contexte et tension architecturale critique

**Problème identifié avant toute recommandation** : le fichier `worker/index.ts` implémente un process Node long-running avec poll Postgres en boucle. Ce pattern fonctionne sur un VPS Docker, mais **ne peut pas tourner sur Vercel** — une Serverless Function s'arrête après réponse, elle ne peut pas boucler indéfiniment. Les commits récents (migration Neon production sur Vercel) indiquent que l'infrastructure a basculé sur Vercel mais le worker ne tourne nulle part en production. **Confirmation** : `app/api/audits/route.ts` utilise bien `after()` de `next/server` pour lancer `processAudit()` en fire-and-forget — sans retry, sans persistance d'état, sans observabilité sur les échecs.

La section 1 ci-dessous est donc un **blocker V1**, pas une amélioration optionnelle.

---

## 1. Queue de jobs async

### Problème actuel

`after()` / `waitUntil()` : pas de retry, timeout contraint par la durée max de la Vercel Function (60s sur Hobby, 800s sur Pro), pas de visibilité sur les échecs. Un audit qui dure >60s (ce qui est possible avec les 11 phases + crawl) est silencieusement annulé.

### Alternatives comparées

| Solution | Modèle | Timeout | Observabilité | Prix free tier | Complexité intégration |
|---|---|---|---|---|---|
| **Vercel Workflow / WDK** | Durable execution, directives `"use workflow"` / `"use step"`, GA avril 2026 | Illimité | Native Vercel Dashboard | Inclus plan Pro | Faible (TS natif, zéro infra) |
| **Inngest** | Functions dans votre Vercel env, event-driven | Selon plan (60s → illimité) | Dashboard Inngest + traces | 50 000 runs/mois gratuits | Faible (1 import, SDK TypeScript) |
| **Trigger.dev v3** | Exécution sur infra Trigger.dev (pas Vercel) | Illimité | Dashboard dédié, logs temps réel en local | 1 000 runs/mois | Moyenne (tunnel local requis) |
| **BullMQ + Redis** | Queue Redis auto-hébergée | Illimité | Bull Board | Self-hosted | Élevée (Redis à gérer) |
| **Postgres polling (actuel)** | Poll SELECT + UPDATE conditionnel | Limité par Function timeout | Aucune | Déjà en place | Nulle |

### Décision recommandée : **Vercel Workflow (WDK)**

Raisons :
1. **Natif Vercel** — le projet est Vercel-first, zéro infra supplémentaire à gérer.
2. **GA et stable** — sorti de beta le 16 avril 2026, 100M+ runs processés, 200K+ téléchargements npm/semaine, 75+ releases en beta.
3. **Modèle de code minimal** — migration `processAudit()` existante : wrapper dans `"use workflow"`, chaque phase devient un `"use step"`.
4. **Durabilité réelle** — survit aux crashes, déploiements, redémarrages. État stocké dans un event log persistant.
5. **Observabilité** — visible nativement dans le dashboard Vercel.

**Fallback si WDK trop limitant pour cas complexes** : Inngest (50K runs/mois gratuits, DX excellente, intégration 1 import).

### Migration estimée

Effort : **M** (3-5 jours).

```ts
// Avant (processAudit lancé en after())
after(async () => {
  await processAudit(audit)
})

// Après (Vercel Workflow)
"use workflow"
async function auditWorkflow(auditId: string) {
  "use step"
  await markAuditRunning(auditId)
  for (const phase of PHASES) {
    "use step"
    await runPhase(phase, auditId)
  }
  "use step"
  await markAuditCompleted(auditId)
}
```

---

## 2. Génération PDF (Puppeteer + @sparticuz/chromium)

### État actuel

Stack en place : `puppeteer-core@^24.41.0` + `@sparticuz/chromium@^147.0.1`. Conforme Vercel (bundle <250 MB avec `chromium-min`). Limite réelle : **mémoire 2048 MB max**, **timeout 800s sur Pro** (60s Hobby). CPU "Performance" requis pour ne pas dépasser 60s.

### Problème signalé : recharts non rendu

**Diagnostic** : Puppeteer lance un vrai Chromium — recharts *doit* se rendre. Si les graphiques sont vides, c'est un **problème de timing**, pas une limitation stack. Le fix est :

```ts
await page.goto(url, { waitUntil: 'networkidle0' })
// OU attendre le sélecteur du chart explicitement
await page.waitForSelector('.recharts-wrapper', { timeout: 10_000 })
await page.pdf({ format: 'A4', printBackground: true })
```

Ne pas changer de stack pour ce problème — il suffit du bon `waitUntil`.

### Alternatives comparées

| Solution | Rendu JS | Mémoire | Latence | Complexité ops | Coût |
|---|---|---|---|---|---|
| **Puppeteer + sparticuz (actuel)** | Oui (vrai Chromium) | 500 MB–1,5 GB | 5-30s | Faible (serverless) | Vercel Pro seul |
| **Gotenberg** | Oui (Chromium + LibreOffice) | 1024 MB min | 2-10s | Élevée (Docker sidecar) | VPS ~5-15 €/mois |
| **html-pdf-node / jsPDF** | Non | Faible | <1s | Faible | Gratuit |
| **Microservice Cloud Run** | Oui (Puppeteer) | 512 MB–2 GB | 3-15s | Moyenne | Pay-per-use |

### Décision recommandée : **Garder Puppeteer + sparticuz, corriger le waitFor**

Justification : la stack actuelle est correcte et bien documentée. La migration vers Gotenberg n'apporte de valeur que si le volume PDF explose (>500/jour) ou si des conversions LibreOffice sont nécessaires (hors scope V1).

**Évolution future (V2)** : si génération PDF devient un bottleneck mesurable, extraire en microservice Gotenberg sur Cloud Run.

### Actions immédiates

1. Ajouter `waitUntil: 'networkidle0'` ou `waitForSelector` ciblé sur les conteneurs recharts.
2. Passer la Vercel Function de génération PDF en CPU "Performance" (`maxDuration: 60`, memory `3008`).
3. Ajouter un timeout explicite avec message d'erreur si Chromium dépasse 45s.

Effort : **S** (0,5 jour pour le fix waitFor + config).

---

## 3. Crawl & Performance

### État actuel

`cheerio` + `fetch` natif : parsing HTML statique, max 20 sous-pages, concurrency 4. Pas de rendu JS.

### Limites identifiées

- **Pas de rendu JavaScript** : SPAs (React, Vue, Nuxt client-only) retournent du HTML vide.
- **Pas de rate limiting distribué** : chaque instance Vercel a son propre état mémoire.
- **Pas de cache crawl** : chaque audit re-fetche toutes les pages.

### Alternatives crawl comparées

| Solution | Rendu JS | Mémoire | Vitesse | Serverless-friendly | Complexité |
|---|---|---|---|---|---|
| **Cheerio + fetch (actuel)** | Non | ~20 MB | Très rapide | Oui | Faible |
| **Playwright (serverless)** | Oui | 150-300 MB/instance | Lent | Difficile (binaire 300 MB) | Élevée |
| **Puppeteer + sparticuz** | Oui | 500 MB–1,5 GB | Lent | Oui (déjà utilisé pour PDF) | Moyenne |
| **Crawlee (CheerioCrawler + PlaywrightCrawler)** | Hybride | Variable | Variable | Partiel | Moyenne |

### Décision recommandée : **Garder Cheerio + fetch, ajouter détection SPA**

- Pour les sites détectés comme SPA (absence de contenu SSR, meta tags réactifs), utiliser **Puppeteer déjà présent** (réutiliser `@sparticuz/chromium`) pour un crawl ciblé de la homepage uniquement.
- Pas besoin de Playwright — Puppeteer est déjà dans le bundle.

### Cache crawl

**Recommandation** : cache des snapshots HTML bruts dans Neon (`crawl_cache` table) avec TTL de **24h**. Pour le mode `quick`, vérifier d'abord si un crawl <24h existe pour l'URL.

```sql
-- Index pour lookup rapide
CREATE INDEX crawl_cache_url_fetched_idx ON crawl_cache (url, fetched_at DESC);
```

### Rate limiting distribué

Actuel (in-memory) : acceptable en low-traffic single-instance. Problème dès que Fluid Compute scale sur plusieurs instances en parallèle ou multi-région.

**Recommandation** : **Upstash Redis** (HTTP-based, <10ms latence, tier gratuit 10K req/jour) via `@upstash/ratelimit`. Migration de l'in-memory vers Upstash : remplacement 1-pour-1 du store, pas de refactoring API.

Seuil de migration : dès que `POST /api/audits` dépasse **100 req/min** ou que le projet tourne sur plus d'une région Vercel.

Effort crawl SPA : **S** (1 jour).
Effort cache crawl : **M** (2 jours — schema + migration + intégration).
Effort rate limiting Upstash : **S** (0,5 jour, drop-in replacement).

---

## 4. Intégration LLM (Phase synthesis)

### Modèle recommandé : Claude Haiku 4.5

Prix : `$1.00/MTok input` — `$5.00/MTok output` (claude-haiku-4-5-20251001).
Note : Claude 3 Haiku retire le 19 avril 2026 — migration obligatoire vers Haiku 4.5.

### Estimation de coût par audit (synthesis phase)

La phase synthesis reçoit en input :
- System prompt (instructions + format JSON) : ~2 000 tokens (cacheable)
- Findings structurés (30-80 findings selon score) : ~6 000–12 000 tokens
- Scoring breakdown + metadata : ~500 tokens

**Input total** : ~8 500–14 500 tokens
**Output** : résumé exécutif + top 5 priorités + quick wins : ~2 000–4 000 tokens

Calcul de coût (Haiku 4.5 : $1,00/MTok input, $5,00/MTok output) :

| Scénario | Input total | Output | Coût sans cache | Coût avec cache system prompt (2K tok) |
|---|---|---|---|---|
| Audit léger (30 findings) | 8 500 tok | 2 000 tok | **$0,019** | **$0,017** (~10% éco) |
| Audit standard (60 findings) | 11 000 tok | 3 000 tok | **$0,026** | **$0,023** (~10% éco) |
| Audit dense (80 findings) | 14 500 tok | 4 000 tok | **$0,034** | **$0,030** (~10% éco) |

Détail calcul "audit standard sans cache" : 11 000 × $0,000001 + 3 000 × $0,000005 = $0,011 + $0,015 = **$0,026**.
Avec cache : system prompt (2 000 tok) facturé à 10% → $0,0002 au lieu de $0,002 ; économie ~$0,002 par audit.

**Nuance importante** : le prompt caching Anthropic cache le *system prompt statique uniquement*. L'output (majoritaire dans le coût total) n'est pas cacheable. L'économie réelle est de **~8-12% par audit isolé**.

L'intérêt devient plus marqué si on étend la portion cachée : inclure les findings *communs à plusieurs audits d'une même org* (ex. règles de scoring, base de connaissance SEO) peut monter la portion cachée à 40-60% de l'input total → économie ~20-30% dans ce cas.

TTL cache : 5 minutes. Pour des audits lancés en batch (ex. 10 audits successifs), le cache est quasi-systématiquement chaud.

**Coût V1 agence** (estimé 20-50 audits/mois) : **< 2 €/mois** avec caching. Quasi-négligeable.

### Streaming SSE vers l'UI (Next.js App Router)

```ts
// app/api/audits/[id]/synthesis/route.ts
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()
  const encoder = new TextEncoder()

  // Lancer le streaming Anthropic en parallèle
  ;(async () => {
    const response = anthropic.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: [{ type: 'text', text: SYNTHESIS_SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' } }],  // prompt caching
      messages: [{ role: 'user', content: buildUserPrompt(findings) }],
    })
    for await (const chunk of response) {
      if (chunk.type === 'content_block_delta') {
        await writer.write(encoder.encode(`data: ${JSON.stringify({ delta: chunk.delta.text })}\n\n`))
      }
    }
    await writer.write(encoder.encode('data: [DONE]\n\n'))
    await writer.close()
  })()

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
```

**Client** : `useEffect` + `EventSource` ou `fetch` + `ReadableStream` reader dans un hook Zustand.

### Décision recommandée

- Modèle : **Claude Haiku 4.5** (rapport qualité/prix optimal pour synthèse SEO, contexte 200K).
- Caching : activer `cache_control: ephemeral` sur le system prompt dès la première itération.
- Streaming : SSE natif Next.js App Router (pas de lib externe).
- Fallback : si coût ou latence problématique → `gpt-4o-mini` à $0.15/$0.60 par MTok (40% moins cher input, mais moins pertinent sur jargon SEO français).

Effort : **M** (3 jours — intégration SDK, prompt engineering, streaming UI, tests).

---

## 5. Observabilité & Monitoring

### Besoins spécifiques audit SaaS

1. **Error tracking** : phases d'audit en erreur silencieuse, timeout Chromium, crawl failures.
2. **Structured logging** : audit_id, org_id, phase, durée, score — pour analytics business.
3. **Métriques business** : audits/jour, durée moyenne par phase, taux d'échec par phase.
4. **Performance** : durées p50/p95 des routes API.

### Alternatives comparées

| Solution | Error tracking | Structured logs | Vercel natif | Prix | Effort intégration |
|---|---|---|---|---|---|
| **Sentry** | Excellent (traces, replay) | Via log drains | Oui (marketplace) | Gratuit jusqu'à 5K errors/mois | S |
| **Axiom + next-axiom** | Basique | Excellent (full-stack logs) | Oui (intégration Vercel) | Gratuit 500 GB/mois | S |
| **Vercel Error Tracking** | Basique | Non | Natif | Inclus Pro | Nul |
| **Baselime** | Bon | Bon | Oui | Gratuit jusqu'à 100M events | S |
| **Datadog** | Excellent | Excellent | Via log drain | Élevé ($31+/host) | M |

### Décision recommandée : **Sentry (errors) + Axiom (logs)**

- **Sentry** : wizard Next.js (1 commande), source maps automatiques, traces distribuées, replay des erreurs UI. Tier gratuit suffisant pour V1 (5K errors/mois, 10K transactions).
- **Axiom** : `@axiomhq/nextjs` + Vercel Log Drain. Capture automatique de toutes les fonctions serverless. Dashboard pré-construit Vercel. Tier gratuit généreux (500 GB/mois indexés).

**Métriques business à instrumenter** :
```ts
// Dans persist.ts — markAuditCompleted
axiom.ingest('seo-geo.audits', [{
  audit_id: auditId,
  org_id: orgId,
  duration_ms: Date.now() - startedAt,
  score_total: score,
  phase_breakdown: breakdown,
  phase_durations: phaseDurations,  // Map<PhaseKey, ms>
  phase_failures: phaseFailures,    // PhaseKey[] | []
  input_type: audit.inputType,
  timestamp: new Date().toISOString(),
}])
```

Effort : **S** (1 jour — Sentry wizard + Axiom Log Drain + 3-4 events business).

---

## 6. Performance Base de Données

### Analyse des index actuels

Index présents dans `schema.ts` :
- `audits_org_status_idx` : `(organization_id, status)` — bien pour le poll worker.
- `audit_phases_audit_idx` : `(audit_id)` — bien pour chargement rapport.
- `findings_audit_idx` : `(audit_id)` — bien.
- `findings_severity_idx` : `(audit_id, severity)` — bien pour filtres UI.
- `reports_audit_idx` : `(audit_id)` — bien.

### Index manquants identifiés

```sql
-- Worker poll : ORDER BY queued_at (actuel) sans index sur queued_at + status
-- L'index org_status_idx ne couvre pas l'ORDER BY → sequential scan sur colonnes non indexées
CREATE INDEX audits_status_queued_at_idx ON audits (status, queued_at ASC)
  WHERE status = 'queued';  -- partial index, très sélectif

-- Findings par phase (pour chargement rapport par section)
CREATE INDEX findings_audit_phase_idx ON findings (audit_id, phase_key);

-- Audits par org + date (dashboard liste)
CREATE INDEX audits_org_created_idx ON audits (organization_id, created_at DESC);
```

### HTTP driver Neon — connexion pooling

L'HTTP driver `@neondatabase/serverless` est correct pour Vercel serverless (pas de TCP, pas de PgBouncer requis). Latence typique : **5-15ms par requête** vers Neon Frankfurt depuis Vercel Frankfurt (même région — toujours choisir la même région Neon que le déploiement Vercel).

**Pas de PgBouncer nécessaire** avec le HTTP driver — il gère les connexions stateless par design.

### Archivage et scalabilité

À partir de **>50 000 findings** dans la table, envisager :

1. **Archivage findings** : après 1 an (ou à la demande du droit à l'oubli), déplacer vers table `findings_archive` avec `pg_partman` ou cold storage S3.
2. **Partition `audits`** : pertinent à partir de >500K audits (non-bloquant pour V1/V2). Partitionner par `organization_id` ou `created_at` (range mensuel).
3. **`content_html` dans `reports`** : champ potentiellement large (50-200 KB). Candidat pour externalisation vers Vercel Blob Storage à partir de V2.

Effort index manquants : **S** (0,5 jour — migration Drizzle, appliquer sur prod via Neon branching).
Effort archivage : **M** (hors scope V1, prévoir V2).

---

## 7. Sécurité

### SSRF guard — état actuel

La doc `security.md` décrit un `parseUrl` + blocage IPs privées mais sans vérification DNS-based (une IP publique peut rediriger vers une IP privée après résolution). Le crawl actuel dans `crawl.ts` utilise `fetch` natif sans blocage RFC-1918 explicite dans le code source.

### SSRF — gaps à combler

```ts
// lib/security/ssrf.ts — à créer ou compléter
import { isPrivateIP } from './ip-utils'
import dns from 'node:dns/promises'

export async function assertSafeUrl(rawUrl: string): Promise<URL> {
  const url = new URL(rawUrl)                           // throws si invalide
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Protocol non autorisé')
  }

  // Blocage par hostname
  const BLOCKED_HOSTS = ['localhost', '0.0.0.0', '[::]', '::1']
  if (BLOCKED_HOSTS.includes(url.hostname)) throw new Error('Host bloqué')

  // Résolution DNS + check IP RFC-1918
  try {
    const { address } = await dns.lookup(url.hostname, { family: 4 })
    if (isPrivateIP(address)) throw new Error(`IP privée détectée : ${address}`)
  } catch (e) {
    if (e instanceof Error && e.message.includes('IP privée')) throw e
    // DNS failure = rejeter aussi
    throw new Error('Résolution DNS échouée')
  }

  return url
}
```

**Note CVE** : CVE-2025-57822 (Next.js Middleware SSRF via headers passés à `NextResponse.next()`) — vérifier que la version Next.js utilisée est ≥ 16.1.6 (patch inclus). ✅ Stack actuelle conforme.

### Upload zip — guards existants vs manquants

Documentés dans `security.md` (zip bomb, path traversal, extension whitelist) et confirmés dans le code (`adm-zip` présent). **Vérifier que ces guards sont bien implémentés dans `lib/audit/upload/`** — la spec documentaire ne garantit pas l'implémentation.

Gap : pas de scan antivirus (acceptable V1 agence, ajouter ClamAV V2 si upload public).

### CSP headers — état actuel

Headers actuels dans `next.config.ts` : `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `HSTS`, `Permissions-Policy`. **CSP manquante** (commentée "à définir progressivement, commencer report-only").

**Recommandation immédiate** : activer CSP en `Content-Security-Policy-Report-Only` avec Sentry comme `report-uri`. Permet de collecter les violations sans bloquer.

```ts
{ key: 'Content-Security-Policy-Report-Only',
  value: "default-src 'self'; script-src 'self' 'unsafe-inline'; report-uri /api/csp-report" }
```

Passer en mode enforcing après 2 semaines sans violation légitime.

Effort SSRF guard DNS : **S** (0,5 jour).
Effort CSP report-only : **S** (0,5 jour).
Effort rate limiting Upstash : voir section 3.

---

## 8. Stratégie de Tests

### État actuel

62/62 tests Vitest passants. Couverture actuelle : non mesurée explicitement.

### Pyramide recommandée pour ce projet

```
         /\
        /E2E\          Playwright — 5-10 scénarios critiques
       /------\
      / Intégr \       Vitest + MSW — phases audit mocked crawl
     /----------\
    / Unitaires  \     Vitest — scoring rubric, parsers, helpers
   /--------------\
```

### Tests unitaires (Vitest) — cibles prioritaires

- **Scoring rubric** : chaque phase avec inputs fixes → score attendu. Essentiel pour non-régression.
- **Parsers crawl** : `extractStructuredData`, `extractHreflang`, `extractOpenGraph` avec HTML fixtures.
- **Helpers sécurité** : `assertSafeUrl`, zip guards, rate limiter.
- **Zod schemas** : validation inputs API (cas valid + cas reject).

Cible couverture unitaire : **80%** sur `lib/audit/phases/` et `lib/security/`.

### Tests d'intégration (Vitest + MSW)

Mock le crawl avec HTML fixtures statiques (sites exemples représentatifs : SPA vide, site statique bien optimisé, site avec erreurs connues). Valider que `runAudit()` end-to-end produit les findings attendus.

```ts
// tests/integration/audit-engine.test.ts
it('site SPA vide — score technique < 5/12', async () => {
  server.use(http.get('https://example.com', () => HttpResponse.html(SPA_EMPTY_HTML)))
  const result = await runPhase('technical', mockInput, mockAudit)
  expect(result.score).toBeLessThan(5)
  expect(result.findings.some(f => f.category === 'no-ssr')).toBe(true)
})
```

**Ne pas lancer de vrais crawls en CI** — trop lents, dépendants du réseau, résultats variables.

### Tests E2E (Playwright) — scénarios critiques uniquement

5-10 scénarios maximum sur l'app déployée (staging) :
1. Login Stack Auth → dashboard → lancer audit → voir status "running".
2. Audit complété → rapport HTML visible → export PDF fonctionnel.
3. Lien de partage `/r/:slug` accessible sans auth.
4. Rate limit `POST /api/audits` : après 10 appels → 429.
5. Rapport share expiré → 404.

Playwright se connecte à une Neon branch de staging (pas la prod).

### Coverage cible globale

| Périmètre | Cible | Outil |
|---|---|---|
| `lib/audit/phases/` | 80% | Vitest |
| `lib/security/` | 90% | Vitest |
| `lib/db/` (queries) | 60% (mocked) | Vitest |
| Scénarios critiques UI | 5-10 tests | Playwright |
| Routes API | 70% | Vitest + supertest-style |

**Ne pas viser 100%** — coverage sur code trivial (getters, types) est du bruit. Concentrer l'effort sur le scoring, les guards de sécurité, et les parsers.

Effort Playwright setup + 5 scénarios : **M** (2-3 jours).
Effort tests d'intégration audit phases : **M** (3-4 jours — creation fixtures HTML).

---

## Récapitulatif décisions et efforts

| Section | Décision | Priorité | Effort |
|---|---|---|---|
| **1. Queue async** | Vercel Workflow / WDK | 🔴 Blocker V1 | M (3-5 j) |
| **2. PDF génération** | Garder Puppeteer, corriger waitFor | 🔴 Blocker (charts) | S (0,5 j) |
| **3. Crawl** | Cheerio + Puppeteer fallback SPA + cache 24h | 🟡 V1 sprint actuel | M (3,5 j total) |
| **3b. Rate limiting** | Upstash dès >100 req/min ou multi-région | 🟢 V2 | S (0,5 j) |
| **4. LLM synthesis** | Claude Haiku 4.5 + prompt caching + SSE | 🟡 Phase 11 V1 | M (3 j) |
| **5. Observabilité** | Sentry + Axiom | 🟡 Avant premier client | S (1 j) |
| **6. DB indexes** | 3 index partiels manquants | 🟡 Performance | S (0,5 j) |
| **7. Sécurité** | SSRF DNS check + CSP report-only | 🟡 Avant premier client | S (1 j) |
| **8. Tests** | Playwright E2E + fixtures intégration | 🟢 V1 bon niveau | M (5-7 j) |

**Total effort estimé V1 "propre"** : ~20-25 jours-homme, en parallèle avec le développement des phases d'audit restantes.

---

## Sources

- [Vercel Workflow / WDK — public beta](https://vercel.com/changelog/open-source-workflow-dev-kit-is-now-in-public-beta)
- [Vercel Fluid Compute + after()](https://vercel.com/docs/fluid-compute)
- [Inngest pricing 2026](https://www.inngest.com/pricing)
- [Inngest vs Trigger.dev — HashBuilds](https://www.hashbuilds.com/articles/next-js-background-jobs-inngest-vs-trigger-dev-vs-vercel-cron)
- [Trigger.dev vs Inngest vs Temporal 2026](https://trybuildpilot.com/610-trigger-dev-vs-inngest-vs-temporal-2026)
- [Puppeteer + sparticuz sur Vercel — KB officielle](https://vercel.com/kb/guide/deploying-puppeteer-with-nextjs-on-vercel)
- [Gotenberg PDF microservice](https://gotenberg.dev/)
- [Cheerio vs Puppeteer 2026 — Proxyway](https://proxyway.com/guides/cheerio-vs-puppeteer-for-web-scraping)
- [Claude Haiku 4.5 pricing — platform.claude.com](https://platform.claude.com/docs/en/about-claude/pricing)
- [Anthropic prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- [SSE streaming LLM Next.js — Upstash](https://upstash.com/blog/sse-streaming-llm-responses)
- [Axiom + Vercel observabilité](https://axiom.co/blog/advanced-vercel-o11y)
- [next-axiom GitHub](https://github.com/axiomhq/next-axiom)
- [Sentry Next.js](https://sentry.io/for/nextjs/)
- [Neon HTTP driver — choosing connection method](https://neon.com/docs/connect/choose-connection)
- [Neon connection pooling](https://neon.com/docs/connect/connection-pooling)
- [SSRF protection Next.js 2025 — TurboStarter](https://www.turbostarter.dev/blog/complete-nextjs-security-guide-2025-authentication-api-protection-and-best-practices)
- [CVE-2025-57822 Next.js SSRF](https://security.snyk.io/vuln/SNYK-JS-NEXT-12299318)
- [Upstash ratelimit serverless](https://github.com/upstash/ratelimit-js)
- [Vitest vs Playwright 2026 — PkgPulse](https://www.pkgpulse.com/blog/testing-libraries-compared)
