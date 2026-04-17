import type { PhaseWithFindings, FindingRow } from '@/lib/hooks/use-audits'

const MARKETING_PHASES = new Set([
  'geo',
  'eeat',
  'entity',
  'freshness',
  'international',
])

const PHASE_BUSINESS_LABELS: Record<string, { title: string; description: string }> = {
  geo: {
    title: 'Visibilité dans les moteurs IA',
    description: 'ChatGPT, Claude, Perplexity — votre site est-il citable ?',
  },
  eeat: {
    title: 'Crédibilité et autorité',
    description: 'Expertise, expérience, autorité et fiabilité perçues.',
  },
  entity: {
    title: 'Identité de marque',
    description: 'Reconnaissance de votre marque par les moteurs de recherche.',
  },
  freshness: {
    title: 'Fraîcheur du contenu',
    description: 'Votre contenu est-il récent et régulièrement mis à jour ?',
  },
  international: {
    title: 'Ciblage international',
    description: 'Vos signaux de langue et de pays sont-ils corrects ?',
  },
}

const SEVERITY_COLOR: Record<FindingRow['severity'], string> = {
  critical: 'var(--color-red)',
  high: '#f97316',
  medium: 'var(--color-amber)',
  low: 'var(--color-blue)',
  info: 'var(--color-muted)',
}

const SEVERITY_LABEL: Record<FindingRow['severity'], string> = {
  critical: 'Critique',
  high: 'Important',
  medium: 'À améliorer',
  low: 'Mineur',
  info: 'Info',
}

function ratioColor(score: number | null, max: number): string {
  if (score === null || max === 0) return 'var(--color-muted)'
  const r = score / max
  if (r >= 0.8) return 'var(--color-green)'
  if (r >= 0.5) return 'var(--color-amber)'
  return 'var(--color-red)'
}

interface MarketingViewProps {
  phases: PhaseWithFindings[]
}

export function MarketingView({ phases }: MarketingViewProps) {
  const relevant = phases.filter((p) => MARKETING_PHASES.has(p.phaseKey))

  if (relevant.length === 0) {
    return (
      <p
        className="text-sm font-[family-name:var(--font-sans)] py-4"
        style={{ color: 'var(--color-muted)' }}
      >
        Les phases marketing ne sont pas disponibles pour cet audit.
      </p>
    )
  }

  const quickWins = relevant
    .flatMap((p) => p.findings)
    .filter((f) => f.effort === 'quick')
    .slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Quick wins */}
      {quickWins.length > 0 && (
        <div
          className="rounded-xl p-5"
          style={{
            background: 'color-mix(in srgb, var(--color-green) 8%, var(--color-surface))',
            border: '1px solid color-mix(in srgb, var(--color-green) 25%, transparent)',
          }}
        >
          <h3
            className="text-xs uppercase tracking-wider font-[family-name:var(--font-display)] font-semibold mb-3"
            style={{ color: 'var(--color-green)' }}
          >
            Quick wins — gain rapide (&lt; 1h chacun)
          </h3>
          <ul className="space-y-2">
            {quickWins.map((f) => (
              <li
                key={f.id}
                className="flex items-start gap-2 text-sm font-[family-name:var(--font-sans)]"
              >
                <span
                  className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                  style={{ background: SEVERITY_COLOR[f.severity] }}
                  aria-hidden="true"
                />
                <span>{f.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Phase cards */}
      {relevant.map((phase) => {
        const meta = PHASE_BUSINESS_LABELS[phase.phaseKey]
        const color = ratioColor(phase.score, phase.scoreMax)
        const pct =
          phase.scoreMax > 0 && phase.score !== null
            ? Math.round((phase.score / phase.scoreMax) * 100)
            : 0

        return (
          <div
            key={phase.id}
            className="rounded-xl overflow-hidden"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div className="px-5 py-4">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-[family-name:var(--font-display)] font-semibold text-[15px]">
                    {meta?.title ?? phase.phaseKey}
                  </h3>
                  {meta?.description && (
                    <p
                      className="mt-0.5 text-xs font-[family-name:var(--font-sans)]"
                      style={{ color: 'var(--color-muted)' }}
                    >
                      {meta.description}
                    </p>
                  )}
                </div>
                <span
                  className="shrink-0 text-sm font-[family-name:var(--font-display)] font-bold tabular-nums"
                  style={{ color }}
                >
                  {pct}%
                </span>
              </div>
              <div
                className="mt-3 h-1.5 rounded-full overflow-hidden"
                style={{ background: 'var(--color-border)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: color }}
                />
              </div>
            </div>

            {phase.findings.length > 0 && (
              <div
                className="px-5 pb-4 space-y-3"
                style={{ borderTop: '1px solid var(--color-border)' }}
              >
                <p
                  className="pt-3 text-[11px] uppercase tracking-wider font-[family-name:var(--font-display)]"
                  style={{ color: 'var(--color-muted)' }}
                >
                  {phase.findings.length} constat{phase.findings.length > 1 ? 's' : ''}
                </p>
                {phase.findings.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-start gap-3 text-sm"
                  >
                    <span
                      className="w-2 h-2 rounded-full mt-1 shrink-0"
                      style={{ background: SEVERITY_COLOR[f.severity] }}
                      aria-hidden="true"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="font-[family-name:var(--font-display)] font-medium text-[13px]">
                          {f.title}
                        </span>
                        <span
                          className="text-[11px] font-[family-name:var(--font-sans)]"
                          style={{ color: SEVERITY_COLOR[f.severity] }}
                        >
                          {SEVERITY_LABEL[f.severity]}
                        </span>
                      </div>
                      <p
                        className="mt-0.5 text-[12px] font-[family-name:var(--font-sans)] leading-relaxed"
                        style={{ color: 'var(--color-muted)' }}
                      >
                        {f.description}
                      </p>
                      <p
                        className="mt-1 text-[12px] font-[family-name:var(--font-sans)] leading-relaxed"
                        style={{ color: 'var(--color-text)' }}
                      >
                        <span className="font-semibold">Action : </span>
                        {f.recommendation}
                      </p>
                    </div>
                    {f.pointsLost > 0 && (
                      <span
                        className="shrink-0 text-[11px] font-[family-name:var(--font-display)] font-semibold tabular-nums"
                        style={{ color: SEVERITY_COLOR[f.severity] }}
                      >
                        -{f.pointsLost}pt
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
