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
      className="h-auto min-h-16 flex items-start md:items-center justify-between gap-4 px-6 py-4 border-b"
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="min-w-0">
        <h1 className="text-2xl font-bold font-[family-name:var(--font-display)] truncate">
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
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  )
}
