import Link from 'next/link'

export default function NotFound() {
  return (
    <main id="main-content" className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-5xl font-bold font-[family-name:var(--font-display)]">
        404
      </h1>
      <p
        className="mt-3 text-base"
        style={{ color: 'var(--color-muted)' }}
      >
        Page introuvable.
      </p>
      <Link href="/" className="btn-secondary mt-6">
        Retour à l&apos;accueil
      </Link>
    </main>
  )
}
