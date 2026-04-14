# Refonte `/seo-check` & Lancement agence SEO / GEO

## Contexte

La commande `/seo-check` a été écrite en février 2025. Depuis, le marché a basculé :

- **40 % des requêtes d'information démarrent désormais dans une interface IA** (Gartner, janvier 2026) et non plus sur Google. AI Overviews sont présents sur ~48 % des requêtes trackées (vs 31 % un an avant).
- **Gartner projette -25 % de trafic organique** sur les sites commerciaux d'ici fin 2026, absorbé par ChatGPT, Perplexity, Gemini et Copilot.
- **GPTBot fait 3,6× plus de requêtes que Googlebot** depuis mai 2025 (données Cloudflare).
- La **citation AI a une demi-vie de 3-6 mois** (vs 12-18 mois avant) : 76,4 % des pages citées par ChatGPT ont été mises à jour dans les 30 derniers jours.
- **llms.txt** (proposé par Jeremy Howard, Answer.AI, sept. 2024) est adopté par Anthropic, Cursor, Mintlify — 844 000+ sites déployés selon BuiltWith.
- **FAQPage schema** a été déprécié par Google pour la plupart des sites en 2023 (encore utile pour l'IA mais ne génère plus de rich results).
- **INP a remplacé FID** dans les Core Web Vitals (mars 2024, seuil 200 ms). 43 % des sites échouent encore.
- **WCAG 2.2** est la nouvelle baseline d'accessibilité (octobre 2023), alignée avec les signaux E-E-A-T.

La commande actuelle couvre bien les bases SEO techniques de 2024 mais **manque 8 piliers majeurs de 2026** (détails ci-dessous). Au-delà de la mise à jour, Olivier veut **monter une agence SEO/GEO** : il faut donc transformer l'outil personnel en infrastructure d'agence (templates clients, agents spécialisés, offres, pricing).

**Double objectif du plan** :
1. **Techniquement** : refondre `/seo-check` pour être au niveau 2026 (GEO, AEO, Entity SEO, E-E-A-T, llms.txt, AI bots…).
2. **Commercialement** : transformer le dossier vide `~/Developer/Chloe/SEO-GEO/` en **hub d'agence** avec skills, agents, templates clients, et packaging des offres (tripwire audit, retainer, SEO+GEO add-on, white-label).

---

## Décisions de cadrage validées

- **Architecture** : Pattern 2-phases type `full-analysis` → `/seo-check` (audit) puis `/seo-check-phase2` (assets agence).
- **Scope cible** : Audit codebase local ET URL publique (via WebFetch). Indispensable pour auditer un prospect sans accès au repo.
- **Livrables** : Rapports techniques en `.md` + templates clients en FR, stockés séparément (audit dans `.claude/seo-plan/`, agence dans `~/Developer/Chloe/SEO-GEO/`).

---

## Les 8 gaps critiques de la commande actuelle

| # | Gap | Impact 2026 | Phase concernée |
|---|---|---|---|
| 1 | **Aucune mention de `llms.txt` / `llms-full.txt`** | Standard émergent adopté par Anthropic. Avantage compétitif immédiat. | Phase 3 GEO |
| 2 | **robots.txt ne liste pas les AI bots** (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, OAI-SearchBot, ChatGPT-User) | Invisible dans ChatGPT/Claude/Perplexity si bots bloqués par erreur. 3,6× plus de trafic bot IA que SEO. | Phase 3 GEO |
| 3 | **Entity SEO absent** (sameAs Wikidata, Wikipedia, Knowledge Graph) | Fondation de toute citation IA. Schema markup 3,2× plus efficace sur sites avec entités cohérentes. | Phase 4 Entity |
| 4 | **Content freshness basique** (`lastmod` seulement) | 50 % des citations Perplexity viennent de contenus <13 semaines. Cycle de rafraîchissement 7-14 jours critique. | Phase 6 Freshness |
| 5 | **Semantic completeness non évaluée** | Passages de 134-167 mots auto-suffisants = 4,2× plus de citations IA. #1 ranking factor AI Overviews. | Phase 3 GEO |
| 6 | **FAQPage recommandé comme générateur de rich results** | Déprécié pour 99 % des sites depuis 2023. Nuance nécessaire (utile pour IA, pas pour SERP). | Phase 2 Structured Data |
| 7 | **E-E-A-T signals non audités en code** (author bio, byline, credentials, `Person` schema, dateModified visible) | Ranking factor majeur AI Overviews. +132 % visibilité quand citations autoritaires présentes. | Phase 5 E-E-A-T |
| 8 | **INP ignoré, FID encore mentionné implicitement** | INP = nouveau CWV depuis mars 2024, 43 % des sites échouent. | Phase 8 Performance |

**Gaps secondaires** : rendering strategy (SSR vs SPA non évalué), topical authority (pillar/cluster), multimodal content, AI visibility measurement (mention rate / citation rate), WCAG 2.2 alignement.

---

## Architecture cible

```
~/.claude/commands/
  seo-check.md              ← REFONTE COMPLÈTE (Phase 1 : audit)
  seo-check-phase2.md       ← NOUVEAU (Phase 2 : assets agence)

~/Developer/Chloe/SEO-GEO/   ← HUB AGENCE (rempli par /seo-check-phase2)
  README.md
  skills/
    seo-technical-2026.md
    geo-ai-optimization.md
    entity-seo-knowledge-graph.md
    ai-bot-crawlers.md
    content-freshness-ai.md
    structured-data-2026.md
    international-seo.md
    performance-core-web-vitals-2026.md
    eeat-signals.md
    topical-authority.md
  agents/
    seo-auditor.md
    geo-specialist.md
    content-strategist.md
    schema-architect.md
    entity-researcher.md
    report-generator.md
  templates/
    client-audit-report.md
    proposal-commercial.md
    pricing-packages.md
    sow-template.md
    monthly-retainer-report.md
    onboarding-questionnaire.md
  benchmarks/
    2026-ranking-factors.md
    ai-citation-stats.md
    industry-benchmarks.md
  playbooks/
    onboarding-client.md
    geo-launch-30-60-90.md
    content-refresh-flywheel.md
    quick-win-tripwire-audit.md
  sources.md                 # toutes les URLs consultées, organisées

<projet audité>/.claude/seo-plan/   ← SORTIE DE /seo-check
  audit-technical.md
  audit-structured-data.md
  audit-geo.md
  audit-entity.md
  audit-eeat.md
  audit-content-freshness.md
  audit-international.md
  audit-performance.md
  audit-topical-authority.md
  audit-ai-visibility.md
  critical-issues.md
  quick-wins.md
  roadmap.md
  executive-summary.md
  client-report.md           # version client-ready (si flag --client)
```

---

## Phase 1 — Refonte de `/seo-check`

Fichier : `~/.claude/commands/seo-check.md`. On **réécrit entièrement** (pas d'édit incrémental — les fondations ont changé).

### Usage étendu

```
/seo-check                          # audit codebase local courant
/seo-check <url>                    # audit URL publique (mode agence)
/seo-check <path/to/file>           # audit d'un fichier précis
/seo-check <url-or-path> --client   # génère aussi un rapport client-ready FR
/seo-check <url-or-path> --quick    # tripwire audit, top 10 issues seulement
```

### Détection du mode (Phase 0 — Discovery)

- Si l'argument matche `^https?://` → **Mode URL** : WebFetch pour HTML rendu + WebFetch pour `/robots.txt`, `/sitemap.xml`, `/llms.txt`, `/manifest.json`. Pas d'accès au code source.
- Si l'argument matche un chemin local ou rien → **Mode Codebase** : Glob / Grep sur le projet. Meta dynamique évalué statiquement (react-helmet, next/head, useDocumentMeta…).
- Détection du stack : React SPA (Vite), Next.js (pages/app router), Nuxt, Remix, Astro, static HTML. Adapte les checks au stack.

### Phases 1-11 (nouvelle structure)

**Phase 1 — Technical SEO** (existant, remis au propre)
- Title (50-60 chars, keyword near start), meta description (150-160 chars), canonical, `<html lang>`, viewport, charset, favicon, apple-touch-icon.
- **Retirer** `<meta keywords>` du scoring (Google l'ignore depuis 2009, présence neutre).
- Open Graph + Twitter Cards (inchangé, en améliorant les tests d'URL absolue).
- Sitemap.xml : vérifier `hreflang` inter-locales, `lastmod` cohérent avec Git / fichiers.
- Robots.txt : checks standards **+ Phase 3 AI bots**.

**Phase 2 — Structured Data 2026** (refondu)
- `WebApplication` / `SoftwareApplication` : `featureList` (>10 features, détaillées), `offers`, `applicationCategory`, `operatingSystem`, `screenshot`, `aggregateRating` si reviews.
- `Organization` : `name`, `url`, `logo`, `sameAs` obligatoire avec **minimum 5 profils** (LinkedIn, Twitter/X, GitHub, Wikidata si existe, Crunchbase).
- `Person` schema pour les auteurs/fondateurs (lié via `Article.author` et `Organization.founder`).
- `BreadcrumbList` sur toutes les pages internes.
- `Article` / `BlogPosting` : `headline`, `datePublished`, `dateModified`, `author` (Person), `publisher` (Organization), `image`, `mainEntityOfPage`.
- `HowTo` sur tutoriels (numbered steps, ~50 mots/step, `supply`, `tool`, `totalTime`).
- `FAQPage` : **flag jaune** — utile pour parsing IA mais ne génère plus de rich results (sauf gov/health). Pas de déduction de points si absent.
- Validation schema.org via regex de structure + warn sur les champs manquants obligatoires.
- **NOUVEAU** : Schema stacking check (plusieurs @graph nodes sur une même page pour couvrir Organization + WebSite + WebPage + Article + BreadcrumbList).

**Phase 3 — GEO Readiness (NOUVEAU)**
- **`llms.txt`** : vérifier présence à `/llms.txt`, format Markdown valide (# title, > description, sections avec liens), présence recommandée de `/llms-full.txt` pour docs.
- **`robots.txt` — AI bots**. Vérifier que ces User-agents ne sont pas bloqués par erreur :
  - `GPTBot` (OpenAI, training)
  - `OAI-SearchBot` (OpenAI ChatGPT Search)
  - `ChatGPT-User` (browsing utilisateur)
  - `ClaudeBot` (Anthropic, training)
  - `Claude-User` / `Claude-SearchBot` (Anthropic browsing/search)
  - `PerplexityBot` (Perplexity crawl)
  - `Perplexity-User` (browsing)
  - `Google-Extended` (Gemini training, distinct de Googlebot)
  - `Amazonbot`, `Applebot-Extended`, `Meta-ExternalAgent`, `Bytespider`, `CCBot`
  - Recommander politique opt-in (autoriser les search/user bots, décider cas par cas pour les training bots).
- **Semantic completeness** : détecter les pages qui ouvrent sur une définition auto-suffisante (first paragraph 134-167 mots qui répond à "c'est quoi ?"). Scoring sur 10.
- **Answer block patterns** : H2 en question (qui/quoi/comment/pourquoi) + réponse courte sous le heading + détail après.
- **Listicle structure** : détecter numbered rankings, comparison tables — formats préférés par AI.
- **Evidence density** : stats, pourcentages, citations autoritaires, sources datées dans le contenu.
- **Autoritative tone** : flag les formules hedging ("pourrait peut-être", "il semble que", "on pourrait dire").

**Phase 4 — Entity SEO (NOUVEAU)**
- Cohérence du nom de marque : même orthographe partout (title, schema, OG, footer, canonical host).
- `Organization.sameAs` : audit qualité des profils (doit inclure Wikidata/Wikipedia si existent, sinon recommander de les créer).
- Recherche Wikidata/Wikipedia de l'entité (via WebFetch `wikidata.org/w/index.php?search=...`) en mode URL. Recommande création si absente.
- Entity linking interne : mentions de noms propres (dirigeants, produits, concepts) ont un lien vers une page explicative.
- `WebSite` schema avec `SearchAction` (potentialAction sitelinks searchbox).

**Phase 5 — E-E-A-T Signals (NOUVEAU)**
- **Experience** : contenus datés, auteurs identifiés, screenshots de l'outil réel, case studies.
- **Expertise** : bios d'auteur (nom + titre + lien Person schema), credentials visibles, publication dans des directories pro.
- **Authoritativeness** : backlinks implicites via mentions (à scanner uniquement si mode URL via backlink tool recommendation), citations de sources autoritaires dans le contenu.
- **Trust** : HTTPS obligatoire, page About/Contact/Legal présentes, mentions légales, privacy policy, ToS, coordonnées vérifiables, trust badges (ISO, SOC2, RGPD si applicable).
- Check **dates visibles** : `datePublished` + `dateModified` affichés au lecteur (pas seulement dans JSON-LD).
- Author `Person` schema : `name`, `url` (page auteur), `jobTitle`, `sameAs` (LinkedIn, Twitter), `knowsAbout`.

**Phase 6 — Content Freshness (NOUVEAU, remplace 5.4)**
- Détecter les pages "evergreen" (guides, pillar pages) vs "temporal" (news, releases).
- Age des contenus (via `dateModified` dans schema, `lastmod` sitemap, ou date Git si codebase).
- Recommander cadence par type : 7-14 jours pour pages stratégiques GEO, 30 jours pour produit, 90 jours pour blog, 180-365 pour evergreen.
- Flag les pages sans `dateModified` visible (invisible au freshness scoring IA).
- Détecter les "phantom refreshes" (date changée sans contenu modifié — mauvaise pratique).

**Phase 7 — International SEO** (inchangé, nettoyé)
- hreflang bidirectionnel, x-default, `og:locale:alternate`, URL strategy (subdir preferred sur ccTLD pour consolidation d'autorité), complétude traductions.
- Check erreurs hreflang courantes (75 % des impl. contiennent au moins une erreur).

**Phase 8 — Performance (Core Web Vitals 2026)**
- **LCP** ≤ 2,5 s (inchangé).
- **INP** ≤ 200 ms (**NOUVEAU**, remplace FID). Statique : détecter event handlers lourds, long tasks potentielles, re-renders React excessifs.
- **CLS** ≤ 0,1 (inchangé). Détecter images sans dimensions, fonts sans `font-display`, injection tardive.
- Rendering strategy : SPA sans SSR/prerender → **WARN** (secondary indexing queue, INP affecté, GPTBot rend peu).
- HashRouter détecté → **FAIL** critique (toutes routes = 1 page pour les crawlers).
- Images modernes (WebP/AVIF), lazy loading below-the-fold, preconnect, font preload, script `async`/`defer`.

**Phase 9 — Topical Authority (NOUVEAU)**
- Pillar pages détectées ? (3 000-5 000 mots, coverage large d'un thème).
- Cluster pages linkées vers pillar avec anchor text contenant le keyword du pillar.
- Internal linking : ratio liens internes / externes, pages orphelines.
- Anchor text : diversité, descriptif (jamais "click here"), évite la sur-optimisation exacte.

**Phase 10 — AI Visibility Measurement (NOUVEAU, mode URL uniquement)**
- Test léger via WebFetch vers Perplexity pages publiques (résultats indicatifs, pas exhaustifs).
- Recommander outils pro pour mesure en continu : Peec AI, Semrush AI Visibility Toolkit, Ahrefs Brand Radar, Profound, Otterly, AthenaHQ.
- Définir les 3 KPI GEO à tracker : **Mention Rate** (% réponses IA citant la marque), **Citation Rate** (% avec lien cliquable), **Position** (rang quand cité).

**Phase 11 — Common Mistakes** (existant, étendu)
- Ajout : `noindex` sur pages publiques, JS-only rendering sans SSR, mixed content, redirect chains, external links sans `rel="noopener noreferrer"`, schema orphan (déclaré mais pas visible dans HTML), canonical incohérent.

### Scoring (refondu, total sur 100)

| Catégorie | Max | Notes |
|---|---|---|
| Technical SEO | 12 | baseline propre |
| Structured Data 2026 | 15 | +3 vs actuel, enjeu central |
| **GEO Readiness** | **18** | NOUVEAU, poids le plus lourd |
| **Entity SEO** | **10** | NOUVEAU |
| **E-E-A-T Signals** | **10** | NOUVEAU |
| **Content Freshness** | **8** | NOUVEAU |
| International SEO | 8 | (redistribué si single-lang) |
| Performance CWV 2026 | 8 | INP prioritaire |
| **Topical Authority** | **6** | NOUVEAU |
| Common Mistakes | 5 | inchangé |

Si single-lang : les 8 pts International sont redistribués vers GEO (+3), Entity (+3), E-E-A-T (+2).

### Livrables écrits par `/seo-check`

Dans `<projet>/.claude/seo-plan/` (à créer) :
- `audit-technical.md`, `audit-structured-data.md`, `audit-geo.md`, `audit-entity.md`, `audit-eeat.md`, `audit-content-freshness.md`, `audit-international.md`, `audit-performance.md`, `audit-topical-authority.md`, `audit-ai-visibility.md`
- `critical-issues.md` — top 10 à corriger en priorité
- `quick-wins.md` — <1h d'effort chacune
- `roadmap.md` — Sprint 1 (quick wins), Sprint 2 (structurant), Sprint 3 (stratégique)
- `executive-summary.md` — 10 lignes max
- `client-report.md` — (si flag `--client`) version FR narrative, sans jargon dev, prête à envoyer. Inclut SWOT, opportunités business, proposition commerciale générique.
- `sources.md` — URLs des benchmarks 2026 utilisées

### Règles Phase 1

- **READ-ONLY sur le code source**. Peut créer `<projet>/.claude/seo-plan/*`.
- Adapte les checks au stack détecté (React SPA ≠ Next.js ≠ Astro).
- Chaque recommandation : fichier + ligne + exemple de fix.
- FR pour les documents client-facing, EN pour les identifiants techniques.
- Sauve chaque fichier dès qu'il est produit (contexte peut saturer sur gros sites).

---

## Phase 2 — `/seo-check-phase2` : création du hub d'agence

Fichier : `~/.claude/commands/seo-check-phase2.md`.

### Prérequis

La Phase 1 doit avoir tourné au moins une fois sur un projet de référence (pour pouvoir calibrer les templates avec du vrai contenu). La commande vérifie la présence de `.claude/seo-plan/` dans le projet courant OU utilise les benchmarks génériques si absent.

### Étapes d'exécution

**Étape A — Création du hub `~/Developer/Chloe/SEO-GEO/`**

```
SEO-GEO/
  README.md                          # manifeste de l'agence
  skills/                            # 10 skills FR
  agents/                            # 6 agents spécialisés
  templates/                         # 6 templates client
  benchmarks/                        # 3 docs de référence figés
  playbooks/                         # 4 playbooks opérationnels
  sources.md                         # toutes les URLs utilisées
```

**Étape B — Skills (10 fichiers dans `skills/`)**

Chacun doit être autosuffisant, sourcé, et datable. Contient : définition, pourquoi ça compte en 2026, checks à faire, signaux positifs/négatifs, benchmarks chiffrés, outils recommandés, sources URLs.

1. `seo-technical-2026.md` — Baseline propre 2026 (ce qui reste vrai, ce qui a changé).
2. `geo-ai-optimization.md` — GEO / AEO, llms.txt, AI bots, semantic completeness, listicles, answer blocks.
3. `entity-seo-knowledge-graph.md` — Wikidata, Wikipedia, sameAs, entity consistency, Knowledge Graph.
4. `ai-bot-crawlers.md` — Liste exhaustive des bots, différences training vs search, politique opt-in recommandée.
5. `content-freshness-ai.md` — Demi-vie de citation, cadence par type, refresh flywheel.
6. `structured-data-2026.md` — Schemas actifs vs dépréciés, stacking, schema-dts, validation.
7. `international-seo.md` — hreflang, x-default, ccTLD vs subdir, transcreation.
8. `performance-core-web-vitals-2026.md` — LCP, INP, CLS seuils 2026 + techniques de fix.
9. `eeat-signals.md` — Experience/Expertise/Authoritativeness/Trust : signaux code + signaux éditoriaux.
10. `topical-authority.md` — Pillar + cluster, semantic SEO, internal linking strategy.

**Étape C — Agents (6 fichiers dans `agents/`)**

Chacun : description, allowed_tools restrictif, system prompt référencant les skills, instructions spécifiques.

1. `seo-auditor.md` — Lance les phases 1, 2, 7, 8, 11 de l'audit. Read-only.
2. `geo-specialist.md` — Phases 3, 6, 10. Read-only sauf sur `.claude/seo-plan/`.
3. `entity-researcher.md` — Phase 4 + recherches Wikidata/Wikipedia. Accès WebFetch/WebSearch.
4. `content-strategist.md` — Phases 6, 9. Produit plans éditoriaux, calendriers de refresh.
5. `schema-architect.md` — Génère du JSON-LD custom propre pour un projet donné.
6. `report-generator.md` — Assemble le `client-report.md` à partir des audits phase-par-phase.

**Étape D — Templates client (6 fichiers dans `templates/`)**

Tous en français, ton pro mais direct, 0 blabla. Variables en `{{snake_case}}`.

1. `client-audit-report.md` — Rapport narratif client (exec summary + SWOT + opportunités chiffrées + roadmap 30-60-90). ~15 pages.
2. `proposal-commercial.md` — Proposition commerciale pour une prestation (contexte, diagnostic, recommandations, packages, pricing, next steps).
3. `pricing-packages.md` — Offres agence (détail ci-dessous).
4. `sow-template.md` — Statement of Work pour un retainer (livrables mensuels, KPI, gouvernance, clauses).
5. `monthly-retainer-report.md` — Rapport mensuel pour un client en retainer (KPI Mention Rate / Citation Rate / Position, actions menées, résultats, next month).
6. `onboarding-questionnaire.md` — Questionnaire prospect (20-30 questions : objectifs, concurrents, contenus existants, accès, deadlines).

**Étape E — Benchmarks (3 fichiers dans `benchmarks/`)**

Snapshots chiffrés datables, à rafraîchir trimestriellement.

1. `2026-ranking-factors.md` — Tous les chiffres-clés : 48 % AI Overviews, 40 % requêtes IA, +132 % visibilité citations, INP 43 % échec, etc.
2. `ai-citation-stats.md` — 76,4 % citations <30j, demi-vie 3-6 mois, 5-15 % adoption llms.txt, 844k+ sites.
3. `industry-benchmarks.md` — Benchmarks CWV, E-E-A-T, freshness cadence par secteur (SaaS, e-commerce, media, services).

**Étape F — Playbooks (4 fichiers dans `playbooks/`)**

Opérationnels, séquentiels, reproductibles.

1. `onboarding-client.md` — De la signature au kick-off (7 jours, 12 étapes : accès, audit baseline, KPI, cadence de reporting…).
2. `geo-launch-30-60-90.md` — Plan 90 jours pour un lancement GEO (mois 1 foundation, mois 2 content sprint, mois 3 amplification + mesure).
3. `content-refresh-flywheel.md` — Processus de refresh mensuel (identification des pages déclinantes, priorisation, refresh, re-indexation, mesure).
4. `quick-win-tripwire-audit.md` — Processus de livraison d'un tripwire audit (2-5 jours, 1 500-5 000 €) : scoping, audit, rapport, debrief, conversion en retainer.

**Étape G — Packaging commercial (dans `templates/pricing-packages.md`)**

Structure d'offre alignée avec les données marché 2026 :

| Offre | Prix | Livrable | Timeline | Conversion |
|---|---|---|---|---|
| **Tripwire Audit** | 1 500-3 500 € one-shot | Audit complet (/seo-check --client) + debrief 1h | 3-5 jours | 35 % → Retainer |
| **Retainer Starter** | 2 500-3 500 €/mois | Audit trimestriel + 2-4 refresh/mois + reporting mensuel | Engagement 3 mois | — |
| **Retainer Growth** | 5 000-7 500 €/mois | Starter + pillar content production + entity building + AI visibility tracking (Peec/Semrush) | Engagement 6 mois | — |
| **Retainer Enterprise** | 10 000-15 000 €/mois | Growth + content production (4-8 pieces/mois) + link building + consulting stratégique | Engagement 12 mois | — |
| **SEO+GEO Add-on** | +25 % sur retainer SEO existant | Layer GEO sur retainer SEO client (même agence) | — | White-label friendly |
| **White-label Delivery** | Wholesale -40 à -60 % | Exécution pour agences tierces sous leur marque | Variable | — |

**Étape H — Mise à jour du `README.md` du hub**

Le `README.md` de `~/Developer/Chloe/SEO-GEO/` est le **manifeste de l'agence** : positionnement, offres, process, différenciation, références (quand il y en aura). Sert de brief pour un futur site d'agence.

**Étape I — Status**

Créer `SEO-GEO/STATUS.md` avec état initial : "Hub agence initialisé — Prêt pour premier audit prospect."

### Règles Phase 2

- Tout en français pour les documents client-facing.
- Skills/agents techniques peuvent mélanger FR (intent) + EN (identifiants).
- Chaque fichier autosuffisant — pas d'imports croisés obscurs.
- Chaque stat ou recommandation sourcée (URL dans `sources.md` + référence inline `[^1]`).
- Sauve chaque fichier dès qu'il est produit.
- **Ne touche PAS** au code source d'un projet. Phase 2 écrit uniquement dans `~/Developer/Chloe/SEO-GEO/` et `~/.claude/commands/seo-check-phase2.md`.

---

## Fichiers critiques à créer / modifier

| Fichier | Action | Taille estimée |
|---|---|---|
| `~/.claude/commands/seo-check.md` | Réécriture complète | ~650 lignes |
| `~/.claude/commands/seo-check-phase2.md` | Création | ~350 lignes |
| `~/Developer/Chloe/SEO-GEO/README.md` | Création (via phase2) | ~150 lignes |
| `~/Developer/Chloe/SEO-GEO/skills/*.md` (10) | Création (via phase2) | ~200 lignes chacun |
| `~/Developer/Chloe/SEO-GEO/agents/*.md` (6) | Création (via phase2) | ~100 lignes chacun |
| `~/Developer/Chloe/SEO-GEO/templates/*.md` (6) | Création (via phase2) | ~150 lignes chacun |
| `~/Developer/Chloe/SEO-GEO/benchmarks/*.md` (3) | Création (via phase2) | ~120 lignes chacun |
| `~/Developer/Chloe/SEO-GEO/playbooks/*.md` (4) | Création (via phase2) | ~200 lignes chacun |
| `~/Developer/Chloe/SEO-GEO/sources.md` | Création (via phase2) | ~100 lignes |

**Total livrable** : 2 commandes + 30 fichiers dans le hub.

---

## Benchmarks sourcés utilisés dans ce plan

(Synthétisés depuis les recherches 2026 ; URLs complètes stockées dans `sources.md` lors de l'exécution.)

- Gartner 2026 : 40 % requêtes en interface IA, -25 % trafic organique projeté.
- Cloudflare mai 2025 : GPTBot 30 % share, Meta-ExternalAgent 19 %, ClaudeBot 5,4 %, 3,6× plus de trafic bot IA que SEO.
- Google AI Overviews : 48 % des requêtes trackées (février 2026), +58 % sur 9 industries.
- Semantic completeness : contenus 8,5/10+ → 4,2× plus cités en AI Overviews.
- Citations autoritaires : +132 % visibilité IA.
- Verification signals : +89 % sélection AI Overviews.
- Freshness : 76,4 % citations ChatGPT <30j, 50 % Perplexity <13 semaines.
- llms.txt : 5-15 % sites, 844k+ déployés (BuiltWith oct 2025), adopté par Anthropic/Cursor.
- INP : 43 % sites échouent le seuil 200 ms.
- Schema markup : 3,2× plus de citations AI si couverture comprehensive.
- Pillar+cluster : +63 % rankings en 90j, +8 points DA.
- Agence GEO : retainers 1 500 € (basic) à 30 000 €+ (enterprise), sweet spot 3 000-10 000 €. SEO+GEO add-on +20-30 %. White-label markup 40-60 %.

---

## Vérification end-to-end

Après exécution de Phase 1 + Phase 2, on peut valider le livrable complet ainsi :

1. **Audit codebase local** — Lancer `/seo-check` sur `~/Developer/wyz-hub/` (repo Wyzlee connu). Vérifier :
   - `.claude/seo-plan/` est créé avec 11+ fichiers.
   - Le score total tombe dans un range réaliste (pas 0, pas 100).
   - Les 8 nouvelles phases produisent chacune des findings spécifiques.
   - `critical-issues.md` contient du concret (fichier:ligne + fix).

2. **Audit URL publique** — Lancer `/seo-check https://wyzlee.com` (ou une autre URL connue). Vérifier :
   - WebFetch réussit sur `/robots.txt`, `/sitemap.xml`, `/llms.txt`.
   - Les phases GEO, Entity, E-E-A-T sortent des résultats sans accès au code.
   - `client-report.md` (avec `--client`) est en FR narratif, client-ready.

3. **Init hub agence** — Lancer `/seo-check-phase2`. Vérifier :
   - `~/Developer/Chloe/SEO-GEO/` contient les 6 sous-dossiers + 30 fichiers.
   - Chaque skill a des sources sourcées.
   - `pricing-packages.md` a les 6 offres avec fourchettes en euros.
   - `README.md` est prêt à servir de brief pour un site d'agence.

4. **Test conversion agence** — Ouvrir `templates/proposal-commercial.md` et vérifier qu'en remplissant les `{{variables}}` avec les findings d'un audit réel (étape 2), le document sort client-ready en <10 min.

5. **Sanity check sources** — Ouvrir `SEO-GEO/sources.md` et vérifier que chaque stat du plan a une URL + date de consultation.

---

## Ordre d'exécution recommandé

1. **Réécriture complète de `~/.claude/commands/seo-check.md`** (Phase 1). C'est le cœur technique — tout le reste s'appuie dessus.
2. **Test sur 1 projet Wyzlee** (local) et **1 URL externe** pour valider que la commande tourne end-to-end.
3. **Création de `~/.claude/commands/seo-check-phase2.md`** (Phase 2).
4. **Exécution de `/seo-check-phase2`** pour peupler `~/Developer/Chloe/SEO-GEO/`.
5. **Audit prospect test** : choisir un prospect réel, lancer `/seo-check <url> --client`, livrer le PDF en <24h. → Première validation commerciale.

## Hors scope explicite

- Pas de site web d'agence (c'est une étape suivante, basée sur le `README.md` du hub).
- Pas d'intégrations outils externes (Peec, Semrush, Ahrefs) dans cette version — on recommande, on ne s'intègre pas. V2.
- Pas de dashboard de tracking — Phase 10 se contente de recommandations outils + KPI à tracker. V2.
- Pas de génération automatique de contenu — on audite et on prescrit, l'exécution éditoriale reste manuelle (ou à faire dans une V2 avec un agent `content-writer`).
