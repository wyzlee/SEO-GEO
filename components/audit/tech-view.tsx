import { MapPin } from 'lucide-react'
import type { PhaseWithFindings, FindingRow } from '@/lib/hooks/use-audits'

const TECH_PHASES = new Set([
  'technical',
  'structured_data',
  'performance',
  'topical',
  'common_mistakes',
])

const PHASE_LABELS: Record<string, string> = {
  technical: 'SEO Technique',
  structured_data: 'Données structurées (Schema.org)',
  performance: 'Performance (Core Web Vitals)',
  topical: 'Autorité thématique',
  common_mistakes: 'Erreurs courantes',
}

const EFFORT_BADGE: Record<NonNullable<FindingRow['effort']>, { label: string; color: string }> = {
  quick: { label: '< 1h', color: 'var(--color-green)' },
  medium: { label: '~1j', color: 'var(--color-amber)' },
  heavy: { label: '> 1j', color: 'var(--color-red)' },
}

const SEVERITY_COLOR: Record<FindingRow['severity'], string> = {
  critical: 'var(--color-red)',
  high: '#f97316',
  medium: 'var(--color-amber)',
  low: 'var(--color-blue)',
  info: 'var(--color-muted)',
}

function ratioColor(score: number | null, max: number): string {
  if (score === null || max === 0) return 'var(--color-muted)'
  const r = score / max
  if (r >= 0.8) return 'var(--color-green)'
  if (r >= 0.5) return 'var(--color-amber)'
  return 'var(--color-red)'
}

interface TechViewProps {
  phases: PhaseWithFindings[]
}

export function TechView({ phases }: TechViewProps) {
  const relevant = phases.filter((p) => TECH_PHASES.has(p.phaseKey))

  if (relevant.length === 0) {
    return (
      <p
        className="text-sm font-[family-name:var(--font-sans)] py-4"
        style={{ color: 'var(--color-muted)' }}
      >
        Les phases techniques ne sont pas disponibles pour cet audit.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {relevant.map((phase) => {
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
            {/* Header */}
            <div className="px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-[family-name:var(--font-display)] font-semibold text-[14px] uppercase tracking-wide">
                    {PHASE_LABELS[phase.phaseKey] ?? phase.phaseKey}
                  </h3>
                </div>
                <span
                  className="shrink-0 text-sm font-[family-name:var(--font-sans)] font-bold tabular-nums"
                  style={{ color }}
                >
                  {phase.score ?? 0}/{phase.scoreMax}
                </span>
                <span
                  className="shrink-0 text-xs font-[family-name:var(--font-display)] font-semibold tabular-nums"
                  style={{ color }}
                >
                  {pct}%
                </span>
              </div>
              <div
                className="mt-2 h-1 rounded-full overflow-hidden"
                style={{ background: 'var(--color-border)' }}
              >
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, background: color }}
                />
              </div>
            </div>

            {/* Findings */}
            {phase.findings.length > 0 && (
              <div style={{ borderTop: '1px solid var(--color-border)' }}>
                {phase.findings.map((f) => (
                  <div
                    key={f.id}
                    className="px-5 py-3 flex gap-3"
                    style={{ borderTop: '1px solid var(--color-border)' }}
                  >
                    <span
                      className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                      style={{ background: SEVERITY_COLOR[f.severity] }}
                      aria-hidden="true"
                    />
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="font-[family-name:var(--font-display)] font-semibold text-[13px]">
                          {f.title}
                        </span>
                        {f.effort && (
                          <span
                            className="text-[10px] font-[family-name:var(--font-sans)] px-1.5 py-0.5 rounded-full font-medium"
                            style={{
                              background: `color-mix(in srgb, ${EFFORT_BADGE[f.effort].color} 15%, transparent)`,
                              color: EFFORT_BADGE[f.effort].color,
                            }}
                          >
                            {EFFORT_BADGE[f.effort].label}
                          </span>
                        )}
                        {f.pointsLost > 0 && (
                          <span
                            className="text-[10px] font-[family-name:var(--font-display)] tabular-nums"
                            style={{ color: SEVERITY_COLOR[f.severity] }}
                          >
                            -{f.pointsLost}pt
                          </span>
                        )}
                      </div>

                      {/* Metric */}
                      {(f.metricValue || f.metricTarget) && (
                        <div
                          className="text-[11px] font-[family-name:var(--font-sans)] px-2 py-1 rounded-md inline-flex gap-2"
                          style={{
                            background: 'var(--color-bg)',
                            border: '1px solid var(--color-border)',
                            color: 'var(--color-muted)',
                          }}
                        >
                          {f.metricValue && <span>Mesuré : <strong style={{ color: 'var(--color-text)' }}>{f.metricValue}</strong></span>}
                          {f.metricTarget && <span>Cible : <strong style={{ color: 'var(--color-green)' }}>{f.metricTarget}</strong></span>}
                        </div>
                      )}

                      <p
                        className="text-[12px] font-[family-name:var(--font-sans)] leading-relaxed"
                        style={{ color: 'var(--color-muted)' }}
                      >
                        {f.description}
                      </p>

                      <p
                        className="text-[12px] font-[family-name:var(--font-sans)] leading-relaxed"
                        style={{ color: 'var(--color-text)' }}
                      >
                        <span className="font-semibold">Fix : </span>
                        {f.recommendation}
                      </p>

                      {/* Location */}
                      {(f.locationUrl || f.locationFile) && (
                        <div
                          className="text-[11px] font-[family-name:var(--font-sans)]"
                          style={{ color: 'var(--color-muted)' }}
                        >
                          {f.locationFile ? (
                            <code
                              className="px-1.5 py-0.5 rounded text-[10px]"
                              style={{
                                background: 'var(--color-bg)',
                                color: 'var(--color-accent)',
                                fontFamily: 'var(--font-sans)',
                              }}
                            >
                              {f.locationFile}
                              {f.locationLine != null ? `:${f.locationLine}` : ''}
                            </code>
                          ) : (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 shrink-0" strokeWidth={2} />
                              {f.locationUrl}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {phase.findings.length === 0 && phase.status === 'completed' && (
              <p
                className="px-5 pb-4 text-[12px] font-[family-name:var(--font-sans)]"
                style={{ color: 'var(--color-green)', borderTop: '1px solid var(--color-border)' }}
              >
                Aucun problème détecté pour cette phase.
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
