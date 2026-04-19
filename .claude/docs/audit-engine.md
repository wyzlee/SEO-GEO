# Audit Engine — Spec technique

> Spec de référence pour l'implémentation du moteur d'audit. Chaque phase décrite ici correspond à un module dans `lib/audit/phases/<key>.ts`.
> Knowledge domaine (signaux canoniques, failure modes) : `.claude/docs/seo-geo-knowledge.md`.

## Inputs

```ts
type AuditInput =
  | { type: 'url'; targetUrl: string }
  | { type: 'zip'; extractedPath: string; stack: StackInfo }
  | { type: 'github'; clonedPath: string; stack: StackInfo; repoRef: string }

type StackInfo = {
  framework: 'next-app' | 'next-pages' | 'nuxt' | 'remix' | 'astro' | 'react-spa' | 'static' | 'other'
  hasSSR: boolean
  routerType?: 'history' | 'hash' | null
}
```

## Orchestrateur

Fichier : `lib/audit/engine.ts`.

```ts
export async function runAudit(audit: Audit): Promise<AuditResult> {
  const input = await resolveInput(audit)  // fetch URL OR open code

  const phases: PhaseKey[] = [
    'technical', 'structured_data', 'geo', 'entity',
    'eeat', 'freshness', 'international', 'performance',
    'topical', 'common_mistakes', 'synthesis'
  ]

  let totalScore = 0
  const breakdown: Record<PhaseKey, number> = {} as any

  for (const key of phases) {
    await markPhaseRunning(audit.id, key)
    try {
      const phaseResult = await runPhase(key, input, audit)
      await persistPhaseResult(audit.id, key, phaseResult)
      breakdown[key] = phaseResult.score
      totalScore += phaseResult.score
    } catch (e) {
      await markPhaseFailed(audit.id, key, e)
    }
  }

  await markAuditCompleted(audit.id, totalScore, breakdown)
  return { totalScore, breakdown }
}
```

Sequentiel V1 (simple, coût wall-time acceptable). Parallélisation des phases indépendantes possible V2 (ex: phases 1, 2, 7, 9 peuvent tourner en parallèle ; 3, 4 dépendent du HTML rendu).

## Modes

- `full` — les 11 phases, scoring complet sur 100
- `quick` — tripwire : uniquement les findings `critical` + top 10 par points_lost, sans rapport détaillé
- `--client` (flag au moment de la génération du rapport, pas au moment de l'audit) — active le template de rapport FR jargon-free (voir `report-templates.md`)

## Scoring — rubric 100 pts

| # | Phase (key) | Points max | Poids | Key point |
|---|-------------|-----------|-------|-----------|
| 1 | `technical` | 12 | 12 % | Baseline propre |
| 2 | `structured_data` | 15 | 15 % | Enjeu central 2026 |
| 3 | `geo` | **18** | **18 %** | Poids le plus lourd |
| 4 | `entity` | 10 | 10 % | Fondation citations IA |
| 5 | `eeat` | 10 | 10 % | +132 % visibilité si présent |
| 6 | `freshness` | 8 | 8 % | 76,4 % citations < 30j |
| 7 | `international` | 8 | 8 % | Redistribué si single-lang |
| 8 | `performance` | 8 | 8 % | INP prioritaire |
| 9 | `topical` | 6 | 6 % | Pillar/cluster |
| 10 | `common_mistakes` | 5 | 5 % | Regression guard |
| 11 | `synthesis` | 0 | 0 % | Phase 11 = synthèse, pas de score |
| **Total** | | **100** | | |

Si single-language (détecté par absence de hreflang ou contenus tous en une langue), les 8 pts `international` sont redistribués : `geo` +3, `entity` +3, `eeat` +2.

## Phase 1 — Technical SEO (12 pts)

**Checks** :
- `<title>` : 50-60 chars, keyword tôt (-1 si absent, -2 si > 70 ou < 20)
- `<meta name="description">` : 150-160 chars (-1 si absent, -1 si > 180)
- `<link rel="canonical">` : présent, absolu, cohérent (-2 si incohérent avec URL actuelle)
- `<html lang>` : défini (-1 si absent)
- `<meta name="viewport">` : défini (-1 si absent)
- `<meta charset="utf-8">` : défini
- Favicon, apple-touch-icon présents (-0.5 si absent)
- Open Graph : `og:title`, `og:description`, `og:image` (absolute URL), `og:url`, `og:type` (-1 par champ absent)
- Twitter Cards : `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image` (-0.5 par champ absent)
- `sitemap.xml` : présent à `/sitemap.xml`, bien formé, `lastmod` cohérent (-2 si absent, -1 si vide)
- `robots.txt` : présent, pas de `Disallow: /` global sur le site prod (-3 si bloque tout)
- **Retirer** `<meta keywords>` du scoring (neutre depuis 2009)

**Input type** : URL ou code.

**Output exemple** :
```
score: 9.5/12
findings:
  - severity: high    category: technical-meta     title: "Meta description absente" points_lost: 1
  - severity: medium  category: technical-og       title: "og:image absolu manquant" points_lost: 1
  - severity: low     category: technical-icons    title: "apple-touch-icon absent" points_lost: 0.5
```

## Phase 2 — Structured Data 2026 (15 pts)

**Checks** :
- `Organization` schema (-3 si absent)
  - `name`, `url`, `logo` (-1 chacun si absent)
  - `sameAs` avec ≥ 5 profils (-2 si < 5, -3 si absent)
- `WebSite` schema avec `SearchAction` (-2 si absent)
- `Person` schema sur auteurs articles (-1 par article sans auteur schema)
- `BreadcrumbList` sur pages internes (-1 si absent sur > 50 % des pages internes détectées)
- `Article` / `BlogPosting` complet : `headline`, `datePublished`, `dateModified`, `author`, `publisher`, `image`, `mainEntityOfPage` (-0.5 par champ manquant)
- `HowTo` si tutoriels détectés (-1 si absent sur pages tutoriel)
- `FAQPage` : **flag jaune uniquement** (pas de déduction), note info "utile IA, déprécié SERP"
- **Schema stacking** : ≥ 3 schemas dans `@graph` sur pages stratégiques (-1 si stacking absent sur homepage)
- Validation JSON-LD syntaxique : parser valide, pas d'erreur (-2 si erreur parsing)
- **WebApplication / SoftwareApplication** : détecté si site présente des signaux SaaS (pricing, trial, features) — (-1 si schéma absent)

**Input type** : URL (parse `<script type="application/ld+json">`) ou code (parse JSX/template + extraire).

## Phase 3 — GEO Readiness (18 pts)

**Checks** :
- `/llms.txt` présent (-4 si absent)
  - Format Markdown valide : `# title`, `> description`, sections (-1 si format cassé)
  - `/llms-full.txt` recommandé pour docs (-1 si doc site sans full)
- `robots.txt` — AI bots :
  - Pas de `Disallow: /` pour `GPTBot`, `OAI-SearchBot`, `ChatGPT-User` (-2 chacun si bloqué par erreur)
  - Pas de `Disallow: /` pour `ClaudeBot`, `PerplexityBot`, `Google-Extended` (-2 chacun si bloqué)
  - Total pénalité max AI bots : -6
- **Semantic completeness** (sur homepage + landing pages détectées) :
  - Premier paragraphe 134-167 mots auto-suffisant (-2 si absent sur homepage)
  - Score qualitatif sur 5 échantillons de pages stratégiques
- **Answer block patterns** :
  - ≥ 60 % des H2 formulés en questions (qui/quoi/comment/pourquoi) sur pages éditoriales (-1 sinon)
  - Réponse courte (< 60 mots) sous chaque H2 (-0.5 si absent)
- **Listicle / comparison structure** : présence détectée sur pages produit/comparatif (-1 si contenu comparatif sans structure listicle)
- **Evidence density** : stats, pourcentages, sources datées dans le contenu éditorial (-1 si contenu sans aucune evidence sur pages "pillar")
- **Autoritative tone** : flag les formules hedging ("pourrait peut-être", "il semble que") — note info, pas de déduction

**Input type** : URL (WebFetch robots/llms, HTML rendu pour contenu) ou code (parser les templates/composants pour sémantique).

## Phase 4 — Entity SEO (10 pts)

**Checks** :
- Cohérence nom de marque :
  - Title `<title>`, `og:site_name`, `Organization.name`, footer, canonical host, Twitter `@handle` → même casse et orthographe (-2 si divergence critique)
- `Organization.sameAs` qualité :
  - ≥ 5 profils (-2 si < 5) — couvert aussi Phase 2 mais scoré ici sous angle Entity
  - Wikidata URL si marque trouvable (-2 si Wikidata existe mais pas dans sameAs)
  - Wikipedia URL si article existe (-1)
- Wikidata lookup (URL mode uniquement) :
  - WebFetch `wikidata.org/wiki/Special:Search?search=<brand>` — si entité absente → recommandation "créer entité Wikidata" (info, -1 si marque mature sans entité)
- Entity linking interne :
  - Mentions de noms propres (dirigeants, produits, concepts) linkées vers page explicative (-1 si < 30 %)
- `WebSite` schema avec `SearchAction` (-1 si absent, déjà scoré Phase 2 mais recompté ici)

**Input type** : URL principalement (WebFetch Wikidata). En mode code, focus sur cohérence schema statique.

## Phase 5 — E-E-A-T Signals (10 pts)

**Checks** :
- **Experience** (3 pts) :
  - Contenus datés visibles (-1 si < 50 % pages éditoriales avec date visible)
  - Auteur identifié (nom) sur articles (-1 si < 80 %)
  - Screenshots outil réel ou case studies (-1 si site SaaS sans aucun cas)
- **Expertise** (2 pts) :
  - Author bio avec titre + credentials (-1 si absent)
  - `Person` schema avec `jobTitle`, `sameAs`, `knowsAbout` (-1)
- **Authoritativeness** (2 pts) :
  - Citations de sources autoritaires dans contenu éditorial (-1 si ≥ 50 % articles sans citation)
  - Mentions media / backlinks (URL mode, recommandation outil — info seulement)
- **Trust** (3 pts) :
  - HTTPS obligatoire (-3 critical si HTTP)
  - About / Contact / Legal / Privacy pages présentes (-0.5 par page manquante)
  - Mentions légales, coordonnées vérifiables (-0.5)
  - `datePublished` + `dateModified` visibles lecteur (-1 si absent sur blog)
  - Trust badges (ISO, SOC2, RGPD) si applicable SaaS (info, pas de déduction)
- **Accessibilité WCAG 2.2** (Trust) :
  - Images sans `alt` (-0.5 si > 20 % des images ou ≥ 3 sans alt)
  - Skip link `#main-content` absent (-0.5 low)

**Input type** : URL (HTML rendu) ou code (grep dates, components).

## Phase 6 — Content Freshness (8 pts)

**Checks** :
- Détection type de contenu :
  - Evergreen (guides, pillar) — cadence attendue 180-365j
  - Temporal (news, releases, changelog) — cadence attendue 7-30j
  - Blog standard — cadence attendue 90j
  - Produit / landing — cadence attendue 30j
- Age calculé via :
  - URL mode : `dateModified` JSON-LD > `lastmod` sitemap > HTTP `Last-Modified` header
  - Code mode : Git `log --format=%ci -1 <file>` si repo, sinon `fs.stat` mtime
- Déductions :
  - Page stratégique (homepage, pillar) > 14j sans update → -2
  - Produit > 30j sans update → -1
  - Blog > 90j sans update → -1
  - Evergreen > 365j sans update → -1
  - Page sans `dateModified` visible → -0.5
- **Phantom refresh detection** :
  - `dateModified` récent mais aucun diff significatif sur le contenu visible (HTML hash / content hash) → flag info
- **NUL date dans sitemap lastmod** alors que contenu mis à jour → -1

**Input type** : URL et code (complémentaires).

## Phase 7 — International SEO (8 pts)

**Checks** :
- `hreflang` bidirectionnel (chaque locale pointe vers les autres + elle-même) — 75 % des impl. ont des erreurs [source-19]
  - -2 si hreflang absent sur site multilingue
  - -1 par paire bidirectionnelle cassée (max -3)
- `x-default` défini (-1 si absent sur site multilingue)
- `og:locale` + `og:locale:alternate` (-0.5 si absent)
- URL strategy :
  - Subdir `/fr/`, `/en/` préféré (-1 si ccTLD sans raison légale)
  - Cohérence : pas de mix subdir + subdomain sans raison
- Complétude traductions :
  - Hreflang pointe vers pages effectivement traduites (-2 si hreflang pointe vers 404 ou contenu non-traduit)

Si single-language (pas de hreflang, pas de `lang` multiple détecté) :
- Phase skip, les 8 pts redistribués (`geo` +3, `entity` +3, `eeat` +2)
- Finding info : "Site single-lang — phase skippée, points redistribués sur GEO/Entity/E-E-A-T"

**Input type** : URL ou code (parser templates pour hreflang statique).

## Phase 8 — Performance CWV 2026 (8 pts)

**Checks** :
- **LCP** ≤ 2,5s (-2 si > 2,5s, -3 si > 4s) — mesure via CrUX si URL publique connue, sinon estimation statique via `<img>` first paint, font loading
- **INP** ≤ 200ms (-2 si > 200ms, -3 si > 500ms) — statique : détecter event handlers lourds, long tasks potentielles, re-renders React excessifs
- **CLS** ≤ 0,1 (-2 si > 0,1) — détecter images sans `width`/`height`, fonts sans `font-display: swap`, injection tardive de contenus (ads, chat widgets)
- Rendering strategy :
  - SPA sans SSR/prerender → **WARN** -2 (secondary indexing queue, INP affecté, GPTBot rend peu)
  - HashRouter détecté → **FAIL critical** -3 (toutes routes = 1 page pour crawlers)
- Images modernes WebP/AVIF (-0.5 si toutes en JPG/PNG)
- Lazy loading below-the-fold (-0.5 si absent)
- `preconnect`, font `preload` (-0.5 si absent sur fonts critiques)
- Scripts `async`/`defer` (-0.5 si scripts bloquants en `<head>`)

**Input type** : URL (CrUX / Lighthouse-like analysis si feasible, ou best-effort via HTML) ou code (static analysis rendering + bundle analysis).

## Phase 9 — Topical Authority (6 pts)

**Checks** :
- **Crawl scope** : limité à 50 pages (URL mode) — finding info si ≥ 50 pages crawlées, indique que l'analyse topical est partielle sur les grands sites
- **Pillar pages** détectées (pages 3 000-5 000 mots, coverage large d'un thème) :
  - -2 si aucune pillar sur un site qui le justifie (ex: SaaS avec blog)
- **Cluster pages** linkées vers pillar :
  - -1 si clusters sans lien vers pillar correspondant
  - -1 si anchor text cluster → pillar générique ("cliquez ici")
- **Internal linking** :
  - Ratio liens internes / externes > 4 : 1 (-1 si trop d'externes sur pages édito)
  - Pages orphelines (aucun lien entrant depuis autres pages internes) — -1 si > 10 %
- **Anchor text** :
  - Diversité (pas 80 % du même anchor) (-1 si sur-optimisation)
  - Descriptif (pas "click here", "ici", "voir plus") (-1 si > 20 % anchors génériques)

**Input type** : URL (crawl limité 50 pages) ou code (parse routes + links).

## Phase 10 — Common Mistakes (5 pts)

**Checks** :
- `<meta name="robots" content="noindex">` sur pages publiques (-2 si détecté hors admin)
- JS-only rendering (no SSR fallback) → -1 (recouvrement partiel avec Phase 8)
- Mixed content (http:// inside https://) → -1
- Redirect chains (> 2 redirects pour atteindre canonical) → -1
- External links sans `rel="noopener noreferrer"` (-0.5 si > 30 % des externals)
- Schema orphan (JSON-LD déclaré mais contenu pas visible dans HTML) (-1)
- Canonical incohérent (canonical self-referential ≠ URL réelle) (-1)

**Input type** : URL ou code.

## Phase 11 — Synthesis (0 pts, pas de scoring)

**Output** :
- `critical-issues.md` : top 10 findings triés par (severity desc, points_lost desc)
- `quick-wins.md` : findings avec `effort === 'quick'` triés par points_lost desc
- `roadmap.md` : 3 sprints (Quick Wins, Structurant, Stratégique) basés sur effort × impact
- `executive-summary.md` : ≤ 10 lignes — score total, 3 forces principales, 3 faiblesses principales, 1 recommandation prioritaire

Cette phase ne produit pas de findings. Elle consume les findings des phases 1-10.

## Persistence

Pendant l'audit :
- `audits.status` = `running` dès claim worker
- Pour chaque phase : `audit_phases` row insérée avec `status=running`, puis update `status=completed` + `score` + `summary` à la fin
- Pour chaque finding : insert dans `findings` au fil de l'eau (ne pas accumuler en RAM pour gros audits)
- À la fin : `audits.status` = `completed`, `score_total`, `score_breakdown` (JSON)

Sauvegardes incrémentales pour supporter reprise en cas de crash worker (rarement utile V1, mais architecture compatible).

## Rejet

Conditions de rejet/failure :
- URL inaccessible (DNS error, 5xx persistant 3 tentatives)
- Upload code corrupt (zip invalide, repo GitHub vide)
- Timeout global audit > 15 min → marquer `failed` + `error_message`
- Parsing JSON-LD crash → log error, continuer phases suivantes (pas de fail global)

## Tests

- Tests unitaires par phase : fixtures HTML/code simulées → output attendu
- Tests intégration : audit d'un site test connu (ex: `wyzlee.com`) → score cohérent ± tolérance
- Golden tests : audit 2 fois la même URL → même score

## Évolutions V2

- Parallélisation phases indépendantes (1, 2, 7, 9)
- Cache résultats phases coûteuses (ex: Wikidata lookup)
- Détection auto de signaux émergents (nouveaux schemas, nouveaux bots)
- Moteur de règles pluggable (DSL pour définir checks sans recompile)
