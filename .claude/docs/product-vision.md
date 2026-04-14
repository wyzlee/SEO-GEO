# Product Vision — SEO-GEO

## Pitch

Une app SaaS d'audit SEO/GEO (Generative Engine Optimization) conçue pour 2026 : elle évalue la visibilité d'un site **à la fois dans Google et dans les moteurs IA** (ChatGPT Search, Claude, Perplexity, Gemini, Copilot), et livre un rapport actionnable en français au client.

Le marché a basculé : 40 % des requêtes d'info démarrent en IA, GPTBot fait 3,6× plus de requêtes que Googlebot, la demi-vie de citation IA est passée à 3-6 mois. Les outils SEO classiques (Ahrefs, Semrush) couvrent mal ces signaux. SEO-GEO comble le gap.

## Personas cibles

1. **Agence SEO** (5-30 personnes) — veut ajouter une offre GEO à son retainer sans recruter. White-label possible.
2. **Directeur marketing B2B SaaS** — voit son trafic organique baisser, veut savoir pourquoi et comment compenser via l'IA.
3. **Studio dev / freelance** — veut auditer un site AVANT release (upload du code) pour livrer un asset mieux foutu à son client.

## Proposition de valeur

- Un audit en 11 phases (technical, structured data, GEO, entity, E-E-A-T, freshness, international, CWV, topical, common mistakes, synthesis) — scoring 100pt.
- Input flexible : URL live OU upload de code (zip / GitHub connect).
- Rapport white-label FR jargon-free, livré en web + PDF.
- Benchmarks chiffrés sourcés (stats consultées, datées, rafraîchies trimestriellement).

## Modèle commercial — hybride progressif

**V1 — Agency tool** (Olivier + early partners) :
- Olivier (ou un partenaire agence) lance les audits depuis le dashboard interne.
- Client reçoit un rapport white-label (web + PDF) sans accès direct à l'app.
- Pricing à la prestation (tripwire audit, retainer).

**V2 — Self-serve SaaS** :
- Signup public, onboarding automatisé, Stripe.
- Plans tarifaires SaaS (freemium → pro → agence).
- Dashboard client avec historique, comparaison, tracking KPI continu.

Schéma multi-tenant dès V1 pour ne pas refactorer plus tard.

## Packages commerciaux (repris de `parallel-chasing-corbato.md`)

| Offre | Prix indicatif | Livrable | Timeline | Remarques |
|-------|----------------|----------|----------|-----------|
| **Tripwire Audit** | 1 500-3 500 € one-shot | Audit complet + debrief 1h | 3-5 jours | Taux conversion visé 35 % vers retainer |
| **Retainer Starter** | 2 500-3 500 €/mois | Audit trimestriel + 2-4 refresh/mois + reporting mensuel | Engagement 3 mois | — |
| **Retainer Growth** | 5 000-7 500 €/mois | Starter + pillar content + entity building + AI visibility tracking | Engagement 6 mois | — |
| **Retainer Enterprise** | 10 000-15 000 €/mois | Growth + content prod (4-8 pieces/mois) + link building + conseil stratégique | Engagement 12 mois | — |
| **SEO+GEO Add-on** | +25 % sur retainer SEO existant | Layer GEO pour agences tierces | — | — |
| **White-label Delivery** | Wholesale -40 à -60 % | Exécution sous marque agence tierce | Variable | — |

## Différenciation

- **Audit en 11 phases alignées 2026** (GEO, AI bots, llms.txt, entity, E-E-A-T, INP) — pas juste du SEO classique rebrandé.
- **Dual input** (URL + code) — rare chez les concurrents, permet audits pre-launch.
- **Benchmarks sourcés datés** — toutes les stats du rapport traçables à une URL consultée.
- **White-label natif** — le format du rapport est neutre, branding facile.

## Out of scope MVP

- Génération automatique de contenu (on audite, on prescrit ; l'exécution éditoriale reste manuelle)
- Intégrations outils externes profondes (Peec, Semrush, Ahrefs, Profound) — recommandations seulement, pas d'API wiring
- Tracking dashboard continu avec alertes — V2+
- Marketplace de consultants / freelances — hors scope

## Métriques de succès V1

- ≥ 10 audits livrés en 90 jours
- ≥ 3 conversions tripwire → retainer
- CSAT ≥ 4.3/5 sur rapports livrés
- Temps moyen de génération d'un audit URL < 10 min
- Zéro faux positif critique dans les 10 premiers audits (validé par revue humaine Olivier)

## Métriques de succès V2 (self-serve)

- ≥ 50 signups/mois
- ≥ 10 % conversion freemium → pro
- Taux de rebond dashboard < 40 %
- Temps d'onboarding (signup → premier audit) < 5 min
