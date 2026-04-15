'use client'

import type { FindingRow, PhaseWithFindings } from '@/lib/hooks/use-audits'
import { FindingItem } from './finding-item'

const SEVERITY_WEIGHT: Record<FindingRow['severity'], number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
}

export function CriticalFindings({
  phases,
  limit = 5,
}: {
  phases: PhaseWithFindings[]
  limit?: number
}) {
  const all = phases.flatMap((p) => p.findings)
  const critical = all
    .filter((f) => f.severity === 'critical' || f.severity === 'high')
    .sort((a, b) => {
      const diff = SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity]
      if (diff !== 0) return diff
      return b.pointsLost - a.pointsLost
    })
    .slice(0, limit)

  if (critical.length === 0) return null

  return (
    <div
      className="rounded-lg p-5"
      style={{
        background: 'var(--color-card)',
        border: '1px solid var(--color-red)',
      }}
    >
      <div className="flex items-baseline justify-between">
        <h2 className="font-[family-name:var(--font-display)] font-semibold text-lg">
          Points à corriger en priorité
        </h2>
        <span
          className="text-xs font-[family-name:var(--font-sans)]"
          style={{ color: 'var(--color-muted)' }}
        >
          Top {critical.length} · trié par impact
        </span>
      </div>
      <div className="mt-2">
        {critical.map((f) => (
          <FindingItem key={f.id} finding={f} />
        ))}
      </div>
    </div>
  )
}
