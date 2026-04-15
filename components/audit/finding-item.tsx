import type { FindingRow } from '@/lib/hooks/use-audits'

const SEVERITY_STYLES: Record<
  FindingRow['severity'],
  { label: string; color: string }
> = {
  critical: { label: 'critique', color: 'var(--color-red)' },
  high: { label: 'élevé', color: 'var(--color-orange)' },
  medium: { label: 'moyen', color: 'var(--color-amber)' },
  low: { label: 'faible', color: 'var(--color-blue)' },
  info: { label: 'info', color: 'var(--color-muted)' },
}

const EFFORT_LABELS: Record<
  NonNullable<FindingRow['effort']>,
  string
> = {
  quick: 'rapide (< 1h)',
  medium: 'moyen (< 1 jour)',
  heavy: 'lourd (> 1 jour)',
}

export function FindingItem({ finding }: { finding: FindingRow }) {
  const severity = SEVERITY_STYLES[finding.severity]

  return (
    <div
      className="flex gap-3 py-3 border-t"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <div className="shrink-0 pt-1">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ background: severity.color }}
          aria-hidden="true"
        />
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <div>
          <div
            className="text-xs uppercase tracking-wider font-[family-name:var(--font-display)]"
            style={{ color: severity.color }}
          >
            {severity.label}
            {finding.category ? ` · ${finding.category}` : null}
          </div>
          <div className="font-[family-name:var(--font-display)] font-semibold text-[14px]">
            {finding.title}
          </div>
        </div>
        <p
          className="text-[13px] font-[family-name:var(--font-sans)] leading-relaxed"
          style={{ color: 'var(--color-text)' }}
        >
          {finding.description}
        </p>
        <div
          className="text-[13px] font-[family-name:var(--font-sans)] leading-relaxed"
          style={{ color: 'var(--color-muted)' }}
        >
          <span
            className="font-semibold"
            style={{ color: 'var(--color-text)' }}
          >
            Recommandation :{' '}
          </span>
          {finding.recommendation}
        </div>
        <div
          className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-[family-name:var(--font-sans)]"
          style={{ color: 'var(--color-muted)' }}
        >
          {finding.locationUrl && (
            <span>📍 {finding.locationUrl}</span>
          )}
          {finding.metricValue && (
            <span>
              Mesuré : {finding.metricValue}
              {finding.metricTarget ? ` (cible ${finding.metricTarget})` : ''}
            </span>
          )}
          {finding.effort && (
            <span>Effort : {EFFORT_LABELS[finding.effort]}</span>
          )}
          <span>Points : -{finding.pointsLost}</span>
        </div>
      </div>
    </div>
  )
}
