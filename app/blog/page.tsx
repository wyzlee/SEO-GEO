import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllPosts } from '@/lib/blog'

export const metadata: Metadata = {
  title: 'Blog SEO & GEO',
  description:
    "Ressources pratiques pour optimiser votre visibilité SEO et dans les moteurs IA en 2026 : GEO, llms.txt, E-E-A-T, données structurées.",
  alternates: {
    canonical: '/blog',
  },
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateStr))
}

export default function BlogPage() {
  const posts = getAllPosts()

  return (
    <div>
      {/* Page header */}
      <header style={{ marginBottom: '3rem' }}>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '2.25rem',
            fontWeight: 900,
            color: 'var(--color-text)',
            lineHeight: 1.15,
            marginBottom: '0.75rem',
          }}
        >
          Blog SEO &amp; GEO
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '1rem',
            color: 'var(--color-muted)',
            lineHeight: 1.6,
          }}
        >
          Ressources pour optimiser votre visibilité SEO et IA
        </p>
      </header>

      {/* Articles list */}
      {posts.length === 0 ? (
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            color: 'var(--color-muted)',
            fontSize: '0.9rem',
          }}
        >
          Aucun article pour le moment. Revenez bientôt.
        </p>
      ) : (
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
          }}
        >
          {posts.map((post) => (
            <li key={post.slug}>
              <article
                style={{
                  padding: '1.5rem',
                  borderRadius: '0.75rem',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)',
                  transition: 'border-color 150ms cubic-bezier(0.4,0,0.2,1)',
                }}
              >
                <time
                  dateTime={post.date}
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '0.75rem',
                    color: 'var(--color-muted)',
                    display: 'block',
                    marginBottom: '0.5rem',
                  }}
                >
                  {formatDate(post.date)}
                </time>
                <h2
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: 'var(--color-text)',
                    margin: '0 0 0.5rem',
                    lineHeight: 1.3,
                  }}
                >
                  <Link
                    href={`/blog/${post.slug}`}
                    style={{
                      color: 'inherit',
                      textDecoration: 'none',
                    }}
                  >
                    {post.title}
                  </Link>
                </h2>
                <p
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '0.9rem',
                    color: 'var(--color-muted)',
                    lineHeight: 1.6,
                    margin: '0 0 1rem',
                  }}
                >
                  {post.description}
                </p>
                <Link
                  href={`/blog/${post.slug}`}
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '0.85rem',
                    color: 'var(--color-accent)',
                    textDecoration: 'none',
                    fontWeight: 600,
                  }}
                >
                  Lire →
                </Link>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
