---
description: Refresh trimestriel des URLs citées dans .claude/docs/sources.md. Re-fetch, flag les liens morts, propose diff, met à jour les dates de consultation.
argument-hint: [--check-only]
---

# /refresh-sources

Maintient à jour l'index canonique des sources (`.claude/docs/sources.md`).

**Cadence recommandée** : trimestrielle. Prochain refresh prévu : champ `Prochain refresh cible` dans `sources.md`.

**Modes** :
- Pas d'argument → mode interactif : re-fetch chaque URL, affiche diff, demande confirmation avant d'écrire les dates mises à jour
- `--check-only` → re-fetch et report des liens morts sans modifier `sources.md`

## Étape 1 — Lire le fichier

```
Read .claude/docs/sources.md
```

Extraire chaque ligne du tableau (source-N | claim | URL | consulted).

## Étape 2 — Vérifier chaque URL

Pour chaque source-N :

1. **HEAD request** via WebFetch (ou curl via Bash) :
   ```bash
   curl -I -L -A "Mozilla/5.0 (compatible; SEO-GEO-Refresh/1.0)" "<url>" --max-time 10
   ```
2. Classifier le résultat :
   - **HTTP 200** → URL vivante, noter
   - **HTTP 301 / 302** → redirect. Noter la nouvelle URL + proposer update
   - **HTTP 404 / 410** → lien mort. **Flag rouge**
   - **HTTP 5xx** → serveur down temporairement, retry 1 fois après 5s, sinon flag orange
   - **Timeout / DNS error** → flag rouge
   - **Paywall detected** (via content-type ou texte "subscribe") → flag orange, recommander URL alternative

3. Optionnel : fetch le contenu et chercher un marqueur du claim pour vérifier que la source **supporte toujours** le claim (ex: si la source disait "40 %" et le contenu dit maintenant "55 %" → claim désynchronisé).

## Étape 3 — Générer le rapport

Format :

```markdown
## Rapport de refresh — {{today}}

**Sources vérifiées** : 20
**OK (HTTP 200)** : 17
**Redirections** : 2
**Liens morts** : 1

### Redirections à mettre à jour

- `source-4` : https://blog.cloudflare.com/ai-bot-traffic-radar-2025/ → https://blog.cloudflare.com/ai-bots-2025-report/
- `source-14` : https://www.hubspot.com/blog/topic-cluster-seo-study-2024 → redirige vers /topic-clusters-seo/

### Liens morts à remplacer

- `source-11` : https://www.searchenginejournal.com/authoritative-citations-ai-visibility-study/
  404 Not Found. Chercher source alternative pour le claim "+132 % visibilité avec citations autoritaires".

### Claims potentiellement stale

- `source-3` : "48 % AIO" → contenu actuel mentionne "56 %". Vérifier si on met à jour le claim aussi.

### Aucune action nécessaire

- source-1, source-2, source-5, source-6, source-7, source-8, source-9, source-10, source-12, source-13, source-15, source-16, source-17, source-18, source-19, source-20
```

## Étape 4 — Apply updates (mode interactif)

Demander confirmation au user :

```
Voulez-vous :
1. Apply les 2 redirections automatiquement (mettre à jour URL dans sources.md) ? [y/N]
2. Marquer le source-11 comme DEAD et flagger pour remplacement manuel ? [y/N]
3. Mettre à jour "Consulted" à {{today}} pour les 17 sources OK ? [y/N]
```

Si `y` sur chaque :
1. Remplacer les URLs dans `sources.md` via Edit
2. Ajouter ligne `source-11 — DEAD` dans une section "Flagged sources" en bas du fichier (ou marquer dans la ligne existante)
3. Update colonne `Consulted` → {{today}} pour toutes les sources confirmées OK + redirections appliquées
4. Update header : `Dernier refresh : {{today}}`, `Prochain refresh cible : {{today + 3 mois}}`

## Étape 5 — Audit des claims stale

Pour chaque claim potentiellement désynchronisé (valeur changée dans la source) :

1. Proposer au user le diff : ancien claim vs nouveau claim
2. Si validé → Update `sources.md` avec le nouveau claim
3. **Important** : propager le change aux autres docs qui citent ce `[source-N]`
   ```bash
   grep -rn "[source-N]" .claude/docs/ CLAUDE.md
   ```
   Lister les fichiers impactés, proposer des edits.

## Étape 6 — Commit

```bash
git add .claude/docs/sources.md
git commit -m "sources: refresh trimestriel {{date}} — {{N}} confirmed, {{M}} updated, {{K}} flagged"
```

Si des claims ont été propagés dans d'autres docs :
```bash
git add .claude/docs/seo-geo-knowledge.md .claude/docs/audit-engine.md # etc.
git commit -m "docs: sync claims avec sources refresh {{date}}"
```

## Étape 7 — Notifier

Si refresh découvre des changements significatifs (ex: une stat critique a bougé de +/- 20 %) :
- Ajouter note dans `STATUS.md`
- Optionnel : message Slack / communication interne

## Règles strictes

- **Ne jamais** supprimer une source flaggée DEAD sans remplacement — garder la ligne avec marqueur `DEAD` pour audit trail
- **Ne jamais** modifier un claim sans vérifier la source primaire
- **Toujours** mettre à jour les dates de consultation (colonne `Consulted`) même si l'URL n'a pas bougé — c'est la preuve de fraîcheur de l'audit
- **User-Agent honnête** : identifier notre bot comme `SEO-GEO-Refresh/1.0` (pas anonyme, pas spoofé)
- **Rate limit** : 1 req / 2s entre les fetches pour pas surcharger les domaines cibles

## Mode --check-only

Identique aux étapes 1-3 mais :
- **Pas** d'update du fichier
- **Pas** de commit
- Juste un rapport stdout

Utile pour CI ou audit ponctuel sans effet de bord.

## Edge cases

- **Site nécessite JS rendering** (SPA) → HEAD ne suffit pas. Tenter GET avec curl + vérifier status code, accepter 200 même sans content check
- **URL nécessite auth** (paywall, Gartner) → flag orange, ne pas forcer retry, noter pour review humaine
- **Rate limiting par la cible** (429) → backoff + retry avec délai plus long
- **Changement de domaine** (ex: blog migré) → suivre redirects (-L) mais si le contenu ne matche plus, flag pour review manuelle
- **Plus de 5 liens morts détectés** → alerter user explicitement, c'est un signal que l'index a vieilli au-delà du normal

## Ajout d'une nouvelle source entre deux refreshes

Workflow manuel (pas via cette commande) :

1. Ouvrir `.claude/docs/sources.md`
2. Ajouter ligne avec prochain numéro `source-N+1`
3. Format : `| source-N | Claim court FR | URL | YYYY-MM-DD |`
4. Référencer depuis le doc qui en a besoin via `[source-N+1]`

Aucune commande dédiée pour ça — c'est un edit direct.
