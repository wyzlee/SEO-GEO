'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-3xl font-bold font-[family-name:var(--font-display)]">
        Une erreur est survenue
      </h1>
      <p
        className="mt-3 text-sm max-w-md"
        style={{ color: 'var(--color-muted)' }}
      >
        {error.message || 'Erreur inattendue côté serveur.'}
      </p>
      <button type="button" onClick={reset} className="btn-primary mt-6">
        Réessayer
      </button>
    </main>
  )
}
