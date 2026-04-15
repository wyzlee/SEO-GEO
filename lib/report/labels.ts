/**
 * FR labels for report rendering. Centralized so future i18n can swap maps.
 */

export const PHASE_LABELS_FR: Record<string, string> = {
  technical: 'SEO technique',
  structured_data: 'Données structurées',
  geo: 'Visibilité IA (GEO)',
  entity: 'Identité de marque (Entity)',
  eeat: 'Crédibilité (E-E-A-T)',
  freshness: 'Fraîcheur du contenu',
  international: 'International (hreflang)',
  performance: 'Performance (Core Web Vitals)',
  topical: 'Autorité thématique',
  common_mistakes: 'Erreurs courantes',
  synthesis: 'Synthèse',
}

export const PHASE_CONTEXT_FR: Record<string, string> = {
  technical:
    'Couvre les balises méta, les URL, le sitemap et le robots.txt. Base minimale pour être bien indexé.',
  structured_data:
    'Schemas JSON-LD (Organization, Article, WebSite). Permet aux SERP Google et aux moteurs IA de comprendre la structure.',
  geo: 'Optimisation pour ChatGPT Search, Perplexity, Claude, Google AI Overviews. Le poids le plus lourd en 2026.',
  entity:
    'Cohérence de nom de marque et liens vers Wikidata / Wikipedia. Aide les moteurs à désambiguïser la marque.',
  eeat: 'Experience, Expertise, Authoritativeness, Trust — signaux de confiance attendus par Google et les moteurs IA.',
  freshness:
    "Date de mise à jour du contenu. 76 % des citations IA portent sur des pages mises à jour dans les 30 derniers jours.",
  international:
    'Gestion multilingue (hreflang, og:locale). Applicable seulement si site multilingue.',
  performance:
    "Vitesse de chargement, réactivité au clic, stabilité du rendu. Impact CTR et indexation.",
  topical:
    'Architecture pillar/cluster et maillage interne. Aide à construire une autorité thématique.',
  common_mistakes:
    'Erreurs fréquentes qui cassent silencieusement le SEO (noindex accidentel, mixed content, canonical incohérent).',
  synthesis: 'Synthèse et roadmap générées depuis les phases 1 à 10.',
}

export const SEVERITY_LABELS_FR: Record<string, string> = {
  critical: 'Critique',
  high: 'Élevé',
  medium: 'Moyen',
  low: 'Faible',
  info: 'Info',
}

export const EFFORT_LABELS_FR: Record<string, string> = {
  quick: 'Rapide (< 1 h)',
  medium: 'Moyen (< 1 jour)',
  heavy: 'Lourd (> 1 jour)',
}

export function scoreLevel(score: number): {
  label: string
  color: string
} {
  if (score >= 80) return { label: 'Excellent', color: 'green' }
  if (score >= 60) return { label: 'Bon', color: 'blue' }
  if (score >= 40) return { label: 'À améliorer', color: 'amber' }
  return { label: 'Critique', color: 'red' }
}

export function formatDateFr(iso: Date | string | null): string {
  if (!iso) return '—'
  const d = typeof iso === 'string' ? new Date(iso) : iso
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
