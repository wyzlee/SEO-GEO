---
description: Relit le codebase et les plans actuels, identifie ce qui a changé depuis la Phase 1, met à jour roadmap.md et status.md. Utile après une session de dev ou avant de planifier le prochain sprint.
---

# /update-plan

Met à jour les plans en fonction de l'état réel du codebase.

**Usage** : `/update-plan`

## Étape 1 — Lire l'état actuel des plans

Lire :
- `.claude/plans/status.md` — état des items
- `.claude/plans/roadmap.md` — items planifiés
- `.claude/plans/diagnosis.md` — diagnostic initial

## Étape 2 — Auditer le codebase

Vérifier ce qui a changé depuis le diagnostic :

### Features implémentées
```bash
git log --oneline -20   # commits récents
git diff HEAD~10 --stat # fichiers modifiés
```

### État des items Sprint 1
Vérifier chaque item en lisant le code réel :

**S1.1 — Env vars** :
```bash
# Vérifier dans next.config.ts ou lib/ si RESEND et CRUX sont utilisés
grep -rn "RESEND_API_KEY\|GOOGLE_CRUX_API_KEY" lib/ app/
```

**S1.6 — Tests rapport** :
```bash
ls tests/lib/report-quality.test.ts 2>/dev/null && echo "EXISTS" || echo "MISSING"
```

**S1.7 — PDF timing** :
```bash
grep -n "waitForSelector\|networkidle0" app/r/*/pdf/route.ts
```

**S1.9 — Index DB** :
```bash
grep -n "status_queued_at\|audit_phase\|org_created" lib/db/schema.ts
```

**S1.10 — SSRF DNS** :
```bash
grep -n "dns.lookup\|isPrivateIP" lib/security/url-guard.ts lib/audit/crawl.ts 2>/dev/null
```

## Étape 3 — Identifier les nouveaux gaps

Comparer le codebase actuel avec le diagnostic initial :
- Nouveaux bugs découverts ?
- Nouvelles dépendances ou librairies ?
- Items initialement planifiés qui sont déjà implémentés ?
- Items du backlog qui sont devenus urgents ?

## Étape 4 — Mettre à jour status.md

Réécrire la section status actuel :

```markdown
## Status — [date de mise à jour]

### Sprint 1 — Quick Wins
- [x] S1.1 — Env vars → DONE [date]
- [x] S1.6 — Tests rapport → DONE [date]
- [ ] S1.7 — PDF charts → TODO (effort 4h)
- [~] S1.10 — SSRF DNS → IN PROGRESS
...

### Sprint 2 — Structurant
- [ ] S2.1 — Landing page → TODO
...

### Découvertes depuis le diagnostic initial
- [nouveau gap identifié] → ajouté au backlog
```

## Étape 5 — Mettre à jour roadmap.md si nécessaire

Si de nouveaux items ont été découverts → les ajouter dans la section Backlog.
Si des items sont devenus obsolètes → les marquer comme `[REMOVED: raison]`.

**Ne pas supprimer** les items complétés — les marquer `[DONE]`.

## Étape 6 — Rapport de mise à jour

Présenter :
```
Mise à jour plan — [date]

Items complétés depuis dernière mise à jour :
- [liste]

Items nouveaux découverts :
- [liste]

Prochain sprint recommandé : Sprint [N]
Items prioritaires : [top 3]
Durée estimée : ~Xh
```
