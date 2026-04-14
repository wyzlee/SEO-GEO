import Link from 'next/link'

export default function LandingPage() {
  return (
    <main
      id="main-content"
      className="min-h-screen flex flex-col items-center justify-center px-6 py-16"
    >
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="text-4xl md:text-5xl font-bold font-[family-name:var(--font-display)]">
          SEO-GEO
        </h1>
        <p
          className="text-lg font-[family-name:var(--font-sans)]"
          style={{ color: 'var(--color-muted)' }}
        >
          Audit SEO & GEO (Generative Engine Optimization) pour 2026.
          <br />
          Mesurez votre visibilite dans Google et dans les moteurs IA.
        </p>
        <div className="flex gap-4 justify-center pt-4">
          <Link href="/dashboard" className="btn-primary">
            Aller au dashboard
          </Link>
          <Link href="/login" className="btn-secondary">
            Se connecter
          </Link>
        </div>
      </div>
    </main>
  )
}
