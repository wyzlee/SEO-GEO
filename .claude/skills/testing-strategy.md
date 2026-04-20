---
name: testing-strategy
description: Stratégie de tests SEO-GEO — pyramide Vitest/RTL/Playwright, fixtures crawl, tests régression rapport, coverage cibles, patterns anti-regression scoring.
type: skill
---

# Skill : testing-strategy

## État actuel

- **62/62 tests Vitest passing** — `npm run test`
- **41 fichiers** de tests (Vitest) + 1 test E2E Playwright
- 0 erreurs TypeScript, 0 erreurs lint
- Coverage thresholds différenciés : 85% security, 80% phases
- MSW **absent** — priorité Sprint 4 (S4.6) : mocks API Anthropic/Stripe/Perplexity fragiles sans MSW

## Pyramide de tests recommandée

```
         /\
        /E2E\          Playwright — 5-10 scénarios critiques (à créer S1)
       /------\
      / Intégr \       Vitest + MSW — phases audit avec HTML fixtures
     /----------\
    / Unitaires  \     Vitest — scoring rubric, parsers, helpers (existants)
   /--------------\
```

## Tests unitaires (Vitest) — ce qui existe

```
tests/
├── lib/
│   ├── audit/phases/     → tests scoring par phase
│   ├── security/         → tests SSRF, rate limit
│   └── report/           → tests génération rapport
```

## Tests de régression qualité rapport (S1.6 — PRIORITAIRE)

Créer `tests/lib/report-quality.test.ts` :

```ts
describe('rapport quality gates', () => {
  test('dédup sémantique — pas de doublon phaseKey+normalizedSubject+severity', () => {
    const findings = buildDuplicateFindings()
    const deduped = deduplicateFindings(findings)
    expect(deduped.length).toBeLessThan(findings.length)
    // Chaque combinaison (phaseKey, normalizedSubject, severity) unique
    const keys = deduped.map(f => `${f.phaseKey}|${normalize(f.title)}|${f.severity}`)
    expect(new Set(keys).size).toBe(keys.length)
  })

  test('titres zero-value — finding réel affiché, pas placeholder', () => {
    const report = generateReport(mockFindings)
    const titles = extractFindingTitles(report)
    titles.forEach(t => {
      expect(t).not.toMatch(/TODO|placeholder|exemple|untitled/i)
      expect(t.length).toBeGreaterThan(5)
    })
  })

  test('sections conditionnelles — guard items.length > seuil', () => {
    const emptyReport = generateReport([])
    expect(emptyReport).not.toContain('## Problèmes détectés')
    const fullReport = generateReport(mockFindings)
    expect(fullReport).toContain('## Problèmes détectés')
  })

  test('sprints vides → message positif contextualisé', () => {
    const perfectSiteReport = generateReport(onlyInfoFindings)
    expect(perfectSiteReport).toContain('Aucun problème critique détecté')
    expect(perfectSiteReport).not.toContain('Sprint 1\n\n---\n\nSprint 2')
  })

  test('casse noms propres — Google, IA, ChatGPT, Claude', () => {
    const report = generateReport(mockFindings)
    expect(report).not.toMatch(/\bgoogle\b/)     // doit être Google
    expect(report).not.toMatch(/\bchatgpt\b/i.source.replace('i', ''))
    expect(report).toMatch(/\bGoogle\b/)
    expect(report).toMatch(/\bChatGPT\b/)
    expect(report).toMatch(/\bClaude\b/)
  })
})
```

## Tests d'intégration audit phases (Vitest + MSW)

```ts
// tests/integration/audit-engine.test.ts
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

const server = setupServer()

it('site SPA vide — score technique < 5/12', async () => {
  server.use(
    http.get('https://example.com', () => HttpResponse.html(SPA_EMPTY_HTML))
  )
  const result = await runPhase('technical', mockInput, mockAudit)
  expect(result.score).toBeLessThan(5)
})

it('site bien optimisé — score GEO ≥ 14/18', async () => {
  server.use(
    http.get('https://well-optimized.com', () => HttpResponse.html(GOOD_SEO_HTML))
  )
  const result = await runPhase('geo', mockInput, mockAudit)
  expect(result.score).toBeGreaterThanOrEqual(14)
})
```

**HTML fixtures** dans `tests/fixtures/` :
- `spa-empty.html` — SPA React vide (CSR only)
- `well-optimized.html` — site avec tout bien configuré
- `missing-meta.html` — title/description manquants
- `good-llms-txt.html` + `robots.txt` — GEO OK

**NE PAS** lancer de vrais crawls en CI — trop lents, résultats variables.

## Tests E2E Playwright (à créer en S1)

```ts
// tests/e2e/smoke.test.ts
test('flow complet : login → audit → rapport → PDF → share', async ({ page }) => {
  await page.goto('/login')
  // Stack Auth login...
  await page.click('[data-testid="new-audit-btn"]')
  await page.fill('[name="url"]', 'https://wyzlee.com')
  await page.click('[data-testid="launch-audit"]')
  await page.waitForSelector('[data-status="completed"]', { timeout: 180_000 })
  await page.click('[data-testid="generate-report"]')
  await page.waitForURL('/r/**')
  // Vérifier sections non vides
})

test('rate limit — 429 après 4 requêtes/min', async ({ page }) => {
  // 4 appels POST /api/audits en 60s → dernier = 429
})
```

Playwright se connecte à **Neon branch staging** (pas la prod).

## Coverage cibles

| Périmètre | Cible | Outil |
|-----------|-------|-------|
| `lib/audit/phases/` | 80% | Vitest |
| `lib/security/` | 90% | Vitest |
| `lib/report/` | 75% | Vitest |
| `lib/db/` queries | 60% (mocked) | Vitest |
| Routes API | 70% | Vitest |
| Scénarios critiques UI | 5-10 tests | Playwright |

**Ne pas viser 100%** — coverage sur getters/types = bruit.

## Commandes tests

```bash
npm run test          # vitest run (CI)
npm run test:watch    # vitest watch (dev)
npm run test:coverage # vitest + coverage
npm run test:e2e      # playwright (staging)
```

## Règles anti-régression

1. **Avant tout commit** sur `lib/report/` → lancer `tests/lib/report-quality.test.ts`
2. **Scoring rubric** : si les poids changent dans une phase → mettre à jour les tests correspondants
3. **Jamais de mock DB en test intégration** : utiliser Neon branch dédiée (les mocks ont causé un incident prod)
4. **HTML fixtures** : committer dans `tests/fixtures/`, ne pas fetch live en CI
