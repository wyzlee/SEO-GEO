---
name: performance-optimization
description: Techniques de performance spécifiques au projet SEO-GEO — DB index, PDF Puppeteer timing, worker async, LLM prompt caching, crawl optimisation. Basé sur tech-recommendations.md.
type: skill
---

# Skill : performance-optimization

## Base de données — Index manquants critiques (S1.9)

### 3 index à créer immédiatement

```sql
-- Worker poll : ORDER BY queued_at sans index → sequential scan
CREATE INDEX audits_status_queued_at_idx ON audits (status, queued_at ASC)
  WHERE status = 'queued';  -- partial index, très sélectif

-- Chargement rapport par section phase
CREATE INDEX findings_audit_phase_idx ON findings (audit_id, phase_key);

-- Dashboard liste par org (hot path)
CREATE INDEX audits_org_created_idx ON audits (organization_id, created_at DESC);
```

**Impact** : requêtes worker + dashboard + rapport x2-3 plus rapides.

**Workflow** : via `/db-migrate` → `drizzle-kit generate` → review SQL → apply Neon dev branch → merge prod.

## PDF Puppeteer — Fix timing recharts (S1.7)

### Problème actuel
Charts recharts absents du PDF. Root cause : Puppeteer prend le screenshot avant que React ait rendu les SVG recharts.

### Fix dans `app/r/[slug]/pdf/route.ts`
```ts
await page.goto(reportUrl, { waitUntil: 'networkidle0' })
// Attendre le sélecteur explicitement
await page.waitForSelector('[data-chart-ready]', { timeout: 10_000 })
await page.pdf({ format: 'A4', printBackground: true })
```

### Attribut côté composant recharts
```tsx
// components/audit/radar-chart.tsx
<div ref={(el) => {
  if (el) el.setAttribute('data-chart-ready', 'true')
}}>
  <RadarChart ... />
</div>
```

### Config Vercel Function PDF
```ts
// app/r/[slug]/pdf/route.ts
export const maxDuration = 60      // secondes
export const memory = 3008         // MB — CPU Performance requis
```

## LLM Synthesis — Prompt Caching Anthropic (S2.4)

### Coût par audit avec caching
- Audit standard (60 findings) : **$0.023** (~$2/mois pour 50 audits agence)
- Économie prompt caching : ~10% sur system prompt statique (2000 tokens)
- TTL cache : 5 minutes — batches d'audits = cache quasi systématiquement chaud

### Pattern caching (OBLIGATOIRE pour synthesis)
```ts
anthropic.messages.create({
  model: 'claude-haiku-4-5-20251001',
  max_tokens: 4096,
  system: [{
    type: 'text',
    text: SYNTHESIS_SYSTEM_PROMPT,
    cache_control: { type: 'ephemeral' }  // ← prompt caching
  }],
  messages: [{ role: 'user', content: buildUserPrompt(findings) }]
})
```

## Worker Async — Vercel after() vs WDK

### Situation actuelle
`after()` dans `app/api/audits/route.ts` : fire-and-forget, pas de retry, timeout 60s Hobby / 800s Pro.

### Risque
Audit de 11 phases (full mode, 20 pages) peut dépasser 60s → silencieusement annulé.

### Migration recommandée (S2.5) : Vercel Workflow WDK
```ts
"use workflow"
async function auditWorkflow(auditId: string) {
  "use step"
  await markAuditRunning(auditId)
  for (const phase of PHASE_ORDER) {
    "use step"
    await runPhase(phase, auditId)
  }
  "use step"
  await markAuditCompleted(auditId)
}
```
Avantage : durable, retry natif, observabilité dashboard Vercel.

## Crawl SEO — Optimisations

### cheerio + fetch (actuel — correct pour V1)
- Parsing HTML statique : ~20ms par page
- Max 20 sous-pages en mode full
- Concurrency 4 pages simultanées

### Détection SPA (amélioration V1.5)
Si la homepage retourne `<div id="root"></div>` sans contenu SSR → fallback Puppeteer pour la homepage uniquement (Puppeteer déjà dans le bundle pour PDF).

### Cache crawl 24h (à planifier S2)
```sql
CREATE TABLE crawl_cache (
  url text NOT NULL,
  html text NOT NULL,
  fetched_at timestamp NOT NULL,
  PRIMARY KEY (url)
);
CREATE INDEX crawl_cache_url_fetched_idx ON crawl_cache (url, fetched_at DESC);
```
Mode flash : vérifier crawl <24h avant de re-fetcher.

## Neon HTTP Driver — Performance réseau

- Latence : 5-15ms vers Neon Frankfurt depuis Vercel Frankfurt (même région)
- Pas de PgBouncer nécessaire (HTTP driver stateless by design)
- **Toujours choisir la même région Neon que le déploiement Vercel**

## React Query — Polling audit status

```ts
// lib/hooks/use-audit.ts
useQuery({
  queryKey: ['audit', auditId],
  queryFn: () => fetchAudit(auditId),
  refetchInterval: (query) =>
    query.state.data?.status === 'running' ? 2000 : false,
  // Arrêt automatique du polling quand completed/failed
})
```

## Bundle Next.js

- Server Components par défaut → bundle JS client minimal
- `lucide-react` override dans `package.json` (versions conflictuelles = bundle bloat)
- `@sparticuz/chromium-min` (pas le full) → bundle PDF <250 MB
- Surveiller `next build` output pour chunks >500KB
