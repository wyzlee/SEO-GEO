import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    template: '%s — Blog SEO-GEO',
    default: 'Blog SEO & GEO — Ressources pour optimiser votre visibilité',
  },
  description:
    "Guides pratiques sur le SEO, le GEO (Generative Engine Optimization), le fichier llms.txt et l'optimisation pour les moteurs IA en 2026.",
}

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <header
        style={{
          borderBottom: '1px solid var(--color-border)',
          padding: '1rem 0',
          background: 'var(--color-surface)',
        }}
      >
        <div
          style={{
            maxWidth: '720px',
            margin: '0 auto',
            padding: '0 1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Link
            href="/"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              color: 'var(--color-text)',
              textDecoration: 'none',
              fontSize: '1.1rem',
            }}
          >
            SEO-GEO
          </Link>
          <nav style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <Link
              href="/blog"
              style={{
                color: 'var(--color-muted)',
                textDecoration: 'none',
                fontSize: '14px',
                fontFamily: 'var(--font-sans)',
              }}
            >
              Blog
            </Link>
            <Link
              href="/login"
              style={{
                color: 'var(--color-accent)',
                textDecoration: 'none',
                fontSize: '14px',
                fontFamily: 'var(--font-sans)',
                fontWeight: 600,
              }}
            >
              Essayer gratuitement →
            </Link>
          </nav>
        </div>
      </header>

      <main
        style={{
          maxWidth: '720px',
          margin: '0 auto',
          padding: '3rem 1.5rem',
        }}
      >
        {children}
      </main>

      <footer
        style={{
          borderTop: '1px solid var(--color-border)',
          padding: '2rem 0',
          textAlign: 'center',
          background: 'var(--color-surface)',
        }}
      >
        <div
          style={{
            color: 'var(--color-muted)',
            fontSize: '13px',
            fontFamily: 'var(--font-sans)',
          }}
        >
          <p>
            Auditez votre site avec SEO-GEO —{' '}
            <Link href="/onboarding" style={{ color: 'var(--color-accent)' }}>
              Commencer gratuitement
            </Link>
          </p>
        </div>
      </footer>
    </div>
  )
}
