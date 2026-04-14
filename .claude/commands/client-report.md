---
description: Génère le rapport white-label FR (web + PDF) pour un audit donné. Invoque l'agent report-generator. Retourne share URL + PDF URL.
argument-hint: <audit-id> [--format=web|pdf|both] [--branding=<org-id>]
---

# /client-report

Génère le rapport client pour un audit terminé.

**Usage** :
```
/client-report abc-123-def
/client-report abc-123-def --format=pdf
/client-report abc-123-def --branding=org-acme-agency
```

## Prérequis

- L'audit existe dans la DB (`audits.id = <audit-id>`)
- L'audit est `status=completed` (sinon abort avec message clair)
- L'utilisateur courant appartient à l'org propriétaire de l'audit (vérifié par auth)

## Étape 1 — Vérification

1. Fetch audit depuis DB : `SELECT * FROM audits WHERE id = <audit-id>`
2. Check status :
   - `queued` / `running` → abort : "Audit pas encore terminé (status={{status}}). Réessayer quand terminé."
   - `failed` → abort : "Audit en échec : {{error_message}}. Pas de rapport possible."
   - `completed` → continuer
3. Check ownership : l'audit appartient-il à l'org du user courant ? Si non → 403

## Étape 2 — Charger le contexte

```
- audit row (score_total, score_breakdown, client_name, consultant_name, target_url, audit_date)
- audit_phases (11 rows, pour scoring détaillé)
- findings (tous, triés par severity + points_lost)
- organizations.branding (pour white-label si applicable)
```

## Étape 3 — Invoquer l'agent report-generator

```
Agent: report-generator
Prompt: Générer le rapport pour audit_id=<audit-id>. Format: <format>. Branding: <org-id si applicable, sinon default Wyzlee>.
Attendre : report_id, share_slug, optionnellement pdf_storage_key.
```

L'agent suit la procédure détaillée dans `.claude/agents/report-generator.md` :
- Lit `.claude/docs/report-templates.md` pour le template
- Substitue les variables
- Traduit le technique en FR accessible
- Rend en Markdown → HTML → (optionnellement) PDF
- Persiste dans la table `reports`

## Étape 4 — Checklist pré-livraison (automatique)

L'agent applique les checks listés dans `report-templates.md` :
- [ ] Aucune `{{variable}}` restante dans le HTML/PDF
- [ ] Score total = somme breakdown
- [ ] Au moins 1 quick win listée
- [ ] Roadmap 90j a 3 sprints avec ≥ 1 action chacun
- [ ] Share link retourne 200 (HEAD sur `/r/<slug>`)
- [ ] PDF < 10 MB
- [ ] Aucun terme technique anglais non traduit dans le texte final

Si un check fail → retry ou message d'erreur explicite.

## Étape 5 — Output

Retourner à l'utilisateur :

```markdown
## Rapport généré

**Audit** : {{audit.client_name}} — {{audit.target_url}} ({{audit.finished_at}})
**Score** : {{score_total}}/100 — {{score_level}}

### Liens

- 🌐 **Version web** (valable 30 jours) : https://seo-geo.wyzlee.cloud/r/<share_slug>
- 📄 **PDF** : <pdf_url> (si format inclut pdf)

### Contenu

- Résumé exécutif
- Scoring détaillé (10 catégories)
- Top 5 problèmes critiques
- {{nb_quick_wins}} quick wins (< 1h chacune)
- Feuille de route 90 jours (3 sprints)

### Partage avec le client

Envoyer l'URL web par email (le client peut consulter sans compte).
Si le client préfère un document : attacher le PDF.

---

**Rapport ID** : {{report_id}}
**Expire le** : {{share_expires_at}}
```

## Étape 6 — Logging

Log structuré (sans PII) :
```json
{
  "action": "client_report_generated",
  "audit_id": "<id>",
  "org_id": "<id>",
  "report_id": "<id>",
  "format": "both",
  "duration_ms": 2340,
  "pdf_size_kb": 1247,
  "findings_count": 34
}
```

## Règles strictes

- **Pas de génération si audit pas terminé**. Pas de rapport partiel.
- **Ownership check obligatoire**. L'user doit appartenir à l'org propriétaire.
- **Branding par défaut Wyzlee** si aucun branding org configuré. Fallback silencieux si logo_url 404.
- **Share link expiration** : 30 jours par défaut, max 1 an (paramétrable via `--expires-days=N` optionnel).
- **Pas de leak** du `org_id` ou `audit_id` internal sur la page publique `/r/<slug>` — slug est la clé publique.

## Exemples

```
/client-report abc-123-def
→ Génère web + PDF avec branding Wyzlee default

/client-report abc-123-def --format=web
→ Génère seulement la version web

/client-report abc-123-def --branding=org-acme-agency
→ Génère avec logo + couleurs Acme Agency (white-label)

/client-report abc-123-def --format=pdf --expires-days=90
→ PDF seulement, share link valide 90 jours
```

## Edge cases

- **Audit très court** (score 95+, findings < 5) → rapport reste utile mais condensé. Inclure minimum 3 recos de maintien continu.
- **Audit catastrophique** (score < 20) → rapport reste pro, pas alarmiste. Focus sur 3-5 quick wins débloquants.
- **Branding org.logo_url 404** → log warning, fallback Wyzlee silencieux (ne pas fail le rapport)
- **PDF generation crash** (Puppeteer OOM) → garder web disponible, retry PDF async dans worker, notifier user
- **Re-génération** (un rapport existe déjà) → créer nouvelle row dans `reports` (versionning), ne pas écraser l'ancien. Retourner le plus récent sauf `--version=<N>` explicite.
- **Concurrent generation** (2 users demandent le rapport en même temps) : lock léger via `SELECT FOR UPDATE` sur la row audit, premier génère, second attend 2s puis retourne le même report_id.

## Limites

- Pas d'envoi email automatique (à ajouter V2 via integration Resend / Postmark)
- Pas de multi-langue au V1 (FR uniquement). EN prévu V2.
- Pas d'annotation / commentaire collaboratif sur le rapport (V2+)
