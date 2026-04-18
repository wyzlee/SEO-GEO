import type { Metadata } from 'next'
import { GuideDeck } from './guide-deck'

export const metadata: Metadata = {
  title: 'Guide produit — SEO-GEO',
  description: 'Découvrez comment SEO-GEO mesure simultanément votre visibilité dans Google et dans les moteurs IA (ChatGPT, Perplexity, Claude, Gemini). 11 dimensions d\'audit, scoring 100 points, rapport client-ready en moins de 10 minutes.',
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Guide produit SEO-GEO — Audit SEO & GEO nouvelle génération',
    description: 'Mesurez votre visibilité dans Google ET dans les moteurs IA. 11 phases d\'audit, scoring 100 pts, rapport white-label en français.',
    type: 'website',
  },
}

export default function GuidePage() {
  return <GuideDeck />
}
