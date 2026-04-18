---
name: ui-components
description: Conventions UI SEO-GEO — design system Wyzlee (Cabinet Grotesk/Fira Code), palette sémantique, composants spécifiques audit (score badge, phase card, findings table), patterns React 19.
type: skill
---

# Skill : ui-components

## Design System Wyzlee (référence)

### Typographie
```css
--font-display: 'Cabinet Grotesk'  /* h1-h6, boutons, labels, nav sections */
--font-sans: 'Fira Code'           /* paragraphes, inputs, nav items, body */
```
- Cabinet Grotesk : local woff2, chargé dans `app/layout.tsx`
- Fira Code : Google Fonts, `display: 'swap'`

### Palette sémantique (JAMAIS les couleurs Tailwind brutes)

```css
/* Fond */
--color-bg: #080C10                /* dark mode base */
--color-surface: #0F1520           /* cards, panels */
--color-surface-elevated: #1A2235  /* modals, dropdowns */

/* Texte */
--color-text: #E8EDF5
--color-text-muted: #8A9BB8

/* Accents */
--color-accent-primary: #4F46E5    /* indigo */
--color-accent-secondary: #7C3AED  /* violet */

/* Statuts sémantiques */
--color-success: #10B981
--color-warning: #F59E0B
--color-error: #EF4444
--color-info: #3B82F6
```

**Anti-pattern** : `bg-blue-500`, `text-purple-600`, `border-red-400` → INTERDIT.
**Pattern** : `bg-[var(--color-surface)]`, classes CSS custom `text-accent`.

### Touch targets et transitions
- Touch targets : min 44×44px (WCAG 2.2)
- Micro : 150ms | Focus : 200ms | Panels : 300ms (cubic-bezier 0.4,0,0.2,1)
- `@media (prefers-reduced-motion: reduce)` → `0.01ms`

## Composants spécifiques SEO-GEO

### Score Badge
Affiche le score global 0-100 avec couleur sémantique :
```tsx
// components/audit/score-badge.tsx
type ScoreRange = 'critical' | 'warning' | 'good' | 'excellent'
// 0-39 → critical (red), 40-59 → warning (amber), 60-79 → good (blue), 80-100 → excellent (green)
```

### Phase Card (expandable)
```tsx
// components/audit/phase-card.tsx
// Titre phase + score/scoreMax + status chip + findings list (collapsed par défaut)
// Expand/collapse avec transition 300ms
// data-chart-ready sur le dernier élément pour le PDF Puppeteer
```

### Findings Table
```tsx
// components/audit/findings-table.tsx
// Colonnes : severity chip | category | title | effort badge | points lost
// Sort par severity desc, pointsLost desc
// Filter par severity + phase
// Pas de pagination V1 (max 200 findings)
```

### Radar Chart 11 phases
```tsx
// components/audit/radar-chart.tsx (recharts)
// IMPORTANT : ajouter data-chart-ready="true" sur le wrapper après rendu complet
// → requis pour Puppeteer waitForSelector('[data-chart-ready]')
```

## React 19 patterns

### Server Components (défaut)
```tsx
// app/dashboard/audits/page.tsx
// PAS de 'use client' sauf si interaction utilisateur requise
export default async function AuditsPage() {
  const { org } = await authenticateRequest() // côté serveur
  const audits = await db.select()...         // direct DB
  return <AuditsList audits={audits} />
}
```

### Client opt-in
```tsx
'use client'
// Seulement pour : useState, useEffect, event handlers, React Query hooks
// Garder les Client Components en feuille (pas de wrapping de pages entières)
```

### Suspense + loading
```tsx
// app/dashboard/audits/loading.tsx → skeleton automatique
// Jamais de spinner global bloquant — Suspense boundaries granulaires
```

## Patterns UI spécifiques

### Rapport vue toggle Marketing/Technique
```tsx
// components/audit/view-toggle.tsx
// Tab switch Marketing (langage non technique) vs Technique (détails raw)
// State en URL param : ?view=marketing | ?view=technical
```

### Empty states interactifs
```tsx
// Pas de "Aucun audit" vide → toujours un CTA "Lancer votre premier audit"
// Wizard inline (3 étapes max) avant d'arriver sur un dashboard vide
```

### Toasts (sonner — SEULE lib autorisée)
```tsx
import { toast } from 'sonner'
toast.success('Rapport généré avec succès')
toast.error('Erreur lors de la génération')
// PAS de react-hot-toast, PAS de shadcn/Toast
```

## Conventions fichiers UI

```
components/
  audit/        → score-badge, phase-card, findings-table, radar-chart
  layout/       → app-shell, header, sidebar, breadcrumb
  ui/           → primitives (button, card, input, badge) — ne pas modifier
  marketing/    → landing page (S2.1, à créer)
```

## Anti-patterns à éviter

- `className="text-white bg-blue-600"` → utiliser palette sémantique
- Composant client qui importe toute la page → fragmenter en petits clients
- `useEffect` pour data fetching → utiliser React Query hooks
- Inline styles → jamais, sauf cas CSS impossible en Tailwind
- Scrollbar custom sans `-webkit-scrollbar` cross-browser → utiliser Tailwind scrollbar plugin
