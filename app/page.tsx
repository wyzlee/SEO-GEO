import Link from 'next/link'
import type { Metadata } from 'next'
import { FlashAuditWidget } from '@/components/audit/flash-widget'

export const metadata: Metadata = {
  title: 'Audit SEO & GEO — visibilité Google + moteurs IA',
  description:
    'Plateforme d\'audit SEO et GEO (Generative Engine Optimization) pour 2026. 11 phases d\'analyse, scoring sur 100 points, rapport FR white-label livrable en 3 à 5 jours.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'SEO-GEO — audit SEO + GEO nouvelle génération',
    description:
      'Mesurez votre visibilité dans Google ET dans les moteurs IA (ChatGPT, Claude, Perplexity, Gemini).',
    type: 'website',
  },
}

const phases: Array<{ num: number; title: string; weight: number }> = [
  { num: 1, title: 'SEO technique', weight: 12 },
  { num: 2, title: 'Données structurées', weight: 15 },
  { num: 3, title: 'Visibilité IA (GEO)', weight: 18 },
  { num: 4, title: 'Identité de marque (Entity)', weight: 10 },
  { num: 5, title: 'Crédibilité (E-E-A-T)', weight: 10 },
  { num: 6, title: 'Fraîcheur du contenu', weight: 8 },
  { num: 7, title: 'International (hreflang)', weight: 8 },
  { num: 8, title: 'Performance (CWV)', weight: 8 },
  { num: 9, title: 'Autorité thématique', weight: 6 },
  { num: 10, title: 'Erreurs courantes', weight: 5 },
  { num: 11, title: 'Synthèse cross-phase', weight: 0 },
]

const packages: Array<{
  name: string
  price: string
  description: string
  features: string[]
  featured?: boolean
}> = [
  {
    name: 'Audit unique',
    price: '1 500 – 3 500 €',
    description: 'Audit complet + débrief 1h + rapport white-label.',
    features: [
      '11 phases d\'analyse',
      'Rapport HTML + PDF téléchargeable',
      'Debrief 1h en visio',
      'Livré sous 3 à 5 jours',
    ],
  },
  {
    name: 'Retainer Growth',
    price: '5 000 – 7 500 € / mois',
    description: 'Audit trimestriel + refresh mensuels + conseils continus.',
    features: [
      '1 audit complet / trimestre',
      '2–4 refresh ciblés / mois',
      'Suivi mention rate IA',
      'Pillar content + entity building',
    ],
    featured: true,
  },
  {
    name: 'White-label agence',
    price: 'Tarif wholesale',
    description:
      'Pour agences SEO : branding dynamique, rapport sous votre marque.',
    features: [
      'Logo + couleurs agence',
      'API + webhooks (V2)',
      'Remise volume',
      'Formation équipe',
    ],
  },
]

export default function LandingPage() {
  return (
    <div
      className="min-h-screen"
      style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
    >
      {/* ---- Nav ---- */}
      <header
        className="border-b"
        style={{
          background: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="font-[family-name:var(--font-display)] font-bold text-lg">
            SEO-GEO
          </div>
          <nav className="flex items-center gap-6 text-sm font-[family-name:var(--font-sans)]">
            <a href="#phases" style={{ color: 'var(--color-muted)' }}>
              Phases
            </a>
            <a href="#offres" style={{ color: 'var(--color-muted)' }}>
              Offres
            </a>
            <Link href="/login" className="btn-secondary">
              Connexion
            </Link>
            <Link href="/onboarding" className="btn-primary">
              Commencer gratuitement
            </Link>
          </nav>
        </div>
      </header>

      <main id="main-content">
        {/* ---- Hero ---- */}
        <section className="max-w-4xl mx-auto px-6 py-20 text-center">
          <div
            className="inline-block text-xs uppercase tracking-wider px-3 py-1 rounded-full mb-6 font-[family-name:var(--font-display)] font-semibold"
            style={{
              background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
              color: 'var(--color-accent)',
            }}
          >
            Audit nouvelle génération · Édition 2026
          </div>
          <h1 className="text-4xl md:text-6xl font-bold font-[family-name:var(--font-display)] leading-tight">
            Visible dans Google <em className="not-italic" style={{ color: 'var(--color-accent)' }}>et</em> dans les moteurs IA.
          </h1>
          <p
            className="mt-6 text-lg md:text-xl font-[family-name:var(--font-sans)] max-w-2xl mx-auto"
            style={{ color: 'var(--color-muted)' }}
          >
            SEO-GEO audite votre site en 11 phases alignées 2026 (llms.txt, AI
            bots, entity SEO, E-E-A-T, Core Web Vitals) et livre un rapport
            priorisé de 100 points — actionnable par vos équipes ou par une
            agence partenaire.
          </p>
          <div className="mt-10 flex flex-wrap gap-3 justify-center">
            <Link href="/onboarding" className="btn-primary">
              Commencer gratuitement
            </Link>
            <a href="#offres" className="btn-secondary">
              Découvrir les offres
            </a>
          </div>

          {/* Flash audit widget — inline, no login required */}
          <div className="mt-12">
            <p
              className="mb-4 text-sm font-[family-name:var(--font-sans)]"
              style={{ color: 'var(--color-muted)' }}
            >
              Testez gratuitement — résultat en 10 secondes, sans compte
            </p>
            <FlashAuditWidget />
          </div>
        </section>

        {/* ---- Value props ---- */}
        <section className="max-w-5xl mx-auto px-6 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ValueCard
              title="GEO-ready"
              body="Détection llms.txt, robots.txt AI bots, semantic completeness, answer blocks, citations."
            />
            <ValueCard
              title="Scoring transparent"
              body="100 points répartis sur 11 phases, pondérés en 2026 (GEO pèse 18 pts, Schema 15 pts)."
            />
            <ValueCard
              title="Livrable client"
              body="Rapport FR jargon-free, HTML + PDF, partageable 30 jours, white-label agence."
            />
          </div>
        </section>

        {/* ---- Phases ---- */}
        <section
          id="phases"
          className="max-w-5xl mx-auto px-6 py-20 border-t"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <h2 className="text-3xl font-[family-name:var(--font-display)] font-bold text-center">
            11 phases d&apos;analyse, scoring sur 100 points
          </h2>
          <p
            className="mt-3 text-sm text-center font-[family-name:var(--font-sans)] max-w-2xl mx-auto"
            style={{ color: 'var(--color-muted)' }}
          >
            Toutes les phases sont traçables et sourcées (stats consultées
            datées, règles publiques, versions d&apos;algo de scoring).
          </p>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-3">
            {phases.map((p) => (
              <div
                key={p.num}
                className="flex items-baseline gap-3 py-2 px-4 rounded-md"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <span
                  className="font-[family-name:var(--font-display)] text-xs tabular-nums font-semibold"
                  style={{ color: 'var(--color-muted)' }}
                >
                  {String(p.num).padStart(2, '0')}
                </span>
                <span className="flex-1 font-[family-name:var(--font-sans)]">
                  {p.title}
                </span>
                {p.weight > 0 ? (
                  <span
                    className="text-xs font-[family-name:var(--font-display)] font-semibold tabular-nums"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    {p.weight} pts
                  </span>
                ) : (
                  <span
                    className="text-xs"
                    style={{ color: 'var(--color-muted)' }}
                  >
                    synthèse
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ---- Offres ---- */}
        <section
          id="offres"
          className="max-w-5xl mx-auto px-6 py-20 border-t"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <h2 className="text-3xl font-[family-name:var(--font-display)] font-bold text-center">
            Trois formats d&apos;engagement
          </h2>
          <p
            className="mt-3 text-sm text-center font-[family-name:var(--font-sans)]"
            style={{ color: 'var(--color-muted)' }}
          >
            V1 agency — facturation sur contrat.
          </p>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
            {packages.map((pkg) => (
              <div
                key={pkg.name}
                className="rounded-xl p-6 flex flex-col"
                style={{
                  background: pkg.featured
                    ? 'color-mix(in srgb, var(--color-accent) 8%, var(--color-surface))'
                    : 'var(--color-surface)',
                  border: `1px solid ${pkg.featured ? 'var(--color-accent)' : 'var(--color-border)'}`,
                }}
              >
                {pkg.featured ? (
                  <span
                    className="text-xs uppercase tracking-wider font-[family-name:var(--font-display)] font-semibold mb-2"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    Recommandé
                  </span>
                ) : null}
                <h3 className="text-xl font-[family-name:var(--font-display)] font-bold">
                  {pkg.name}
                </h3>
                <div
                  className="mt-2 text-lg font-[family-name:var(--font-sans)] font-semibold"
                  style={{ color: 'var(--color-accent)' }}
                >
                  {pkg.price}
                </div>
                <p
                  className="mt-2 text-sm font-[family-name:var(--font-sans)]"
                  style={{ color: 'var(--color-muted)' }}
                >
                  {pkg.description}
                </p>
                <ul className="mt-4 space-y-1.5 text-sm font-[family-name:var(--font-sans)] flex-1">
                  {pkg.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span
                        aria-hidden="true"
                        style={{ color: 'var(--color-accent)' }}
                      >
                        ✓
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href="mailto:contact@wyzlee.com?subject=Devis%20SEO-GEO"
                  className={pkg.featured ? 'btn-primary mt-6' : 'btn-secondary mt-6'}
                >
                  Demander un devis
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* ---- CTA final ---- */}
        <section className="max-w-4xl mx-auto px-6 py-20 text-center">
          <h2 className="text-2xl md:text-3xl font-[family-name:var(--font-display)] font-bold">
            Votre site est-il visible dans ChatGPT, Claude, Perplexity ?
          </h2>
          <p
            className="mt-3 text-sm font-[family-name:var(--font-sans)]"
            style={{ color: 'var(--color-muted)' }}
          >
            Vérifions-le ensemble. Un audit en 3 à 5 jours, livré en français,
            avec une roadmap concrète sur 90 jours.
          </p>
          <a
            href="mailto:contact@wyzlee.com?subject=Audit%20SEO-GEO"
            className="btn-primary mt-6 inline-flex"
          >
            Discuter d&apos;un audit
          </a>
        </section>
      </main>

      {/* ---- Footer ---- */}
      <footer
        className="border-t mt-10 py-8"
        style={{
          background: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-between gap-4 text-xs font-[family-name:var(--font-sans)]"
          style={{ color: 'var(--color-muted)' }}>
          <span>© {new Date().getFullYear()} Wyzlee — SEO-GEO</span>
          <nav className="flex gap-4">
            <Link href="/legal/mentions">Mentions légales</Link>
            <Link href="/legal/cgu">CGU</Link>
            <Link href="/legal/privacy">Confidentialité</Link>
            <Link href="/legal/dpa">DPA</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}

function ValueCard({ title, body }: { title: string; body: string }) {
  return (
    <div
      className="p-5 rounded-lg"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      <h3 className="font-[family-name:var(--font-display)] font-semibold">
        {title}
      </h3>
      <p
        className="mt-2 text-sm font-[family-name:var(--font-sans)]"
        style={{ color: 'var(--color-muted)' }}
      >
        {body}
      </p>
    </div>
  )
}
