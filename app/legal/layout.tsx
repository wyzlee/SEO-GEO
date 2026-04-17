import Link from 'next/link'

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className="min-h-screen"
      style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
    >
      <header
        className="border-b"
        style={{
          background: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="font-[family-name:var(--font-display)] font-semibold text-lg"
          >
            SEO-GEO
          </Link>
          <nav className="flex gap-4 text-sm font-[family-name:var(--font-sans)]">
            <Link href="/legal/mentions" style={{ color: 'var(--color-muted)' }}>
              Mentions
            </Link>
            <Link href="/legal/cgu" style={{ color: 'var(--color-muted)' }}>
              CGU
            </Link>
            <Link href="/legal/privacy" style={{ color: 'var(--color-muted)' }}>
              Confidentialité
            </Link>
            <Link href="/legal/dpa" style={{ color: 'var(--color-muted)' }}>
              DPA
            </Link>
          </nav>
        </div>
      </header>
      <main
        id="main-content"
        className="max-w-3xl mx-auto px-6 py-10 prose-legal"
      >
        {children}
      </main>
      <footer
        className="border-t mt-16 py-6"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div
          className="max-w-3xl mx-auto px-6 text-xs flex justify-between font-[family-name:var(--font-sans)]"
          style={{ color: 'var(--color-muted)' }}
        >
          <span>© {new Date().getFullYear()} Wyzlee</span>
          <Link href="/">Accueil</Link>
        </div>
      </footer>
    </div>
  )
}
