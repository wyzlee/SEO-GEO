---
description: Workflow Drizzle migration — generate, review, apply dev, apply prod via Neon branching. Sécurisé contre les opérations destructives.
argument-hint: [generate|apply|apply-prod|status]
---

# /db-migrate

Gestion des migrations Drizzle pour l'app SEO-GEO.

**Usage** :
- `/db-migrate generate` — génère une migration depuis le diff entre `schema.ts` et la DB
- `/db-migrate apply` — applique les migrations pending sur dev (Neon branch dev)
- `/db-migrate apply-prod` — applique sur prod (main branch Neon) avec double check
- `/db-migrate status` — affiche migrations appliquées vs pending

## Prérequis

- `drizzle.config.ts` configuré (pointe vers Neon, lit `DATABASE_URL`)
- `DATABASE_URL_DEV` et `DATABASE_URL` (prod) dans `.env.local`
- Neon project avec branching activé

## Étape 1 — generate

```bash
npm run db:generate
```

→ Crée `drizzle/<timestamp>_<name>.sql`.

**Review obligatoire** :
1. `cat drizzle/<timestamp>_*.sql` → lire le SQL généré ligne par ligne
2. Chercher :
   - `DROP TABLE` → **STOP**, window de maintenance + backup Neon branching requis
   - `DROP COLUMN` sur colonne avec data → **STOP**, plan en 2 étapes (add_new → backfill → drop_old)
   - `ALTER COLUMN ... TYPE ...` breaking (ex: text → int) → même règle
   - Renommages → Drizzle peut les générer incorrectement comme DROP + ADD. Toujours vérifier.
3. Si anything destructive détecté → **abort**, repenser le schema ou préparer migration multi-étapes

Si review OK → commit le fichier SQL avec le change `schema.ts` :
```bash
git add drizzle/ lib/db/schema.ts
git commit -m "db: migrate <description>"
```

## Étape 2 — apply (dev)

Sur branch Neon dev (éphémère ou long-lived `dev`) :

```bash
# .env.local contient DATABASE_URL pointant vers dev branch
npm run db:migrate
```

Vérifier :
- Aucune erreur dans la sortie
- Les colonnes / tables apparaissent comme attendu : `npm run db:studio` (Drizzle Studio) pour inspection visuelle

## Étape 3 — tester

1. Run l'app : `npm run dev`
2. Tester les flows affectés par la migration
3. Si RLS ou triggers ajoutés : vérifier comportement
4. Si nouvelle table métier : vérifier insert/select/delete via UI ou curl

## Étape 4 — apply-prod

**⚠️ Opération sur prod — procédure stricte** :

1. **Vérifier** que la migration est committée sur `main` avec review humain (PR mergée)
2. **Backup** via Neon branching :
   ```
   # Créer une branch "pre-migration-<timestamp>" depuis main
   # Via Neon dashboard OU Neon MCP (create_branch)
   ```
3. **Confirmer** avec user :
   ```
   Vous êtes sur le point d'appliquer les migrations SUIVANTES en PRODUCTION :
   - drizzle/<timestamp1>_*.sql
   - drizzle/<timestamp2>_*.sql

   Backup créé : pre-migration-<timestamp>
   DATABASE_URL prod : ***redacted***

   Tapez "APPLIQUER" pour confirmer.
   ```
4. Si confirmation → `DATABASE_URL=<prod> npm run db:migrate`
5. Monitorer :
   - Logs app (Sentry / logs structurés) pour 5 min post-migration
   - Error rate sur `/api/*`
   - Healthcheck `/api/health` répond 200
6. Si erreurs → rollback via Neon branching (promouvoir la branch `pre-migration-<timestamp>` en main)

## Étape 5 — status

```bash
npm run db:migrate --check  # ou commande équivalente drizzle-kit
```

Affiche :
- Migrations appliquées (lues depuis la table `drizzle_migrations`)
- Migrations pending (fichiers dans `drizzle/` pas encore appliqués)
- Divergence éventuelle entre `schema.ts` et DB (drizzle-kit détecte)

## Règles strictes

- **Jamais** `db:push` en prod (Drizzle push sans migration = dangereux).
- **Jamais** `DROP TABLE` / `DROP COLUMN` sans backup + confirmation explicite.
- **Toujours** review le SQL généré avant apply, même sur dev.
- **Toujours** committer `drizzle/*.sql` avec le change `schema.ts` (atomique).
- **Séparer** schema additifs (safe) et schema breaking (risky) — jamais dans la même migration.
- **Jamais** manipuler manuellement la table `drizzle_migrations` (sauf recovery incident documenté).

## Patterns multi-étapes pour migrations breaking

### Renommer une colonne

**Mauvais (perd les données)** : `ALTER TABLE ... RENAME COLUMN a TO b`
**Bon (zero-downtime)** :
1. Migration 1 : `ADD COLUMN b`
2. App code : dual write (écrire dans `a` et `b`)
3. Backfill script : `UPDATE t SET b = a WHERE b IS NULL`
4. App code : lire depuis `b`, stopper écriture `a`
5. Migration 2 : `DROP COLUMN a`

### Changer le type d'une colonne

Similaire : `ADD new column (new type) → backfill → stop writes old → drop old`.

### Supprimer une table

1. Marquer la table deprecated (commentaire schema, tests FAIL si lue)
2. Logger chaque lecture résiduelle pendant N jours
3. Quand zéro lecture → migration `DROP TABLE`

## Neon branching tips

- **dev** branch : long-lived, pour itérations continues
- **preview-<pr>** branch : éphémère, par PR pour tester migrations avant merge
- **main** branch : prod, protégée
- **pre-migration-<timestamp>** : backup point-in-time avant apply prod

Commande Neon MCP utile : `mcp__Neon__create_branch`, `mcp__Neon__reset_from_parent`.

## Edge cases

- **Schema conflict** (drizzle-kit détecte divergence) → soit apply les migrations pending, soit `db:push` sur DEV pour resync (jamais prod)
- **Migration partielle** (erreur à mi-parcours) → lire drizzle_migrations pour voir lesquelles ont réussi, potentiellement reset depuis backup
- **Timeout sur longue migration** → fractionner en plusieurs migrations courtes, ou exécuter off-hours
- **Conflict concurrent writes** pendant migration → prévoir maintenance window si ADD NOT NULL COLUMN avec DEFAULT expensive
