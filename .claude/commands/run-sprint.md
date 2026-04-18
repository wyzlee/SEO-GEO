---
description: Exécute tous les items d'un sprint du roadmap en gérant les dépendances. Lance les items parallélisables simultanément, séquence ceux qui ont des dépendances. Met à jour .claude/plans/status.md à chaque étape.
argument-hint: "<sprint>" ex: "Sprint 1" ou "S1"
---

# /run-sprint

Exécute un sprint complet du roadmap SEO-GEO.

**Usage** : `/run-sprint Sprint 1` ou `/run-sprint S1`

## Étape 1 — Lire le roadmap et le status

Lire `.claude/plans/roadmap.md` → extraire tous les items du sprint demandé.
Lire `.claude/plans/status.md` → identifier les items déjà complétés (ne pas ré-exécuter).

**Sprint 1 items** (référence) :
- S1.1 — Env vars prod (30 min) — aucune dépendance
- S1.2 — Smoke test prod (2h) — dépend de S1.1
- S1.3 — Monitoring Sentry (2h) — aucune dépendance
- S1.4 — Legal sous-traitants (1h) — aucune dépendance
- S1.5 — Canal support (30 min) — aucune dépendance
- S1.6 — Tests régression rapport (3h) — aucune dépendance
- S1.7 — Fix PDF charts (4h) — dépend de S1.2
- S1.8 — Section Forces rapport (2h) — dépend de S1.6
- S1.9 — 3 index DB (2h) — aucune dépendance
- S1.10 — SSRF DNS check (2h) — aucune dépendance

## Étape 2 — Présenter le plan d'exécution

Avant de commencer, afficher :
```
Sprint 1 — Plan d'exécution

Groupe 1 (parallèle) : S1.1, S1.3, S1.4, S1.5, S1.6, S1.9, S1.10
Groupe 2 (dépend Groupe 1) : S1.2, S1.7, S1.8

Durée estimée : ~19h
Items déjà complétés : [liste depuis status.md]

Veux-tu que je procède ?
```

**Attendre la confirmation de l'utilisateur avant d'exécuter.**

## Étape 3 — Exécuter Groupe 1 (items indépendants)

Pour chaque item du groupe 1 (sans dépendances), invoquer `/implement-feature <item>`.

Mise à jour `status.md` au fil de l'eau :
```
- [x] S1.1 — Env vars → DONE [date]
- [~] S1.3 — Sentry → IN PROGRESS
```

## Étape 4 — Exécuter Groupe 2 (items avec dépendances)

Une fois le Groupe 1 terminé, exécuter les items qui avaient des dépendances.

## Étape 5 — Validation sprint

```bash
npm run test        # tous les tests passent (62+ expected)
npm run typecheck   # 0 erreur
npm run build       # build clean
```

Invoquer `/security-check` pour un audit rapide post-sprint.

## Étape 6 — Résumé sprint

Afficher :
```
✅ Sprint [N] terminé

Items complétés : [liste]
Items échoués / non complétés : [liste avec raisons]
Tests : [N]/[N] passing
Durée réelle : ~Xh

Prochaine étape : Sprint [N+1]
Items en attente : [liste S2.x]
```

Mettre à jour `status.md` avec le résumé.

## Gestion des erreurs

Si un item échoue :
1. Logger l'erreur dans `status.md`
2. Continuer avec les items suivants non bloqués
3. Signaler à l'utilisateur avec le détail du blocage
4. Ne pas aborter le sprint complet pour un item non critique

Si un item BLOQUANT échoue (ex: S1.1 env vars) → arrêter les dépendances (S1.2) et signaler.
