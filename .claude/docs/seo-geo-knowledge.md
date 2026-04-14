# SEO/GEO Knowledge Digest — 2026

> Digest compact du domaine SEO + GEO (Generative Engine Optimization) à date 2026, structuré pour consultation par l'agent `audit-engine` et pour alimenter les prompts de génération de findings.
>
> **Spec longue** : `parallel-chasing-corbato.md` à la racine du repo.
> **Sources** : chaque claim chiffré pointe vers `.claude/docs/sources.md` via `[source-N]`.

## Ce qui a changé en 2026 (vs 2023-2024)

1. **Bascule vers l'IA comme moteur de découverte** — 40 % des requêtes d'information démarrent en interface IA (ChatGPT, Claude, Perplexity, Gemini, Copilot) plutôt que sur Google [source-1]. Gartner projette -25 % de trafic organique d'ici fin 2026 [source-2].

2. **AI Overviews omniprésents** — 48 % des requêtes trackées les déclenchent, vs 31 % un an avant [source-3].

3. **AI crawlers dominent** — GPTBot fait 3,6× plus de requêtes que Googlebot (Cloudflare mai 2025) [source-4]. Distribution : GPTBot 30 %, Meta-ExternalAgent 19 %, ClaudeBot 5,4 %, etc. [source-17]

4. **Demi-vie de citation divisée par 3** — 3-6 mois désormais vs 12-18 mois avant [source-5]. 76,4 % des pages citées par ChatGPT ont été mises à jour dans les 30 derniers jours [source-6]. 50 % des citations Perplexity viennent de contenus < 13 semaines [source-18].

5. **`llms.txt` émergent** — proposé par Jeremy Howard (Answer.AI, sept. 2024) [source-16], déjà 844k+ sites déployés en oct. 2025 [source-7], adopté par Anthropic, Cursor, Mintlify.

6. **FAQPage déprécié** — Google ne génère plus de rich results FAQ pour la plupart des sites depuis 2023 [source-8]. Utile pour parsing IA, inutile pour SERP (sauf gov/health).

7. **INP a remplacé FID** dans Core Web Vitals depuis mars 2024, seuil 200ms [source-9]. 43 % des sites échouent [source-10].

8. **WCAG 2.2** baseline accessibilité depuis oct. 2023 [source-15], aligné avec les signaux E-E-A-T (Trust).

## Les 8 piliers modernes à auditer

### 1. GEO Readiness (18 pts dans le scoring)

Le pilier le plus lourd. Signaux canoniques :

- **`/llms.txt`** présent, format Markdown valide (`# title`, `> description`, sections avec liens). `/llms-full.txt` recommandé pour docs.
- **`robots.txt` — AI bots non bloqués par erreur**. Bots à connaître :
  - OpenAI : `GPTBot` (training), `OAI-SearchBot` (search), `ChatGPT-User` (browsing user)
  - Anthropic : `ClaudeBot` (training), `Claude-User`, `Claude-SearchBot`
  - Perplexity : `PerplexityBot` (crawl), `Perplexity-User` (browsing)
  - Google : `Google-Extended` (Gemini training, distinct de Googlebot)
  - Autres : `Amazonbot`, `Applebot-Extended`, `Meta-ExternalAgent`, `Bytespider`, `CCBot`
  - Politique recommandée : opt-in (autoriser search/user bots, décider cas par cas pour training).
- **Semantic completeness** : premier paragraphe 134-167 mots auto-suffisant répondant à "c'est quoi ?" → 4,2× plus de citations IA [source-13].
- **Answer block patterns** : H2 en question (qui/quoi/comment/pourquoi) + réponse courte sous le heading + détail après.
- **Listicle structure** : numbered rankings, comparison tables — formats préférés par AI.
- **Evidence density** : stats, pourcentages, citations autoritaires, sources datées dans le contenu.
- **Autoritative tone** : flag les formules hedging ("pourrait peut-être", "il semble que", "on pourrait dire").

Failure modes fréquents :
- `/llms.txt` absent (perte compétitive GEO immédiate)
- robots.txt généré par un framework qui bloque `User-agent: *` englobant GPTBot
- Pages qui ouvrent sur des H1 vagues type "Bienvenue sur notre site"
- Contenus qui ouvrent sur CTA marketing avant toute définition

### 2. Structured Data 2026 (15 pts)

- `WebApplication` / `SoftwareApplication` avec `featureList` (>10 features), `offers`, `applicationCategory`, `screenshot`, `aggregateRating`
- `Organization` : `name`, `url`, `logo`, `sameAs` **minimum 5 profils** (LinkedIn, X, GitHub, Wikidata si existe, Crunchbase)
- `Person` pour auteurs/fondateurs (lié via `Article.author`, `Organization.founder`)
- `BreadcrumbList` sur toutes pages internes
- `Article` / `BlogPosting` : `headline`, `datePublished`, `dateModified`, `author`, `publisher`, `image`, `mainEntityOfPage`
- `HowTo` sur tutoriels (numbered steps ~50 mots/step, `supply`, `tool`, `totalTime`)
- `FAQPage` : flag jaune — utile IA, plus de rich results SERP. Pas de déduction si absent.
- **Schema stacking** : plusieurs `@graph` nodes sur une même page pour couvrir Organization + WebSite + WebPage + Article + BreadcrumbList.

Schema markup comprehensive → 3,2× plus de citations AI [source-12].

### 3. Entity SEO (10 pts)

- **Cohérence du nom de marque** : même orthographe partout (title, schema, OG, footer, canonical host).
- **`Organization.sameAs`** avec Wikidata/Wikipedia si existent. Si absent → recommander création entité Wikidata.
- **Entity linking interne** : mentions de noms propres (dirigeants, produits, concepts) ont un lien vers une page explicative.
- **`WebSite` schema avec `SearchAction`** (potentialAction sitelinks searchbox).
- **Wikidata lookup** : en mode URL, WebFetch `wikidata.org/w/index.php?search=<brand>` pour vérifier présence.

Failure mode principal : marque présente partout dans le site mais aucune entité Wikidata → invisible à la consolidation d'identité par les IA.

### 4. E-E-A-T Signals (10 pts)

- **Experience** : contenus datés, auteurs identifiés, screenshots outil réel, case studies.
- **Expertise** : bios d'auteur (nom + titre + `Person` schema), credentials visibles, directories pro.
- **Authoritativeness** : citations de sources autoritaires dans le contenu, backlinks (mentions dans mode URL).
- **Trust** : HTTPS obligatoire, page About/Contact/Legal, mentions légales, privacy policy, ToS, coordonnées vérifiables, trust badges (ISO, SOC2, RGPD).
- **Dates visibles** : `datePublished` + `dateModified` affichés au lecteur (pas seulement dans JSON-LD).
- **Author `Person` schema** : `name`, `url` (page auteur), `jobTitle`, `sameAs` (LinkedIn, X), `knowsAbout`.

Citations autoritaires → +132 % visibilité AI [source-11]. Verification signals → +89 % sélection AI Overviews [source-20].

### 5. Content Freshness (8 pts)

- Age via `dateModified` (schema) / `lastmod` (sitemap) / Git date (code)
- Cadence recommandée par type de contenu :
  - Pages stratégiques GEO (homepage, pillar, landing produit) : **7-14 jours**
  - Pages produit : **30 jours**
  - Blog / articles : **90 jours**
  - Evergreen (guides de référence) : **180-365 jours**
- Flag les pages sans `dateModified` visible → invisibles au freshness scoring IA.
- Détecter "phantom refreshes" : date changée sans contenu modifié (mauvaise pratique).

76,4 % ChatGPT / 50 % Perplexity citent des pages < 30 jours / 13 semaines [source-6][source-18].

### 6. Performance CWV 2026 (8 pts)

- **LCP ≤ 2,5 s** (inchangé)
- **INP ≤ 200 ms** (NOUVEAU depuis mars 2024, remplace FID) [source-9] — statique : détecter event handlers lourds, long tasks, re-renders React excessifs
- **CLS ≤ 0,1** — images sans dimensions, fonts sans `font-display`, injection tardive
- Rendering : SPA sans SSR/prerender → **WARN** (secondary indexing queue, INP affecté, GPTBot rend peu). HashRouter → **FAIL** critique.
- Images modernes (WebP/AVIF), lazy loading below-the-fold, preconnect, font preload, `async`/`defer` scripts.

43 % des sites échouent INP [source-10].

### 7. Topical Authority (6 pts)

- **Pillar pages** détectées (3 000-5 000 mots, coverage large d'un thème)
- **Cluster pages** linkées vers pillar avec anchor text contenant le keyword du pillar
- **Internal linking** : ratio liens internes / externes, pages orphelines
- **Anchor text** : diversité, descriptif (jamais "click here"), évite sur-optimisation exacte

Pillar+cluster → +63 % rankings en 90j, +8 points DA [source-14].

### 8. International SEO (8 pts, redistribués si single-lang)

- **hreflang bidirectionnel**, x-default, `og:locale:alternate`
- URL strategy : subdir > ccTLD pour consolidation d'autorité (sauf contraintes légales locales)
- Complétude traductions (pas de hreflang pointant vers pages non-traduites)
- Erreurs hreflang courantes : 75 % des implémentations en contiennent au moins une [source-19]

Si single-language : les 8 pts sont redistribués → GEO +3, Entity +3, E-E-A-T +2.

## Les autres piliers (secondaires)

- **Technical SEO** (12 pts) — baseline : title (50-60 chars), meta description (150-160), canonical, `<html lang>`, viewport, charset, favicon, OG, Twitter cards, sitemap.xml, robots.txt propre.
- **Common Mistakes** (5 pts) — `noindex` sur pages publiques, JS-only rendering, mixed content, redirect chains, external links sans `rel="noopener noreferrer"`, schema orphan (déclaré mais pas visible dans HTML), canonical incohérent.

## KPIs à tracker post-audit (recommandations client)

3 KPIs GEO à inclure dans les rapports retainer :

- **Mention Rate** — % de réponses IA citant la marque (sur un set de queries benchmarkées)
- **Citation Rate** — % de réponses IA incluant un lien cliquable vers le site
- **Position** — rang quand la marque est citée

Outils recommandés (pas d'intégration V1, juste recommandation) :
- **Peec AI** — GEO analytics
- **Semrush AI Visibility Toolkit**
- **Ahrefs Brand Radar**
- **Profound**, **Otterly**, **AthenaHQ**

## Règles de priorité pour findings

**Severity** :
- `critical` — bloque la visibilité (ex: HashRouter, `Disallow: *` sur tout, HTTPS absent)
- `high` — coûte cher en points scoring (ex: llms.txt absent, pas de `sameAs`, INP > 500ms)
- `medium` — impact mesurable mais pas bloquant (ex: H2 pas en question, dateModified pas visible)
- `low` — quick-win cosmétique (ex: meta description 140 chars au lieu de 155)
- `info` — observation sans action immédiate

**Effort** :
- `quick` — < 1h de dev ou config
- `medium` — < 1 jour (refactor, ajout schema, création page)
- `heavy` — > 1 jour (refonte rendering, Wikidata creation, pillar content production)

## Comment l'agent `audit-engine` utilise ce doc

1. Lit ce fichier au démarrage d'un audit pour rappel des signaux canoniques.
2. Pour chaque phase, combine :
   - Les règles listées ici (signaux à détecter)
   - Le scoring défini dans `audit-engine.md`
   - Les sources citées (via `[source-N]` → `sources.md`)
3. Pour chaque finding généré, inclut severity + effort + points_lost + référence `[source-N]` quand pertinent.
4. Si un signal n'est pas documenté ici ET n'est pas dans `audit-engine.md` → ne pas inventer. Flag pour review humaine.

## Refresh

Ce document doit être rafraîchi **trimestriellement** en même temps que `sources.md` (voir `.claude/commands/refresh-sources.md`). Si un chiffre clé change significativement, mettre à jour la valeur + la source correspondante.
