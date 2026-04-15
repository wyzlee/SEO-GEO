'use client'

import type { PhaseWithFindings } from '@/lib/hooks/use-audits'

const PHASE_SHORT: Record<string, string> = {
  technical: 'Technique',
  structured_data: 'Data',
  geo: 'GEO',
  entity: 'Entity',
  eeat: 'E-E-A-T',
  freshness: 'Fraîcheur',
  international: 'Int.',
  performance: 'Perf',
  topical: 'Topic',
  common_mistakes: 'Erreurs',
}

function ratioColor(score: number | null, max: number): string {
  if (score === null || max === 0) return 'var(--color-muted)'
  const ratio = score / max
  if (ratio >= 0.8) return 'var(--color-green)'
  if (ratio >= 0.5) return 'var(--color-amber)'
  return 'var(--color-red)'
}

export function ScoreBreakdownChart({
  phases,
}: {
  phases: PhaseWithFindings[]
}) {
  const scored = phases.filter((p) => p.phaseKey !== 'synthesis')
  const totalMax = scored.reduce((acc, p) => acc + p.scoreMax, 0) || 1

  return (
    <div className="space-y-3">
      <div
        className="flex h-6 rounded-lg overflow-hidden"
        style={{
          background: 'var(--color-bgAlt)',
          border: '1px solid var(--color-border)',
        }}
      >
        {scored.map((phase) => {
          const widthPct = (phase.scoreMax / totalMax) * 100
          const filledPct =
            phase.scoreMax > 0
              ? ((phase.score ?? 0) / phase.scoreMax) * 100
              : 0
          const color = ratioColor(phase.score, phase.scoreMax)
          return (
            <div
              key={phase.id}
              className="relative border-r last:border-r-0"
              style={{
                width: `${widthPct}%`,
                borderColor: 'var(--color-border)',
              }}
              title={`${PHASE_SHORT[phase.phaseKey] ?? phase.phaseKey} : ${phase.score ?? 0}/${phase.scoreMax}`}
            >
              <div
                className="h-full"
                style={{
                  width: `${filledPct}%`,
                  background: color,
                  opacity: 0.9,
                }}
              />
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {scored.map((phase) => (
          <div
            key={phase.id}
            className="text-[11px] font-[family-name:var(--font-sans)] flex items-center gap-2"
          >
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ background: ratioColor(phase.score, phase.scoreMax) }}
              aria-hidden="true"
            />
            <span
              className="truncate"
              style={{ color: 'var(--color-muted)' }}
            >
              {PHASE_SHORT[phase.phaseKey] ?? phase.phaseKey}
            </span>
            <span
              className="ml-auto tabular-nums"
              style={{ color: 'var(--color-text)' }}
            >
              {phase.score ?? 0}/{phase.scoreMax}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
