# UI Conventions

> Complément au design system Wyzlee (voir `/Users/olivier/Developer/wyz-hub/.claude/docs/design-system.md`). Ce fichier couvre uniquement les patterns **spécifiques à cette app** (composants audit, layout dashboard).

## Fondations (rappel, source = wyz-hub)

- Fonts : Cabinet Grotesk (display, `--font-display`) / Fira Code (body, `--font-sans`)
- Palette sémantique via CSS vars : `--color-bg`, `--color-bgAlt`, `--color-surface`, `--color-card`, `--color-border`, `--color-text`, `--color-muted`, accents indigo `#4F46E5` / violet `#7C3AED`, statuts `--color-green` / `--color-amber` / `--color-blue` / `--color-red`
- Dark mode via `html.dark`, bg dark `#080C10`
- Transitions : 150ms micro / 200ms focus / 300ms panels
- Touch targets min 44×44px
- Reduced motion respecté

**Interdictions** :
- Classes Tailwind color brutes (`bg-blue-500`, `text-purple-600`) → utiliser les CSS vars sémantiques
- Lib de toast autre que `sonner`
- Override `lucide-react` absent dans `package.json`

## Layout dashboard

```
┌──────────────────────────────────────────────────────────┐
│  ┌─────┐                                                  │
│  │ Side│   ┌───────────────────────────────────────┐     │
│  │ bar │   │  Header (page title + actions)         │     │
│  │     │   ├───────────────────────────────────────┤     │
│  │ 220 │   │                                        │     │
│  │  /  │   │         Main content                   │     │
│  │ 64  │   │                                        │     │
│  │ px  │   │                                        │     │
│  └─────┘   └───────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────┘
```

- Sidebar collapsible : 220px expanded / 64px collapsed, transition 200ms
- Section labels sidebar : Cabinet Grotesk uppercase, `--color-muted`
- Nav items sidebar : Fira Code 13px, active indicator = left border 3px `--color-accent-indigo` + bg subtle
- Header page : Cabinet Grotesk 24px, actions à droite (boutons `.btn-primary` / `.btn-secondary`)

## Composants spécifiques audit

### `<ScoreBadge score={78} />`

Affiche le score global d'un audit.

- Forme : pill rounded-full, 72px diameter
- Couleur de fond selon score :
  - 0-39 : `--color-red` bg + text white
  - 40-59 : `--color-amber` bg + text `#1a1a1a`
  - 60-79 : `--color-blue` bg + text white
  - 80-100 : `--color-green` bg + text white
- Typo : Cabinet Grotesk bold 28px, sous-label "/ 100" Fira Code 12px `--color-muted`
- Animation : count-up de 0 → score au mount (200ms, reduced-motion → instant)

### `<PhaseCard phase={...} />`

Expandable card pour chaque des 11 phases.

```
┌────────────────────────────────────────────────────┐
│ [Icon] Phase 3 — GEO Readiness      15/18  [▾]    │
├────────────────────────────────────────────────────┤
│  (expanded)                                         │
│  ▪ critical  robots.txt bloque GPTBot              │
│  ▪ high      llms.txt absent                        │
│  ▪ medium    H2 ne sont pas des questions          │
│  ...                                                │
└────────────────────────────────────────────────────┘
```

- Icon phase (lucide-react) à gauche, Cabinet Grotesk 14px semibold pour le titre
- Score phase : Fira Code 12px, `X/Y` format, coloré selon ratio (green ≥ 80%, amber 50-80%, red < 50%)
- Expand : chevron à droite, rotate 180° + open body, transition 300ms
- Body : liste findings triés par severity (critical → info)

### `<Finding severity="high" ... />`

Une issue individuelle.

```
┌────────────────────────────────────────────────────┐
│ ● high │  robots.txt bloque GPTBot par erreur      │
│        │  ────────────────────────────────         │
│        │  Votre robots.txt contient `Disallow: /`  │
│        │  pour User-agent: GPTBot...               │
│        │                                            │
│        │  ▸ Recommandation                          │
│        │    Retirer la ligne si vous voulez être   │
│        │    visible dans ChatGPT Search...         │
│        │                                            │
│        │  📍 /robots.txt:3                         │
│        │  Effort : quick (<1h)    Points : -3      │
└────────────────────────────────────────────────────┘
```

- Bullet coloré selon severity :
  - critical : `--color-red`
  - high : `#ff8c00` (orange custom entre amber et red, à ajouter aux vars)
  - medium : `--color-amber`
  - low : `--color-blue`
  - info : `--color-muted`
- Title : Cabinet Grotesk 14px semibold
- Description + recommendation : Fira Code 13px, rendu markdown (`react-markdown` + sanitize)
- Metadata row (location, effort, points) : Fira Code 11px `--color-muted`

### `<ScoreBreakdownChart />`

Barre horizontale segmentée montrant la répartition du score par catégorie.

- 10 segments (Technical 12, Structured 15, GEO 18, Entity 10, E-E-A-T 10, Freshness 8, International 8, CWV 8, Topical 6, Common 5)
- Hauteur 24px, rounded-lg
- Chaque segment : bg opacity 30% pour partie "lost", bg opacity 100% pour partie "gained"
- Tooltip au hover : `{category} : {gained}/{max}`
- Couleurs : rotation indigo/violet/blue, palette sémantique uniquement

## Formulaires

### Input URL

```
┌────────────────────────────────────────────────────┐
│ URL à auditer                                       │
│ ┌────────────────────────────────────────────────┐│
│ │ https://                                        ││
│ └────────────────────────────────────────────────┘│
│   Format attendu : https://exemple.com             │
└────────────────────────────────────────────────────┘
```

- Classe : `.input-modern` (design system)
- Placeholder : "https://"
- Validation Zod côté client (react-hook-form ou équivalent), feedback inline
- Submit button : `.btn-primary`, label "Lancer l'audit", loader inline 3 dots pendant submit

### Upload code (Sprint 06)

- Zone drag-and-drop `.card-premium`
- Glassmorphism subtil au hover
- Progress bar pendant upload (segment coloré indigo)
- Erreurs affichées via `sonner` toast (variant error)

## Feedback utilisateur

- **Succès** : `sonner` toast variant success (bg green, icon check)
- **Erreur** : toast variant error (bg red, icon alert-triangle)
- **Info** : toast variant default (bg surface, icon info)
- **Loading** : jamais de spinner plein-écran pour actions rapides ; pour les actions longues (audit en cours), inline loading dans la card avec progress text

## États vides

Pages sans data (pas d'audits encore) :

```
        [Large illustration SVG]

        Aucun audit pour l'instant
        ────────────────────────

  Lancez votre premier audit pour voir
   les findings et le scoring apparaître ici.

        [ Lancer un audit ]
```

- Illustration : SVG lucide compositif (search + sparkles) ou custom
- Titre : Cabinet Grotesk 18px
- Sous-titre : Fira Code 14px `--color-muted`
- CTA : `.btn-primary`

## Accessibilité

- Labels `<label>` associés à chaque input via `for`/`id`
- `aria-label` sur boutons iconographiques
- Focus rings visibles (not removed)
- Skip link "Aller au contenu" en tête de `layout.tsx`
- Contrastes vérifiés (WCAG 2.2 AA minimum, viser AAA sur text body)
- Icônes décoratives : `aria-hidden="true"`
- Keyboard nav : Tab order logique, Escape ferme modales, Enter submit forms

## Animations et micro-interactions

- Fade-in contenu async : 200ms ease-out
- Stagger lists : 50ms delay incrémental
- Hover boutons : scale 1.02 + shadow subtle, 150ms
- Card expand : height auto transition 300ms (ou Framer Motion si plusieurs)
- Reduced motion : désactiver tout → transition 0.01ms

## Responsive

- Desktop-first car cible B2B (Olivier + agences sur laptops)
- Breakpoints Tailwind standards (`sm` 640, `md` 768, `lg` 1024, `xl` 1280)
- Sidebar : collapsed auto < 1024px, hamburger pour mobile
- Tables findings : scroll horizontal en mobile plutôt que truncate

## Contenu rédactionnel

- FR pour tout ce qui est visible utilisateur
- Ton : direct, professionnel, sans jargon technique (rapports client surtout)
- Terme "audit" préféré à "analyse" pour le produit
- Terme "findings" → traduire "constats" ou "points à améliorer" dans l'UI cliente
- Emojis : bannir dans l'UI (utiliser icônes lucide-react à la place)
