---
description: Produit un résumé de session — ce qui est fait, ce qui reste, les blocages. Lit status.md, les commits récents, et le roadmap. Fournit les 3 prochaines actions à prioriser.
---

# /morning-standup

Résumé de session / standup quotidien SEO-GEO.

**Usage** : `/morning-standup`

## Étape 1 — Lire l'état des plans

Lire :
- `.claude/plans/status.md` — état des items
- `.claude/plans/roadmap.md` — prochains items

## Étape 2 — Lire les commits récents

```bash
git log --oneline -10
git diff HEAD~3 --stat 2>/dev/null
```

## Étape 3 — Vérifier l'état du codebase

```bash
npm run test 2>&1 | tail -3
npm run typecheck 2>&1 | tail -3
```

## Étape 4 — Produire le rapport

Afficher :

```
# Standup SEO-GEO — [date]

## Ce qui est fait (depuis la dernière session)
- S1.X — [description] ✅
- [commit récent → feature implémentée]

## En cours / bloqué
- S1.X — [description] 🔄 IN PROGRESS
- S1.X — [description] 🔴 BLOQUÉ : [raison]

## Ce qui reste (par priorité)
Sprint 1 :
- [ ] S1.X — [description] (~Xh) — [impact]
- [ ] S1.X — [description] (~Xh) — [impact]

Sprint 2 (horizon 1-2 semaines) :
- [ ] S2.X — [description]

## Palier commercial actuel
- Palier A (Agency Ready) : 🟠 XX% — manque : [liste]
- Palier B (Quality Gate) : 🟡 XX% — manque : [liste]
- Palier C (Self-serve) : 🔴 XX% — manque : [liste]

## 3 actions recommandées aujourd'hui
1. [action prioritaire — BLOQUANT ou sécurité]
2. [action qualité rapport]
3. [action quick win]

## Tests
- Vitest : [N]/[N] passing
- TypeScript : [0 / N erreurs]
```

## Utilisation recommandée

- En début de session de dev
- Après une longue pause (>2 jours)
- Avant un appel client ou une démo
- Pour reprendre contexte après un autre projet

## Note sur les env vars

Rappeler si des vars sont manquantes en prod (S1.1) :
```
⚠️ Rappel : RESEND_API_KEY et GOOGLE_CRUX_API_KEY manquent en prod Vercel
→ S1.1 est BLOQUANT pour le Palier A — configurer via Vercel Dashboard
```
