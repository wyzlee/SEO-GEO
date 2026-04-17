import type { PhaseWithFindings } from '@/lib/hooks/use-audits'

const PHASE_LABELS: Record<string, string> = {
  technical: 'Technique',
  structured_data: 'Schémas',
  geo: 'GEO',
  entity: 'Entité',
  eeat: 'E-E-A-T',
  freshness: 'Fraîcheur',
  international: 'Intl',
  performance: 'Perfs',
  topical: 'Topical',
  common_mistakes: 'Erreurs',
}

interface RadarChartProps {
  phases: PhaseWithFindings[]
  size?: number
}

export function RadarChart({ phases, size = 240 }: RadarChartProps) {
  const active = phases.filter(
    (p) => p.status !== 'skipped' && p.scoreMax > 0 && p.score !== null,
  )
  if (active.length < 3) return null

  const cx = size / 2
  const cy = size / 2
  const r = size * 0.36
  const labelR = size * 0.48
  const n = active.length
  const step = (2 * Math.PI) / n

  function angle(i: number) {
    return -Math.PI / 2 + i * step
  }

  function point(ratio: number, i: number) {
    const a = angle(i)
    return {
      x: cx + ratio * r * Math.cos(a),
      y: cy + ratio * r * Math.sin(a),
    }
  }

  // Grid rings at 25%, 50%, 75%, 100%
  const rings = [0.25, 0.5, 0.75, 1]

  // Axes lines
  const axes = active.map((_, i) => {
    const p = point(1, i)
    return `M ${cx} ${cy} L ${p.x} ${p.y}`
  })

  // Score polygon
  const scorePoints = active.map((p, i) => {
    const ratio = p.score! / p.scoreMax
    return point(Math.min(ratio, 1), i)
  })
  const polygon =
    scorePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + ' Z'

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-label="Radar des scores par phase"
      role="img"
    >
      {/* Grid rings */}
      {rings.map((ratio) => {
        const pts = active.map((_, i) => {
          const p = point(ratio, i)
          return `${p.x.toFixed(1)},${p.y.toFixed(1)}`
        })
        return (
          <polygon
            key={ratio}
            points={pts.join(' ')}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth="1"
          />
        )
      })}

      {/* Axes */}
      {axes.map((d, i) => (
        <path
          key={i}
          d={d}
          stroke="var(--color-border)"
          strokeWidth="1"
          fill="none"
        />
      ))}

      {/* Score fill */}
      <path
        d={polygon}
        fill="color-mix(in srgb, var(--color-accent) 20%, transparent)"
        stroke="var(--color-accent)"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Labels */}
      {active.map((p, i) => {
        const a = angle(i)
        const lx = cx + labelR * Math.cos(a)
        const ly = cy + labelR * Math.sin(a)
        const label = PHASE_LABELS[p.phaseKey] ?? p.phaseKey
        return (
          <text
            key={p.id}
            x={lx.toFixed(1)}
            y={ly.toFixed(1)}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="9"
            fontFamily="var(--font-display)"
            fill="var(--color-muted)"
          >
            {label}
          </text>
        )
      })}
    </svg>
  )
}
