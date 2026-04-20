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

**Sprint 3 — Quick Wins (référence actuelle)** :
- S3.1 — console.log → logger.info crawl.ts (20 min) — aucune dépendance
- S3.2 — maxRetries: 2 Anthropic briefs.ts (30 min) — aucune dépendance
- S3.3 — waitUntil: 'load' PDF (10 min) — aucune dépendance
- S3.4 — Skip link layout.tsx (30 min) — aucune dépendance
- S3.5 — next/image + alt admin pages (1h) — aucune dépendance
- S3.6 — Guard last owner deletion (1h) — aucune dépendance
- S3.7 — Fix org-admins /api/admin/org/audits (2h) — aucune dépendance
- S3.8 — Structured outputs Claude tool_use (3h) — dépend de S3.2
- S3.9 — Token cost logging Anthropic (1h) — dépend de S3.2
- S3.10 — Sentry tag audit_id worker (1h) — aucune dépendance

**Sprint 4 — Structurant (référence)** :
- S4.1 — CSP Content-Security-Policy-Report-Only next.config.ts (4h)
- S4.2 — Partial results UI dashboard/audits/[id]/page.tsx (1j)
- S4.3 — Score ring animé SVG components/audit/score-badge.tsx (4h)
- S4.4 — Cache CrUX + Wikidata Upstash TTL (3h)
- S4.5 — Rate limit global audits running/org (2h)
- S4.6 — MSW pour tests API externes (4h)

**Source** : `.claude/plans/roadmap.md` — toujours lire ce fichier pour avoir les items à jour.

## Étape 2 — Présenter le plan d'exécution

Avant de commencer, afficher :
```
Sprint [N] — Plan d'exécution

Groupe 1 (parallèle) : [items sans dépendances]
Groupe 2 (dépend Groupe 1) : [items avec dépendances]

Durée estimée : ~Xh
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
npm run test        # tous les tests passent (62/62 expected)
npm run typecheck   # 0 erreur TypeScript
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
