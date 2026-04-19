'use client'

import { use, useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/layout/header'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { ScoreBadge } from '@/components/audit/score-badge'
import { apiJson } from '@/lib/api/fetch'

// ---------------------------------------------------------------------------
// Types (mirrors lib/audit/benchmark.ts — BenchmarkResults)
// ---------------------------------------------------------------------------

interface BenchmarkRow {
  id: string
  name: string
  mode: 'flash' | 'full'
  status: 'queued' | 'running' | 'completed' | 'failed'
  createdAt: string
  finishedAt: string | null
}

interface AuditRow {
  id: string
  status: string
  scoreTotal: number | null
}

interface BenchmarkUrlWithAudit {
  id: string
  benchmarkId: string
  url: string
  label: string
  isReference: boolean
  auditId: string | null
  audit: AuditRow | null
  scoreBreakdown: Record<string, number> | null
}

interface ComparisonRow {
  phaseKey: string
  scores: Record<string, number> // label → score
  maxScore: number
}

interface BenchmarkResults {
  benchmark: BenchmarkRow
  urls: BenchmarkUrlWithAudit[]
  comparisonTable: ComparisonRow[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<BenchmarkRow['status'], { label: string; color: string }> = {
  queued: { label: 'En file d\'attente', color: 'var(--color-muted)' },
  running: { label: 'Analyse en cours…', color: 'var(--color-blue)' },
  completed: { label: 'Terminé', color: 'var(--color-green)' },
  failed: { label: 'Échec', color: 'var(--color-red)' },
}

const PHASE_LABELS: Record<string, string> = {
  technical: 'Technical SEO',
  structured_data: 'Structured Data',
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

function scoreColor(score: number, maxScore: number): string {
  const ratio = maxScore > 0 ? score / maxScore : 0
  if (ratio >= 0.8) return 'var(--color-green)'
  if (ratio >= 0.5) return 'var(--color-amber)'
  return 'var(--color-red)'
}

const TERMINAL_STATUSES = new Set(['completed', 'failed'])

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function BenchmarkDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [data, setData] = useState<BenchmarkResults | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await apiJson<BenchmarkResults>(`/api/benchmarks/${id}`)
      setData(res)
      setError(null)
      // Stop polling when terminal status reached
      if (TERMINAL_STATUSES.has(res.benchmark.status) && intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    }
  }, [id])

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      setIsLoading(true)
      try {
        const res = await apiJson<BenchmarkResults>(`/api/benchmarks/${id}`)
        if (!cancelled) {
          setData(res)
          setError(null)
          // Start polling only if not yet in terminal state
          if (!TERMINAL_STATUSES.has(res.benchmark.status)) {
            intervalRef.current = setInterval(() => {
              fetchData()
            }, 5000)
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erreur de chargement')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    init()

    return () => {
      cancelled = true
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [id, fetchData])

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Chargement du benchmark" />
        <section className="p-4 md:p-6">
          <div
            className="h-10 w-10 rounded-full border-[3px] animate-spin"
            style={{
              borderColor: 'var(--color-border)',
              borderTopColor: 'var(--color-accent)',
            }}
          />
        </section>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Error state
  // -------------------------------------------------------------------------

  if (error || !data) {
    return (
      <div>
        <PageHeader title="Benchmark introuvable" />
        <section className="p-4 md:p-6">
          <div className="card-premium">
            <p
              className="text-sm font-[family-name:var(--font-sans)]"
              style={{ color: 'var(--color-muted)' }}
            >
              {error ?? 'Ce benchmark n\'existe pas ou n\'est pas accessible.'}
            </p>
            <Link
              href="/dashboard/benchmarks"
              className="btn-secondary mt-4 inline-flex"
            >
              Retour à la liste
            </Link>
          </div>
        </section>
      </div>
    )
  }

  const { benchmark, urls, comparisonTable } = data
  const isRunning = !TERMINAL_STATUSES.has(benchmark.status)
  const statusStyle = STATUS_STYLES[benchmark.status]

  // Labels des colonnes dans le même ordre que urls[]
  const columnLabels = urls.map((u) => u.label)

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Benchmarks', href: '/dashboard/benchmarks' },
          { label: benchmark.name },
        ]}
      />
      <PageHeader
        title={benchmark.name}
        description={`Mode ${benchmark.mode === 'flash' ? 'Flash' : 'Complet'} · ${urls.length} URL${urls.length > 1 ? 's' : ''}`}
        actions={
          <Link
            href="/dashboard/benchmarks"
            className="btn-secondary inline-flex items-center gap-2"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            Retour
          </Link>
        }
      />

      <section className="p-4 md:p-6 space-y-6">
        {/* Status banner */}
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-[family-name:var(--font-sans)]"
          style={{
            background: 'var(--color-surface)',
            border: `1px solid ${statusStyle.color}`,
          }}
        >
          {isRunning && (
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0 animate-pulse"
              style={{ background: statusStyle.color }}
              aria-hidden="true"
            />
          )}
          {!isRunning && (
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ background: statusStyle.color }}
              aria-hidden="true"
            />
          )}
          <span style={{ color: statusStyle.color }}>{statusStyle.label}</span>
          {isRunning && (
            <span style={{ color: 'var(--color-muted)' }}>
              — mise à jour automatique toutes les 5 secondes
            </span>
          )}
        </div>

        {/* Scores totaux par URL */}
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(urls.length, 4)}, 1fr)` }}>
          {urls.map((u) => {
            const total = u.audit?.scoreTotal ?? null
            return (
              <div
                key={u.id}
                className="card-premium flex flex-col items-center gap-3 py-5"
                style={
                  u.isReference
                    ? { border: '2px solid var(--color-accent)' }
                    : undefined
                }
              >
                {u.isReference && (
                  <span
                    className="text-[10px] uppercase tracking-wider font-[family-name:var(--font-display)] font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
                      color: 'var(--color-accent)',
                    }}
                  >
                    Référence
                  </span>
                )}
                <ScoreBadge score={total ?? 0} size="lg" />
                <div className="text-center">
                  <div
                    className="font-[family-name:var(--font-display)] font-semibold text-sm"
                    style={{ color: 'var(--color-text)' }}
                  >
                    {u.label}
                  </div>
                  <div
                    className="text-[11px] mt-0.5 font-[family-name:var(--font-sans)] truncate max-w-[140px]"
                    style={{ color: 'var(--color-muted)' }}
                  >
                    {u.url}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Tableau comparatif par phase */}
        {comparisonTable.length > 0 ? (
          <div className="card-premium overflow-x-auto">
            <h2
              className="text-sm uppercase tracking-wider font-[family-name:var(--font-display)] mb-4"
              style={{ color: 'var(--color-muted)' }}
            >
              Comparatif par phase
            </h2>
            <table className="w-full text-sm font-[family-name:var(--font-sans)]">
              <thead>
                <tr
                  className="text-left border-b"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <th
                    className="pb-3 font-medium font-[family-name:var(--font-display)] pr-6"
                    style={{ color: 'var(--color-text)' }}
                  >
                    Phase
                  </th>
                  {columnLabels.map((label) => {
                    const urlEntry = urls.find((u) => u.label === label)
                    return (
                      <th
                        key={label}
                        className="pb-3 font-medium font-[family-name:var(--font-display)] text-right px-3"
                        style={{
                          color: urlEntry?.isReference
                            ? 'var(--color-accent)'
                            : 'var(--color-text)',
                        }}
                      >
                        {label}
                        {urlEntry?.isReference && (
                          <span
                            className="ml-1 text-[10px]"
                            style={{ color: 'var(--color-accent)' }}
                          >
                            ★
                          </span>
                        )}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {comparisonTable.map((row) => {
                  const scoreValues = Object.values(row.scores)
                  const maxVal = Math.max(...scoreValues)
                  const minVal = Math.min(...scoreValues)

                  return (
                    <tr
                      key={row.phaseKey}
                      className="border-b"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <td
                        className="py-3 pr-6 font-[family-name:var(--font-display)] font-medium"
                        style={{ color: 'var(--color-text)' }}
                      >
                        {PHASE_LABELS[row.phaseKey] ?? row.phaseKey}
                        <span
                          className="ml-2 text-[11px] font-normal"
                          style={{ color: 'var(--color-muted)' }}
                        >
                          /{row.maxScore}
                        </span>
                      </td>
                      {columnLabels.map((label) => {
                        const score = row.scores[label] ?? null

                        let cellColor = 'var(--color-muted)'
                        if (score !== null && scoreValues.length > 1) {
                          if (score === maxVal) cellColor = 'var(--color-green)'
                          else if (score === minVal) cellColor = 'var(--color-red)'
                        } else if (score !== null) {
                          cellColor = scoreColor(score, row.maxScore)
                        }

                        return (
                          <td
                            key={label}
                            className="py-3 px-3 text-right font-semibold tabular-nums"
                            style={{ color: score !== null ? cellColor : 'var(--color-muted)' }}
                          >
                            {score !== null ? score : '—'}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : isRunning ? (
          <div
            className="card-premium text-sm text-center py-10"
            style={{ color: 'var(--color-muted)' }}
          >
            Les résultats par phase apparaîtront une fois les audits terminés.
          </div>
        ) : null}
      </section>
    </div>
  )
}
