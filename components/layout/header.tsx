export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <header
      className="min-h-16 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 px-4 md:px-6 py-4 border-b"
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="min-w-0">
        <h1 className="text-xl md:text-2xl font-bold font-[family-name:var(--font-display)] truncate">
          {title}
        </h1>
        {description && (
          <p
            className="text-sm mt-1 font-[family-name:var(--font-sans)]"
            style={{ color: 'var(--color-muted)' }}
          >
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {actions}
        </div>
      )}
    </header>
  )
}
