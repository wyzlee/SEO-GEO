export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div
        className="h-10 w-10 rounded-full border-[3px] animate-spin"
        style={{
          borderColor: 'var(--color-border)',
          borderTopColor: 'var(--color-accent)',
        }}
        aria-label="Chargement"
      />
    </div>
  )
}
