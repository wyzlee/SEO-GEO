---
description: Implémente un item spécifique du roadmap. Lit .claude/plans/roadmap.md, lance les agents appropriés, fait un review + commit, met à jour .claude/plans/status.md.
argument-hint: "<sprint>.<item>" ex: "S1.6" ou "S2.1"
---

# /implement-feature

Implémente un item du roadmap SEO-GEO.

**Usage** : `/implement-feature S1.6` ou `/implement-feature S1.6 S1.7`

## Étape 1 — Lire le roadmap

Lire `.claude/plans/roadmap.md` et identifier l'item demandé :
- Quoi, Pourquoi, Où, Comment, Effort, Impact, Dépendances

Si des dépendances non terminées existent → signaler à l'utilisateur et demander confirmation avant de continuer.

Lire `.claude/plans/status.md` pour connaître l'état actuel.

## Étape 2 — Analyser les fichiers concernés

Lire tous les fichiers mentionnés dans le "Où" de l'item. Ne jamais modifier sans avoir lu l'existant.

Lire les skills pertinents selon la nature de l'item :
- Item backend/DB → `.claude/skills/data-model.md`, `.claude/skills/coding-conventions.md`
- Item frontend/UI → `.claude/skills/ui-components.md`, `.claude/skills/coding-conventions.md`
- Item sécurité → `.claude/skills/security-guidelines.md`
- Item perf → `.claude/skills/performance-optimization.md`
- Item tests → `.claude/skills/testing-strategy.md`

## Étape 3 — Implémenter

Suivre exactement les instructions "Comment" du roadmap.

### Pour les items backend :
- Respecter le pattern `authenticateRequest` + Zod + filtre organizationId
- Utiliser l'agent `backend-developer` comme référence

### Pour les items frontend :
- Respecter la palette sémantique, jamais de couleurs Tailwind brutes
- Utiliser l'agent `frontend-developer` comme référence

### Pour les items DB/migration :
- Utiliser le workflow `/db-migrate`
- Review SQL avant apply

### Pour les items sécurité :
- Vérifier `assertSafeUrl` et DNS check (S1.10)
- Tests de sécurité obligatoires

### Pour les items tests :
- Fichiers dans `tests/` uniquement
- Fixtures statiques, pas de vrais crawls

## Étape 4 — Validation

```bash
npm run typecheck   # 0 erreur TypeScript
npm run lint        # 0 erreur/warning
npm run test        # tous les tests passent
npm run build       # build sans erreur
```

Si un check échoue → corriger avant de passer à l'étape suivante.

## Étape 5 — Review

Invoquer l'agent `code-reviewer` pour une review complète des changements.

Si la review retourne NO-GO → corriger les blocants avant de commiter.

## Étape 6 — Commit

Format du message :
```
type(scope): message court impératif en français

Implémente item [sprint].[item] du roadmap.
Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

Types : `feat`, `fix`, `security`, `perf`, `test`, `refactor`.

## Étape 7 — Mettre à jour le status

Dans `.claude/plans/status.md`, marquer l'item comme complété :
```
- [x] S1.6 — 5 tests régression rapport → DONE [date]
```

## Règles

- Ne jamais bypasser les étapes de validation
- Si l'item est trop complexe pour être implémenté seul → le signaler et proposer une décomposition
- Ne jamais modifier des fichiers hors scope de l'item
- Signaler si l'implémentation diffère du plan (avec justification)
