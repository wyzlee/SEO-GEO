---
description: Lance l'agent code-reviewer sur les changements en cours, puis crée un commit conventionnel avec co-author Claude si la review est GO.
---

# /review-and-commit

Review des changements + commit si GO.

**Usage** : `/review-and-commit`

## Étape 1 — Vérifier qu'il y a des changements

```bash
git status --short
git diff --stat HEAD
```

Si rien à commiter → afficher "Rien à commiter" et s'arrêter.

## Étape 2 — Review des changements

Invoquer l'agent `code-reviewer` sur tous les fichiers modifiés.

La review vérifie :
- Auth boundaries (routes API)
- Design tokens (composants UI)
- Zod v4 (`.issues` pas `.errors`)
- Multi-tenant (`organizationId` sur toutes les requêtes)
- Secrets (pas de hardcode)
- TypeScript strict

### Si review retourne NO-GO
- Afficher les blocants
- Ne pas commiter
- Proposer les corrections avec les fichiers et lignes concernés

### Si review retourne GO (avec ou sans réserves)
- Afficher les réserves (s'il y en a) comme TODOs
- Continuer vers le commit

## Étape 3 — Validation rapide

```bash
npm run typecheck 2>&1 | tail -5
npm run test 2>&1 | tail -5
```

Si un check échoue → STOP. Ne pas commiter. Signaler l'erreur.

## Étape 4 — Construire le message de commit

Analyser les fichiers modifiés et inférer :
- **Type** : feat / fix / security / perf / test / refactor / docs / chore
- **Scope** (optionnel) : nom de la feature ou du module
- **Message** : impératif, en français, < 72 caractères

Exemples :
```
fix(pdf): corriger timing Puppeteer pour recharts
feat(report): ajouter section Forces avant findings
security: ajouter SSRF DNS-based check dans url-guard
test(report): ajouter 5 tests régression qualité
perf(db): ajouter 3 index manquants (status, phase, org)
```

Présenter le message proposé à l'utilisateur et demander confirmation ou modification.

## Étape 5 — Commit

```bash
git add [fichiers pertinents — pas git add -A aveugle]
git commit -m "$(cat <<'EOF'
type(scope): message

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

**Ne jamais utiliser `git add -A`** sans vérifier qu'il n'y a pas de fichiers sensibles (.env.local, .DS_Store, etc.).

## Étape 6 — Confirmer

```bash
git log --oneline -3
```

Afficher le hash du commit et le message. Rappeler que le push n'a pas été fait.

## Règles

- **Jamais** `git push` sans confirmation explicite d'Olivier
- **Jamais** `--no-verify`
- **Toujours** vérifier `git status` pour les `.DS_Store` (ajouter au `.gitignore` si présent)
- Review NO-GO = aucun commit, point final
