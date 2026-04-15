'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { PhaseWithFindings } from '@/lib/hooks/use-audits'
import { FindingItem } from './finding-item'

const PHASE_LABELS: Record<string, string> = {
  technical: 'Technical SEO',
  structured_data: 'Structured Data 2026',
  geo: 'GEO Readiness',
  entity: 'Entity SEO',
  eeat: 'E-E-A-T Signals',
  freshness: 'Content Freshness',
  international: 'International SEO',
  performance: 'Performance CWV',
  topical: 'Topical Authority',
  common_mistakes: 'Common Mistakes',
  synthesis: 'Synthèse',
}

const STATUS_LABELS: Record<PhaseWithFindings['status'], string> = {
  pending: 'En attente',
  running: 'En cours',
  completed: 'Terminée',
  skipped: 'Ignorée',
  failed: 'En échec',
}

function ratioColor(score: number | null, max: number) {
  if (score === null || max === 0) return 'var(--color-muted)'
  const ratio = score / max
  if (ratio >= 0.8) return 'var(--color-green)'
  if (ratio >= 0.5) return 'var(--color-amber)'
  return 'var(--color-red)'
}

export function PhaseCard({ phase }: { phase: PhaseWithFindings }) {
  const label = PHASE_LABELS[phase.phaseKey] ?? phase.phaseKey
  const [expanded, setExpanded] = useState(
    phase.findings.length > 0 && phase.status === 'completed',
  )
  const scoreColor = ratioColor(phase.score, phase.scoreMax)

  const toggle = () => setExpanded((v) => !v)

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
      }}
    >
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        aria-expanded={expanded}
      >
        <span
          className="shrink-0"
          style={{ color: 'var(--color-muted)' }}
          aria-hidden="true"
        >
          {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] uppercase tracking-wider font-[family-name:var(--font-display)]"
            style={{ color: 'var(--color-muted)' }}>
            Phase {phase.phaseOrder} · {STATUS_LABELS[phase.status]}
          </span>
          <span className="block font-[family-name:var(--font-display)] font-semibold text-[15px]">
            {label}
          </span>
        </span>
        <span
          className="shrink-0 font-[family-name:var(--font-sans)] text-sm font-semibold"
          style={{ color: scoreColor }}
        >
          {phase.score ?? 0}/{phase.scoreMax}
        </span>
      </button>

      {expanded && (
        <div
          className="px-4 pb-4 pt-1"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          {phase.summary && (
            <p
              className="text-[13px] py-2 font-[family-name:var(--font-sans)]"
              style={{ color: 'var(--color-muted)' }}
            >
              {phase.summary}
            </p>
          )}
          {phase.findings.length === 0 ? (
            <p
              className="text-[13px] py-2 font-[family-name:var(--font-sans)]"
              style={{ color: 'var(--color-muted)' }}
            >
              Aucun constat à signaler pour cette phase.
            </p>
          ) : (
            phase.findings.map((f) => <FindingItem key={f.id} finding={f} />)
          )}
        </div>
      )}
    </div>
  )
}
