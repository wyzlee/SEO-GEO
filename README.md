# SEO-GEO

> App SaaS d'audit SEO & GEO (Generative Engine Optimization) conçue pour 2026. Format Wyzlee.
> **Cible** : `seo-geo-orcin.vercel.app`.

## Qu'est-ce que c'est

Le marché de la recherche a basculé. 40 % des requêtes d'information démarrent désormais en interface IA (ChatGPT, Claude, Perplexity, Gemini, Copilot) plutôt que sur Google. GPTBot fait 3,6× plus de requêtes que Googlebot. La demi-vie d'une citation IA est passée à 3-6 mois.

Les outils SEO classiques (Ahrefs, Semrush) couvrent mal ces nouveaux signaux — `llms.txt`, AI bots crawlers, entity knowledge graph, semantic completeness, E-E-A-T, INP, freshness half-life.

**SEO-GEO** audite un site (URL live ou code source) en 11 phases alignées avec les standards 2026, produit un scoring 100 points, et livre un rapport white-label en français actionnable au client.

## Modèle commercial

**V1 — Agency tool** : je lance les audits depuis le dashboard interne, le client reçoit un rapport white-label (web + PDF).

**V2 — Self-serve SaaS** : signup public, Stripe, plans freemium / pro / agence.

Architecture multi-tenant dès V1 pour ne pas refactorer plus tard.

## Structure du repo

```
SEO-GEO/
├── CLAUDE.md                    # Règles projet, Golden Stack, conventions
├── README.md                    # Ce fichier
├── parallel-chasing-corbato.md  # Spec source narrative détaillée (domaine SEO/GEO 2026)
├── .claude/
│   ├── commands/                # 8 slash commands de dev
│   ├── agents/                  # 5 sous-agents spécialisés
│   └── docs/                    # 10 docs architecture + domaine
└── (app Next.js 16 à venir Sprint 01 via /scaffold-wyz)
```

## Stack (Golden Stack Wyzlee)

Next.js 16 + React 19 (Server Components par défaut), Stack Auth (SSO Wyzlee), Neon Postgres (HTTP driver), Drizzle ORM, Tailwind v4, design Cabinet Grotesk + Fira Code. Détails dans `CLAUDE.md`.

## Par où commencer

1. **Lire** `CLAUDE.md` (règles projet, 5 min)
2. **Consulter** `.claude/docs/product-vision.md` pour le pitch et personas
3. **Consulter** `.claude/docs/mvp-roadmap.md` pour les sprints
4. **Consulter** `.claude/docs/architecture.md` pour le design système
5. Au Sprint 01 : lancer `/scaffold-wyz` pour bootstrap l'app Next.js

## Packages commerciaux

| Offre | Prix indicatif | Livrable |
|-------|----------------|----------|
| Tripwire Audit | 1 500-3 500 € | Audit + debrief 1h, 3-5 jours |
| Retainer Starter | 2 500-3 500 €/mois | Audit trimestriel + 2-4 refresh/mois |
| Retainer Growth | 5 000-7 500 €/mois | Starter + pillar content + entity building |
| Retainer Enterprise | 10 000-15 000 €/mois | Growth + content prod + link building |
| SEO+GEO Add-on | +25 % sur retainer existant | Layer GEO pour agences tierces |
| White-label | Wholesale -40 à -60 % | Exécution sous marque agence tierce |

Détails : `.claude/docs/product-vision.md`.

## Sources

Toutes les stats citées dans le projet traces vers `.claude/docs/sources.md` (URL + date de consultation). Cadence de refresh : trimestrielle via `/refresh-sources`.

## Contact

Olivier Duvernay — CEO Wyzlee.
