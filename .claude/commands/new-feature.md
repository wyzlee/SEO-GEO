---
description: Scaffold end-to-end d'une feature (schema DB → migration → API → types Zod → hook React Query → composant UI → test). Utilise pour toute nouvelle fonctionnalité métier.
argument-hint: <feature-name> "<purpose>"
---

# /new-feature

Scaffold complet d'une feature Wyzlee : du schéma DB à l'UI, en passant par API, types, hooks et tests.

**Usage** : `/new-feature workspace "Sous-organisations pour gros clients agence"`

## Arguments

- `<feature-name>` : nom kebab-case (ex: `workspace`, `webhook-outbound`, `audit-template`)
- `<purpose>` : description 1 phrase de ce que la feature apporte au produit

## Pipeline

### Étape 1 — Clarifier le contrat

Avant de coder, écrire dans un buffer mental (ou un brouillon) :
- **Data model** : quelles tables / colonnes ? lien avec existantes ?
- **API surface** : quels endpoints ? méthodes ? request/response shapes ?
- **UI surface** : quelles pages / composants ? où dans le dashboard ?
- **Auth scope** : qui peut faire quoi ? (owner, admin, member, public)
- **Out of scope** : ce que la feature ne fait **pas** (pour cadrer)

Si flou → demander au user de clarifier avant de scaffolder.

### Étape 2 — Schema DB

Agent : `backend-builder`.

- Étendre `lib/db/schema.ts` avec les nouvelles tables/colonnes
- Respecter les conventions `data-model.md` (multi-tenant, timestamps, FK cascade)
- Créer index pertinents (performance queries courantes)

### Étape 3 — Migration

- `npm run db:generate` → génère `drizzle/<timestamp>_<feature-name>.sql`
- **Review** le SQL généré avant apply (cat le fichier, chercher DROP / rename colonnes avec data)
- `npm run db:migrate` (dev Neon branch)
- Tester avec un seed minimal

### Étape 4 — Types Zod

Fichier : `lib/types/<feature-name>.ts`

```ts
import { z } from 'zod'

export const create<Feature>Schema = z.object({ ... })
export const update<Feature>Schema = z.object({ ... })
export const list<Feature>QuerySchema = z.object({ ... })

export type <Feature> = z.infer<typeof <Feature>Schema>
export type Create<Feature>Input = z.infer<typeof create<Feature>Schema>
// etc.
```

### Étape 5 — API routes

Utiliser `/new-api-route` pour chaque endpoint nécessaire. Typiquement :
- `POST /api/<feature-name>s` — create
- `GET /api/<feature-name>s` — list
- `GET /api/<feature-name>s/[id]` — detail
- `PATCH /api/<feature-name>s/[id]` — update (si applicable)
- `DELETE /api/<feature-name>s/[id]` — delete (si applicable)

### Étape 6 — Hooks React Query

Fichier : `lib/api/<feature-name>.ts`

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authFetch } from './auth-fetch'

export function use<Feature>List(orgId: string) {
  return useQuery({
    queryKey: ['<feature-name>s', orgId],
    queryFn: () => authFetch('/api/<feature-name>s').then(r => r.json()),
  })
}

export function useCreate<Feature>() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Create<Feature>Input) =>
      authFetch('/api/<feature-name>s', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['<feature-name>s'] }),
  })
}
```

### Étape 7 — Composants UI

Agent : `frontend-builder`.

- Liste : `components/<feature-name>/list.tsx` ou page `app/dashboard/<feature-name>s/page.tsx`
- Form create/edit : `components/<feature-name>/form.tsx`
- Détail : page `app/dashboard/<feature-name>s/[id]/page.tsx`
- Respecter design system (voir `ui-conventions.md`)
- Toasts `sonner` pour feedback succès/erreur
- Loading states avec skeletons ou spinners inline

### Étape 8 — Route / navigation

- Ajouter entrée sidebar si feature a sa section dédiée (voir `components/layout/sidebar.tsx`)
- Icon lucide-react, label FR
- Respecter pattern nav (active indicator, tooltips collapsed)

### Étape 9 — Tests

- Test unitaire API : fixtures DB, appel endpoint, assertions
- Test E2E léger : signup → feature create → verify persisted (Playwright ou Vitest + msw)
- Golden test pour logique déterministe

### Étape 10 — Documentation

- Ajouter section dans `.claude/docs/architecture.md` si la feature change les flux
- Si feature = nouvelle entité métier → étendre `.claude/docs/data-model.md`
- Si feature expose une API publique → documenter les shapes request/response

### Étape 11 — Validation

- `npm run typecheck` → PASS
- `npm run lint` → PASS
- `npm run test` → PASS
- `/wyzlee-stack-validate` → PASS
- `/wyzlee-design-validate` → PASS
- Agent `qa-reviewer` review complète

### Étape 12 — Commit

```
git add -A
git commit -m "feat(<feature-name>): <purpose>"
```

Pas de push auto.

## Règles strictes

- **Pas de feature sans schema**. Si ça ne persiste rien, c'est un composant pas une feature.
- **Pas de schema sans migration committée**. Drizzle migrate avant le code qui l'utilise.
- **Pas de feature sans test** (unit OR e2e, selon la nature).
- **Multi-tenant par défaut**. Toute nouvelle table métier porte `organization_id`.
- **Pas de mélange** : schema / API / UI / tests en commits séparés si la feature est grosse (> 500 LoC).

## Exemples

```
/new-feature workspace "Sous-organisations pour gros clients agence"
/new-feature audit-template "Templates d'audit pré-configurés (e-commerce, SaaS, B2B services)"
/new-feature refresh-audit "Re-run un audit pour comparer les scores dans le temps"
/new-feature invite-member "Inviter un membre dans une organisation par email"
```

## Edge cases

- **Feature qui refactor beaucoup** → séparer refactor (commit dédié sans feature nouvelle) puis feature. Éviter un PR monstre.
- **Feature breaking** sur le schema → prévoir migration en 2 temps (add new + backfill + drop old) dans windows séparées, jamais en un seul commit.
- **Feature V2 anticipée** (ex: Stripe) → scaffolder les stubs mais garder sous feature flag ou env var désactivée par défaut.
