'use client'

export type AuditView = 'marketing' | 'tech'

interface ViewToggleProps {
  view: AuditView
  onChange: (v: AuditView) => void
}

export function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div
      className="inline-flex rounded-lg p-0.5 gap-0.5"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      role="group"
      aria-label="Vue de l'audit"
    >
      <button
        type="button"
        onClick={() => onChange('marketing')}
        className="px-4 py-1.5 rounded-md text-sm font-[family-name:var(--font-display)] font-medium transition-colors duration-150"
        style={
          view === 'marketing'
            ? {
                background: 'var(--color-accent)',
                color: '#fff',
              }
            : {
                background: 'transparent',
                color: 'var(--color-muted)',
              }
        }
        aria-pressed={view === 'marketing'}
      >
        Vue Marketing
      </button>
      <button
        type="button"
        onClick={() => onChange('tech')}
        className="px-4 py-1.5 rounded-md text-sm font-[family-name:var(--font-display)] font-medium transition-colors duration-150"
        style={
          view === 'tech'
            ? {
                background: 'var(--color-accent)',
                color: '#fff',
              }
            : {
                background: 'transparent',
                color: 'var(--color-muted)',
              }
        }
        aria-pressed={view === 'tech'}
      >
        Vue Tech
      </button>
    </div>
  )
}
