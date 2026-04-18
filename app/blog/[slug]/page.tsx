import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { getPostBySlug, getAllPosts } from '@/lib/blog'

// MDX component overrides — design system styles applied per element
const mdxComponents = {
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2
      {...props}
      style={{
        fontFamily: 'var(--font-display)',
        fontSize: '1.5rem',
        fontWeight: 700,
        color: 'var(--color-text)',
        marginTop: '2.5rem',
        marginBottom: '0.75rem',
        lineHeight: 1.3,
      }}
    />
  ),
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3
      {...props}
      style={{
        fontFamily: 'var(--font-display)',
        fontSize: '1.15rem',
        fontWeight: 600,
        color: 'var(--color-text)',
        marginTop: '2rem',
        marginBottom: '0.5rem',
        lineHeight: 1.4,
      }}
    />
  ),
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p
      {...props}
      style={{
        fontFamily: 'var(--font-sans)',
        fontSize: '0.95rem',
        color: 'var(--color-text)',
        lineHeight: 1.8,
        marginBottom: '1.25rem',
      }}
    />
  ),
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul
      {...props}
      style={{
        fontFamily: 'var(--font-sans)',
        fontSize: '0.95rem',
        color: 'var(--color-text)',
        lineHeight: 1.8,
        marginBottom: '1.25rem',
        paddingLeft: '1.5rem',
      }}
    />
  ),
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
    <ol
      {...props}
      style={{
        fontFamily: 'var(--font-sans)',
        fontSize: '0.95rem',
        color: 'var(--color-text)',
        lineHeight: 1.8,
        marginBottom: '1.25rem',
        paddingLeft: '1.5rem',
      }}
    />
  ),
  li: (props: React.HTMLAttributes<HTMLLIElement>) => (
    <li
      {...props}
      style={{
        fontFamily: 'var(--font-sans)',
        marginBottom: '0.375rem',
        color: 'var(--color-text)',
      }}
    />
  ),
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      {...props}
      style={{
        color: 'var(--color-accent)',
        textDecoration: 'underline',
        textUnderlineOffset: '3px',
      }}
    />
  ),
  strong: (props: React.HTMLAttributes<HTMLElement>) => (
    <strong
      {...props}
      style={{
        fontWeight: 700,
        color: 'var(--color-text)',
      }}
    />
  ),
  code: (props: React.HTMLAttributes<HTMLElement>) => (
    <code
      {...props}
      style={{
        fontFamily: 'var(--font-sans)',
        fontSize: '0.85em',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '4px',
        padding: '0.1em 0.4em',
        color: 'var(--color-accent)',
      }}
    />
  ),
  pre: (props: React.HTMLAttributes<HTMLPreElement>) => (
    <pre
      {...props}
      style={{
        fontFamily: 'var(--font-sans)',
        fontSize: '0.85rem',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        padding: '1.25rem',
        overflowX: 'auto',
        marginBottom: '1.5rem',
        lineHeight: 1.7,
      }}
    />
  ),
  blockquote: (props: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote
      {...props}
      style={{
        fontFamily: 'var(--font-sans)',
        borderLeft: '3px solid var(--color-accent)',
        paddingLeft: '1.25rem',
        margin: '1.5rem 0',
        color: 'var(--color-muted)',
        fontStyle: 'italic',
      }}
    />
  ),
  table: (props: React.HTMLAttributes<HTMLTableElement>) => (
    <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
      <table
        {...props}
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '0.88rem',
          width: '100%',
          borderCollapse: 'collapse',
        }}
      />
    </div>
  ),
  th: (props: React.ThHTMLAttributes<HTMLTableCellElement>) => (
    <th
      {...props}
      style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 600,
        fontSize: '0.8rem',
        textAlign: 'left',
        padding: '0.5rem 0.75rem',
        borderBottom: '2px solid var(--color-border)',
        color: 'var(--color-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}
    />
  ),
  td: (props: React.TdHTMLAttributes<HTMLTableCellElement>) => (
    <td
      {...props}
      style={{
        padding: '0.5rem 0.75rem',
        borderBottom: '1px solid var(--color-border)',
        color: 'var(--color-text)',
        verticalAlign: 'top',
      }}
    />
  ),
  hr: () => (
    <hr
      style={{
        border: 'none',
        borderTop: '1px solid var(--color-border)',
        margin: '2rem 0',
      }}
    />
  ),
}

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) return {}
  return {
    title: post.title,
    description: post.description,
    alternates: {
      canonical: `/blog/${slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.date,
    },
  }
}

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }))
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateStr))
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = getPostBySlug(slug)

  if (!post) {
    notFound()
  }

  return (
    <article>
      {/* Breadcrumb */}
      <nav
        aria-label="Fil d'ariane"
        style={{
          marginBottom: '2rem',
          fontFamily: 'var(--font-sans)',
          fontSize: '0.8rem',
          color: 'var(--color-muted)',
        }}
      >
        <Link
          href="/blog"
          style={{ color: 'var(--color-muted)', textDecoration: 'none' }}
        >
          Blog
        </Link>
        <span aria-hidden="true" style={{ margin: '0 0.5rem' }}>
          /
        </span>
        <span>{post.title}</span>
      </nav>

      {/* Article header */}
      <header style={{ marginBottom: '2.5rem' }}>
        <time
          dateTime={post.date}
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '0.8rem',
            color: 'var(--color-muted)',
            display: 'block',
            marginBottom: '0.75rem',
          }}
        >
          {formatDate(post.date)}
        </time>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
            fontWeight: 900,
            color: 'var(--color-text)',
            lineHeight: 1.2,
            marginBottom: '1rem',
          }}
        >
          {post.title}
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '1.05rem',
            color: 'var(--color-muted)',
            lineHeight: 1.6,
            borderLeft: '3px solid var(--color-accent)',
            paddingLeft: '1rem',
          }}
        >
          {post.description}
        </p>
      </header>

      {/* MDX content */}
      <div>
        <MDXRemote source={post.content} components={mdxComponents} />
      </div>

      {/* Footer CTA */}
      <footer
        style={{
          marginTop: '4rem',
          paddingTop: '2rem',
          borderTop: '1px solid var(--color-border)',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '0.9rem',
            color: 'var(--color-muted)',
            marginBottom: '1.25rem',
            lineHeight: 1.6,
          }}
        >
          Vous souhaitez évaluer votre site sur ces critères ?
        </p>
        <Link
          href="/onboarding"
          className="btn-primary"
          style={{ display: 'inline-flex' }}
        >
          Lancer un audit SEO-GEO gratuit
        </Link>
      </footer>
    </article>
  )
}
