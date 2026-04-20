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

const saasPlans: Array<{
  name: string
  price: string
  priceDetail?: string
  description: string
  features: string[]
  cta: string
  ctaHref: string
  featured?: boolean
}> = [
  {
    name: 'Découverte',
    price: 'Gratuit',
    description: 'Pour tester la plateforme et découvrir l\'audit SEO-GEO.',
    features: [
      '1 audit / mois',
      'Rapport HTML complet',
      'Score sur 100 pts',
      'Findings par phase',
    ],
    cta: 'Commencer gratuitement',
    ctaHref: '/signup',
  },
  {
    name: 'Studio',
    price: '490 €',
    priceDetail: '/ mois',
    description: 'Pour les équipes marketing et agences actives.',
    features: [
      '20 audits / mois',
      'Export PDF white-label',
      'Rapport partageable 60j',
      'Synthèse IA cross-phase',
    ],
    cta: 'Essayer Studio',
    ctaHref: '/signup',
    featured: true,
  },
  {
    name: 'Agency',
    price: '990 €',
    priceDetail: '/ mois',
    description: 'Pour les agences SEO avec volume et branding client.',
    features: [
      'Audits illimités',
      'White-label complet',
      'Accès API + webhooks',
      'Support prioritaire',
    ],
    cta: 'Contacter',
    ctaHref: 'mailto:contact@wyzlee.com?subject=Plan%20Agency%20SEO-GEO',
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
            <Link href="/blog" style={{ color: 'var(--color-muted)' }}>
              Blog
            </Link>
            <Link href="/guide" style={{ color: 'var(--color-muted)' }}>
              Guide produit
            </Link>
            <Link href="/login" className="btn-secondary">
              Connexion
            </Link>
            <Link href="/signup" className="btn-primary">
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
            <Link href="/signup" className="btn-primary">
              Commencer gratuitement
            </Link>
            <Link href="/guide" className="btn-secondary">
              Voir le guide produit →
            </Link>
            <a href="#offres" style={{ color: 'var(--color-muted)', fontSize: '0.875rem', display: 'flex', alignItems: 'center' }}>
              Voir les offres
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

        {/* ---- Nouvelles capacités 2026 ---- */}
        <section
          className="max-w-5xl mx-auto px-6 py-20 border-t"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="text-center mb-10">
            <div
              className="inline-block text-xs uppercase tracking-wider px-3 py-1 rounded-full mb-4 font-[family-name:var(--font-display)] font-semibold"
              style={{
                background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
                color: 'var(--color-accent)',
              }}
            >
              Nouveautés 2026
            </div>
            <h2 className="text-3xl font-[family-name:var(--font-display)] font-bold">
              Au-delà des 11 phases
            </h2>
            <p
              className="mt-3 text-sm font-[family-name:var(--font-sans)] max-w-2xl mx-auto"
              style={{ color: 'var(--color-muted)' }}
            >
              Trois nouvelles capacités disponibles en 2026 — benchmark, surveillance des citations IA et génération de briefs de contenu.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <NewCapabilityCard
              tag="Benchmark"
              title="Comparatif concurrent"
              body="Comparez jusqu'à 5 sites simultanément — tableau de scores par phase, détection des écarts. Sachez exactement où vous en êtes face à vos concurrents."
              href="/signup"
            />
            <NewCapabilityCard
              tag="Citations IA"
              title="AI Citation Monitoring"
              body="Vérifiez si votre domaine est cité par Perplexity et ChatGPT sur vos requêtes cibles. Suivi de la mention rate IA en continu, phase GEO enrichie."
              href="/signup"
            />
            <NewCapabilityCard
              tag="Briefs de contenu"
              title="Content Briefs IA"
              body="Génération automatique de briefs post-audit — structure, angle, mots-clés, signaux E-E-A-T à inclure. Propulsé par Claude, livrable immédiatement."
              href="/signup"
            />
          </div>
        </section>

        {/* ---- Pricing ---- */}
        <section
          id="offres"
          className="max-w-5xl mx-auto px-6 py-20 border-t"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <h2 className="text-3xl font-[family-name:var(--font-display)] font-bold text-center">
            Tarifs simples, sans surprise
          </h2>
          <p
            className="mt-3 text-sm text-center font-[family-name:var(--font-sans)]"
            style={{ color: 'var(--color-muted)' }}
          >
            Commencez gratuitement — passez au plan supérieur quand vous avez besoin de plus.
          </p>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
            {saasPlans.map((plan) => (
              <div
                key={plan.name}
                className="rounded-xl p-6 flex flex-col"
                style={{
                  background: plan.featured
                    ? 'color-mix(in srgb, var(--color-accent) 8%, var(--color-surface))'
                    : 'var(--color-surface)',
                  border: `1px solid ${plan.featured ? 'var(--color-accent)' : 'var(--color-border)'}`,
                }}
              >
                {plan.featured ? (
                  <span
                    className="text-xs uppercase tracking-wider font-[family-name:var(--font-display)] font-semibold mb-2"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    Populaire
                  </span>
                ) : null}
                <h3 className="text-xl font-[family-name:var(--font-display)] font-bold">
                  {plan.name}
                </h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span
                    className="text-2xl font-[family-name:var(--font-display)] font-bold"
                    style={{ color: 'var(--color-text)' }}
                  >
                    {plan.price}
                  </span>
                  {plan.priceDetail && (
                    <span
                      className="text-sm font-[family-name:var(--font-sans)]"
                      style={{ color: 'var(--color-muted)' }}
                    >
                      {plan.priceDetail}
                    </span>
                  )}
                </div>
                <p
                  className="mt-2 text-sm font-[family-name:var(--font-sans)]"
                  style={{ color: 'var(--color-muted)' }}
                >
                  {plan.description}
                </p>
                <ul className="mt-4 space-y-1.5 text-sm font-[family-name:var(--font-sans)] flex-1">
                  {plan.features.map((f) => (
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
                <Link
                  href={plan.ctaHref}
                  className={plan.featured ? 'btn-primary mt-6' : 'btn-secondary mt-6'}
                >
                  {plan.cta}
                </Link>
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
            Lancez votre premier audit gratuitement — résultat en moins de 10 minutes.
          </p>
          <Link
            href="/signup"
            className="btn-primary mt-6 inline-flex"
          >
            Commencer gratuitement
          </Link>
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
            <Link href="/guide">Guide produit</Link>
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

function NewCapabilityCard({
  tag,
  title,
  body,
  href,
}: {
  tag: string
  title: string
  body: string
  href: string
}) {
  return (
    <div
      className="p-5 rounded-lg flex flex-col gap-3"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      <span
        className="text-xs uppercase tracking-wider font-[family-name:var(--font-display)] font-semibold self-start px-2 py-0.5 rounded"
        style={{
          background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
          color: 'var(--color-accent)',
        }}
      >
        {tag}
      </span>
      <h3 className="font-[family-name:var(--font-display)] font-bold">{title}</h3>
      <p
        className="text-sm font-[family-name:var(--font-sans)] flex-1"
        style={{ color: 'var(--color-muted)' }}
      >
        {body}
      </p>
      <Link
        href={href}
        className="btn-secondary text-sm self-start"
      >
        En savoir plus →
      </Link>
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
