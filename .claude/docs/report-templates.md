# Report Templates — White-label FR

> Template du rapport client délivré à la fin d'un audit. Format FR, jargon-free, prêt à envoyer.
> Rendu par l'agent `report-generator` ou directement par `/client-report` command.

## Format de livraison

- **Web** : page publique `seo-geo-orcin.vercel.app/r/<slug>` (lien tokenisé, expire 30 jours par défaut)
- **PDF** : version imprimable, généré via Puppeteer headless à partir du HTML
- **Longueur cible** : 10-15 pages

## Variables templating

Toutes en `{{snake_case}}`. Substitution AVANT rendu final. Erreur bloquante si variable non substituée (`{{unknown}}` restant).

| Variable | Type | Exemple | Source |
|----------|------|---------|--------|
| `{{client_name}}` | string | "Acme SA" | `audits.client_name` |
| `{{audit_date}}` | date FR | "14 avril 2026" | `audits.finished_at` formaté |
| `{{site_url}}` | URL | "https://acme.com" | `audits.target_url` |
| `{{consultant_name}}` | string | "Olivier Duvernay" | `audits.consultant_name` |
| `{{consultant_email}}` | string | "olivier@wyzlee.com" | config org |
| `{{score_global}}` | int 0-100 | "78" | `audits.score_total` |
| `{{score_level}}` | string | "Bon" | calculé depuis `score_global` (voir table) |
| `{{score_breakdown}}` | table | (rendue) | `audits.score_breakdown` JSON |
| `{{top_5_issues}}` | list | (rendue) | findings top 5 par `severity + points_lost` |
| `{{quick_wins}}` | list | (rendue) | findings `effort=quick` |
| `{{roadmap_90j}}` | list | (rendue) | 3 sprints depuis phase 11 synthesis |
| `{{executive_summary}}` | texte | (rendu) | résumé 6-8 lignes généré depuis findings |
| `{{strengths}}` | list | (rendue) | top 3 phases avec ratio score élevé |
| `{{weaknesses}}` | list | (rendue) | top 3 phases avec ratio score faible |

## Table `score_level`

| `score_global` | `score_level` | Couleur badge |
|----------------|---------------|---------------|
| 0-39 | "Critique" | rouge |
| 40-59 | "À améliorer" | ambre |
| 60-79 | "Bon" | bleu |
| 80-100 | "Excellent" | vert |

## Structure du rapport (7 sections)

### 1. Page de garde

```
╔══════════════════════════════════════════════════════╗
║                                                       ║
║              AUDIT SEO & GEO                          ║
║                                                       ║
║              {{client_name}}                          ║
║              {{site_url}}                             ║
║                                                       ║
║              {{audit_date}}                           ║
║                                                       ║
║              Par {{consultant_name}}                  ║
║                                                       ║
╚══════════════════════════════════════════════════════╝
```

Design : Cabinet Grotesk grand titre, fond dégradé subtle indigo/violet, logo agence variable (via `organizations.branding.logo_url`).

### 2. Résumé exécutif

Une page. Structure :

```markdown
## Synthèse

Votre site {{site_url}} obtient un score global de **{{score_global}}/100** — niveau « {{score_level}} ».

{{executive_summary}}

**Forces principales** :
{{strengths}}

**Axes d'amélioration prioritaires** :
{{weaknesses}}

**Gain potentiel estimé** : entre {{gain_min}} et {{gain_max}} points sur 90 jours si la roadmap ci-dessous est mise en œuvre.
```

### 3. Scoring détaillé

Visuel : barre segmentée 100 pts, 10 catégories avec leur score individuel.

```markdown
## Scoring détaillé

| Catégorie | Score | Max | Ratio |
|-----------|-------|-----|-------|
| SEO technique | X | 12 | Y % |
| Données structurées | X | 15 | Y % |
| Visibilité IA (GEO) | X | 18 | Y % |
| Identité (Entity) | X | 10 | Y % |
| Crédibilité (E-E-A-T) | X | 10 | Y % |
| Fraîcheur du contenu | X | 8 | Y % |
| International | X | 8 | Y % |
| Performance (Core Web Vitals) | X | 8 | Y % |
| Autorité thématique | X | 6 | Y % |
| Erreurs courantes | X | 5 | Y % |
| **Total** | **{{score_global}}** | **100** | — |
```

Sous chaque ligne : 1 phrase de contexte FR sur ce que ça veut dire pour le client (jamais "E-E-A-T", toujours "Crédibilité (Experience Expertise Authority Trust)").

### 4. Top 5 problèmes critiques

```markdown
## Les 5 points à corriger en priorité

### 1. {{issue_title}}

**Impact** : {{issue_severity}} — coûte {{points_lost}} points dans le scoring.

{{issue_description_fr}}

**Recommandation** : {{issue_recommendation_fr}}

**Effort estimé** : {{effort_fr}} ({{effort_duration}}).

---

### 2. ...
```

Version FR de chaque finding — pas de jargon tech. « robots.txt » devient « fichier de configuration des robots crawlers », sauf si le client est tech (à détecter via `audits.client_type` si ajouté plus tard).

### 5. Quick Wins (< 1h d'effort chacun)

Liste courte, 5-10 items max. Format :

```markdown
## Victoires rapides (< 1h chacune)

- ✔ Ajouter une balise `meta description` sur la page d'accueil (+1 pt)
- ✔ Corriger l'erreur `hreflang` entre /fr/ et /en/ (+1 pt)
- ✔ Retirer `Disallow: /` pour `GPTBot` dans robots.txt (+2 pts)
- ...
```

Prioriser ratio `points_lost / effort` (max impact par heure investie).

### 6. Feuille de route 90 jours

3 sprints.

```markdown
## Feuille de route 90 jours

### 🏃 Sprint 1 — Victoires rapides (Semaines 1-2)

Objectif : récupérer {{sprint1_points}} points en < 10h d'effort.

- [ ] {{action_1}}
- [ ] {{action_2}}
- [ ] {{action_3}}

### 🔧 Sprint 2 — Structurant (Semaines 3-6)

Objectif : renforcer les fondations SEO/GEO, +{{sprint2_points}} points.

- [ ] {{action_1}}
- [ ] ...

### 🎯 Sprint 3 — Stratégique (Semaines 7-12)

Objectif : construire l'autorité long-terme, +{{sprint3_points}} points.

- [ ] {{action_1}}
- [ ] ...
```

Chaque action avec :
- Checkbox vide (pour suivi manuel)
- Estimation d'effort (quick / medium / heavy)
- Points potentiels gagnés

### 7. Annexes

```markdown
## Annexes

### Méthodologie

Cet audit couvre 11 phases d'analyse alignées avec les standards 2026 :
1. SEO technique (baseline)
2. Données structurées (schema.org)
3. Optimisation pour moteurs IA (GEO) — llms.txt, AI bots, semantic completeness
4. Identité entité (Wikidata, sameAs)
5. Crédibilité (E-E-A-T signals)
6. Fraîcheur du contenu
7. International (hreflang)
8. Performance (Core Web Vitals 2026)
9. Autorité thématique (pillar + cluster)
10. Erreurs courantes
11. Synthèse

### Sources

Les benchmarks cités proviennent de {{sources_list}} — dates de consultation disponibles sur demande.

### Contact

**{{consultant_name}}**
{{consultant_email}}

Disponible pour échanger sur les recommandations ou pour un accompagnement opérationnel.
```

## Contraintes de style

- **Pas de jargon** : « INP » devient « réactivité au clic / tap », « canonical » devient « URL de référence de la page », « hreflang » devient « balise de langue/pays ».
- **Voix active** : « Corrigez votre robots.txt » pas « Il serait recommandé de considérer une correction du fichier robots.txt ».
- **Concret** : toujours donner l'action précise, jamais « améliorez votre SEO ».
- **Honnête** : pas de gonflement. Un site à 78/100 est « Bon », pas « Excellent ».
- **Rassurant** : ton professionnel mais encourageant, pas alarmiste.

## Règles de substitution

- `{{score_global}}` et `{{score_level}}` : substitution directe string.
- Tables (`{{score_breakdown}}`, `{{top_5_issues}}`, `{{quick_wins}}`, `{{roadmap_90j}}`, `{{strengths}}`, `{{weaknesses}}`) : rendues par une helper (`lib/report/render.ts`) qui génère le Markdown depuis les findings DB.
- `{{executive_summary}}` : prompt LLM courte (Claude API) avec les findings en input, output 6-8 lignes FR → à coder dans `lib/report/summary.ts`.

## Branding white-label

Si `organizations.branding` défini :
- `logo_url` → injecté en haut de page de garde (fallback : logo Wyzlee)
- `primary_color` → CSS var `--brand-primary` override
- `footer_text` → texte footer custom (fallback : "Audit généré par Wyzlee — seo-geo-orcin.vercel.app")

Si pas de branding → défaut Wyzlee (logo + couleurs indigo/violet).

## Génération PDF

- Template HTML dédié (`app/reports/pdf/<slug>/page.tsx`) avec CSS print-friendly
- Puppeteer headless : `page.pdf({ format: 'A4', printBackground: true, margin: {...} })`
- Fonts embarquées (Cabinet Grotesk woff2, Fira Code via Google Fonts subset)
- Images optimisées (compression AVIF → fallback PNG pour compat viewers PDF)
- Liens cliquables conservés (pour version numérique)

## Partage web

- Route publique `/r/:slug` — pas d'auth
- Check `reports.share_expires_at` — si dépassé, 410 Gone avec message "Ce rapport n'est plus disponible"
- Rate limit : 60 req/min/IP (voir `security.md`)
- Ne pas exposer `org_id`, seulement le contenu brand-less (ou brand agence partenaire)

## Tests de cohérence

Avant chaque envoi client, checklist auto :
- [ ] Aucune variable `{{...}}` restante dans le HTML final
- [ ] Score total cohérent avec somme breakdown
- [ ] Au moins 1 quick win listée
- [ ] Roadmap 90j a 3 sprints avec au moins 1 action chacun
- [ ] Lien de partage fonctionne (HEAD request returns 200)
- [ ] PDF < 10 MB
