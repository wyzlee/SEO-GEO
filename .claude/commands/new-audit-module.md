---
description: Scaffold une nouvelle phase d'audit (logique moteur + schema + API + UI + doc). Utiliser quand on ajoute ou remplace une phase.
argument-hint: <phase-key> "<phase-name>"
---

# /new-audit-module

Crée le scaffold complet pour une nouvelle phase d'audit (ou évolution d'une existante).

**Usage** : `/new-audit-module geo "GEO Readiness"`

## Arguments

- `<phase-key>` : clé snake_case (ex: `geo`, `entity`, `freshness`)
- `<phase-name>` : nom humain court (ex: "GEO Readiness", "Entity SEO")

## Étapes

### Étape 1 — Vérifier cohérence

1. Lire `.claude/docs/audit-engine.md` pour vérifier que la phase existe dans la rubric scoring
2. Vérifier que `<phase-key>` n'est pas déjà implémenté dans `lib/audit/phases/`
3. Si phase absente de la spec → demander confirmation + ajouter entrée dans `audit-engine.md` avant de continuer

### Étape 2 — Créer le module de logique

Fichier : `lib/audit/phases/<phase-key>.ts`

Template :
```ts
import type { AuditInput, PhaseResult, Finding } from '@/lib/audit/types'

export async function runPhase<PhaseName>(
  input: AuditInput,
  context: PhaseContext
): Promise<PhaseResult> {
  const findings: Finding[] = []
  let score = SCORE_MAX  // défini dans audit-engine.md rubric

  // Check 1 : ...
  // Check 2 : ...

  return {
    phase_key: '<phase-key>',
    score,
    score_max: SCORE_MAX,
    findings,
    summary: `Phase <phase-name> — ${findings.length} findings`
  }
}

const SCORE_MAX = N  // depuis rubric
```

### Étape 3 — Ajouter à l'orchestrateur

Dans `lib/audit/engine.ts`, ajouter `<phase-key>` à la liste des phases exécutées (dans l'ordre défini par `audit-engine.md`).

### Étape 4 — Étendre `audit_phases` DB (si besoin)

Si nouvelle phase non couverte par le schema existant :
- Ajouter entrée dans seed script pour `audit_phases` avec `phase_order` correct
- Pas besoin de modifier le schema Drizzle (la table est generic via `phase_key` string)

### Étape 5 — Composant UI

Fichier : `components/audit/phases/<phase-key>-phase-card.tsx` (ou réutiliser `<PhaseCard>` générique si la phase suit le pattern standard).

Si la phase a des visualisations spécifiques (ex: GEO montre les bots bloqués en table dédiée) :
- Créer un composant custom qui étend `<PhaseCard>`
- Respecter design system (voir `.claude/docs/ui-conventions.md`)

### Étape 6 — Documentation

Mettre à jour `.claude/docs/audit-engine.md` :
- Ajouter/raffiner la section "Phase N — <phase-name>"
- Définir les checks, déductions, input type, scoring max
- Référencer les sources `[source-N]` pour les claims

Si le knowledge associé manque dans `.claude/docs/seo-geo-knowledge.md` → étendre ce fichier aussi.

### Étape 7 — Tests

Créer `tests/audit/phases/<phase-key>.test.ts` :
- Fixtures HTML/code simulées (input minimal faisant déclencher chaque check)
- Vérifier chaque finding attendu (severity, points_lost, category)
- Golden test : run 2× sur même input → même output

### Étape 8 — Validation

1. `npm run typecheck` → PASS
2. `npm run test -- audit/phases/<phase-key>` → PASS
3. Lancer un audit complet sur une URL test → vérifier que la nouvelle phase apparaît dans `audit_phases` + findings cohérents
4. Vérifier UI : détail d'audit → phase expandable avec findings affichés

## Règles strictes

- **Respecter la rubric de scoring** définie dans `audit-engine.md`. Si besoin d'ajuster, modifier la rubric **avant** le code.
- **Chaque finding doit avoir une `category`** explicite (ex: `geo-ai-bots`, `entity-sameas`, `freshness-stale-evergreen`).
- **Pas de jargon** dans `title` / `description` / `recommendation` — ils iront en FR dans le rapport.
- **Sources traçables** : claims chiffrés → `[source-N]` de `sources.md`.
- **Tests obligatoires** avant commit.

## Exemples

```
/new-audit-module geo "GEO Readiness"
/new-audit-module entity "Entity SEO"
/new-audit-module freshness "Content Freshness"
```

## Edge cases

- Si la phase nécessite un nouvel outil (ex: Puppeteer pour Performance Phase 8) → prévenir le user + `backend-builder` pour ajouter la dep au package.json
- Si la phase a besoin de credentials externes (ex: Wikidata API key) → ajouter à `.env.template` + doc dans `security.md`
- Si la phase devient dominante en temps wall-clock → envisager parallélisation ou cache (V2)
