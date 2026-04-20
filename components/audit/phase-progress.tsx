'use client'

import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react'
import type { PhaseWithFindings } from '@/lib/hooks/use-audits'

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

interface PhaseProgressProps {
  phases: PhaseWithFindings[]
  auditStatus: 'queued' | 'running' | 'completed' | 'failed'
}

function PhaseStepIcon({ status }: { status: PhaseWithFindings['status'] }) {
  if (status === 'completed') {
    return (
      <CheckCircle2
        size={20}
        aria-hidden="true"
        style={{ color: 'var(--color-green)', flexShrink: 0 }}
      />
    )
  }
  if (status === 'running') {
    return (
      <Loader2
        size={20}
        aria-hidden="true"
        className="phase-progress-spinner"
        style={{ color: 'var(--color-amber)', flexShrink: 0 }}
      />
    )
  }
  if (status === 'failed') {
    return (
      <XCircle
        size={20}
        aria-hidden="true"
        style={{ color: 'var(--color-red)', flexShrink: 0 }}
      />
    )
  }
  return (
    <Circle
      size={20}
      aria-hidden="true"
      style={{ color: 'var(--color-border)', flexShrink: 0 }}
    />
  )
}

function phaseScoreColor(score: number | null, max: number): string {
  if (score === null || max === 0) return 'var(--color-muted)'
  const ratio = score / max
  if (ratio >= 0.8) return 'var(--color-green)'
  if (ratio >= 0.5) return 'var(--color-amber)'
  return 'var(--color-red)'
}

export function PhaseProgress({ phases, auditStatus }: PhaseProgressProps) {
  const completedCount = phases.filter(
    (p) => p.status === 'completed' || p.status === 'skipped',
  ).length
  const totalCount = phases.length
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <div
      className="rounded-lg p-5 space-y-5"
      style={{
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
      }}
      role="status"
      aria-live="polite"
      aria-label={`Progression de l'audit : ${completedCount} phase${completedCount > 1 ? 's' : ''} sur ${totalCount} terminée${completedCount > 1 ? 's' : ''}`}
    >
      {/* Barre de progression globale */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span
            className="text-xs uppercase tracking-wider font-[family-name:var(--font-display)]"
            style={{ color: 'var(--color-muted)' }}
          >
            {auditStatus === 'queued'
            ? 'En attente de démarrage'
            : auditStatus === 'running'
              ? 'Analyse en cours'
              : auditStatus === 'failed'
                ? 'Analyse interrompue'
                : 'Analyse terminée'}
          </span>
          <span
            className="text-xs font-[family-name:var(--font-sans)] tabular-nums"
            style={{ color: 'var(--color-muted)' }}
          >
            {completedCount}/{totalCount} phases
          </span>
        </div>
        <div
          className="h-1.5 rounded-full overflow-hidden"
          style={{ background: 'var(--color-border)' }}
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${progressPct}% de l'audit complété`}
        >
          <div
            className="h-full rounded-full phase-progress-bar"
            style={{
              width: `${progressPct}%`,
              background: auditStatus === 'failed'
                ? 'var(--color-red)'
                : progressPct === 100
                  ? 'var(--color-green)'
                  : 'var(--color-accent)',
            }}
          />
        </div>
      </div>

      {/* Stepper vertical */}
      {phases.length > 0 && (
        <ol className="space-y-0" aria-label="Étapes de l'audit">
          {phases.map((phase, index) => {
            const label = PHASE_LABELS[phase.phaseKey] ?? phase.phaseKey
            const isLast = index === phases.length - 1
            const isDone = phase.status === 'completed' || phase.status === 'skipped'
            const scoreColor = phaseScoreColor(phase.score, phase.scoreMax)

            return (
              <li key={phase.id} className="flex gap-3">
                {/* Colonne icône + connecteur */}
                <div className="flex flex-col items-center" style={{ width: 20 }}>
                  <PhaseStepIcon status={phase.status} />
                  {!isLast && (
                    <div
                      className="w-px flex-1 my-1"
                      style={{
                        background: isDone ? 'var(--color-green)' : 'var(--color-border)',
                        minHeight: 16,
                        opacity: isDone ? 0.5 : 0.3,
                      }}
                      aria-hidden="true"
                    />
                  )}
                </div>

                {/* Contenu */}
                <div
                  className="pb-3 min-w-0 flex-1 flex items-start justify-between gap-3"
                  style={{ paddingTop: 1 }}
                >
                  <div className="min-w-0">
                    <span
                      className="block text-[13px] font-[family-name:var(--font-display)] font-medium leading-tight"
                      style={{
                        color: phase.status === 'pending'
                          ? 'var(--color-muted)'
                          : 'var(--color-text)',
                      }}
                    >
                      {label}
                    </span>
                    {phase.status === 'running' && (
                      <span
                        className="block text-[11px] font-[family-name:var(--font-sans)] mt-0.5"
                        style={{ color: 'var(--color-amber)' }}
                      >
                        En cours…
                      </span>
                    )}
                    {phase.status === 'failed' && (
                      <span
                        className="block text-[11px] font-[family-name:var(--font-sans)] mt-0.5 truncate"
                        style={{ color: 'var(--color-red)' }}
                        title={phase.summary ?? undefined}
                      >
                        {phase.summary ? phase.summary.slice(0, 60) : 'Phase en échec'}
                      </span>
                    )}
                  </div>

                  {/* Score partiel si disponible */}
                  {phase.score !== null && (
                    <span
                      className="text-[12px] font-[family-name:var(--font-sans)] font-semibold tabular-nums shrink-0"
                      style={{ color: scoreColor }}
                    >
                      {phase.score}/{phase.scoreMax}
                    </span>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      )}

      {phases.length === 0 && (
        <p
          className="text-[13px] font-[family-name:var(--font-sans)]"
          style={{ color: 'var(--color-muted)' }}
        >
          Initialisation de l&apos;audit en cours…
        </p>
      )}

      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .phase-progress-spinner {
            animation: spin 1s linear infinite;
          }
          .phase-progress-bar {
            transition: width 400ms cubic-bezier(0.4, 0, 0.2, 1);
          }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .phase-progress-spinner {
            animation: none;
          }
          .phase-progress-bar {
            transition: width 0.01ms;
          }
        }
      `}</style>
    </div>
  )
}
