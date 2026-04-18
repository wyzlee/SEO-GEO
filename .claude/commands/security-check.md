---
description: Lance un audit de sécurité complet du codebase via l'agent security-auditor. Produit un rapport dans .claude/plans/security-report-[date].md. Arrête si trouvailles critiques.
---

# /security-check

Audit de sécurité du codebase SEO-GEO.

**Usage** : `/security-check`

## Étape 1 — Lancer l'agent security-auditor

Invoquer l'agent `.claude/agents/security-auditor.md` sur le codebase complet.

L'agent vérifie :
1. Auth boundaries (routes API sans `authenticateRequest`)
2. SSRF guard DNS-based dans `lib/security/`
3. Secrets hardcodés (grep patterns)
4. Multi-tenant isolation (requêtes sans `organizationId`)
5. Rate limiting sur routes lourdes
6. Upload ZIP guards
7. `npm audit` vulnerabilities
8. Env vars non committées
9. Headers sécurité (`next.config.ts`)
10. HMAC webhooks

## Étape 2 — Évaluer les résultats

### Si findings CRITIQUES (🔴)
- Arrêter immédiatement
- Afficher les findings critiques à l'utilisateur
- Ne pas permettre de deploy tant qu'ils ne sont pas résolus
- Proposer les fixes avec `/implement-feature`

### Si findings IMPORTANTS (🟠) seulement
- Afficher les findings
- Permettre de continuer avec un avertissement
- Ajouter les items dans `.claude/plans/status.md` comme "À corriger"

### Si clean (✅)
- Confirmer "Sécurité OK — aucun finding critique"

## Étape 3 — Sauvegarder le rapport

Sauvegarder dans `.claude/plans/security-report-[YYYY-MM-DD].md`.

## Étape 4 — Mettre à jour le status

Dans `.claude/plans/status.md` :
```
## Dernier audit sécurité
Date : [date]
Résultat : [OK / X findings critiques / Y findings importants]
Rapport : .claude/plans/security-report-[date].md
```

## Utilisation recommandée

- Avant chaque deploy en production
- Après l'implémentation d'un item sécurité (S1.10 SSRF, etc.)
- Avant un engagement client payant
- Trimestriellement en routine

## Règles

- L'agent security-auditor est read-only — il ne modifie rien
- Si un secret est découvert en dur → alerter immédiatement, ne pas continuer
- Le rapport est confidentiel interne (ne pas partager hors git interne)
