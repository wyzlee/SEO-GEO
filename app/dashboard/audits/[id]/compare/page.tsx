'use client'

import { use } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/header'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { ScoreBadge } from '@/components/audit/score-badge'
import { useAudit } from '@/lib/hooks/use-audits'
import {
  useAuditCompare,
  type FindingLite,
  type PhaseDeltaRow,
} from '@/lib/hooks/use-audit-compare'
import { PHASE_LABELS_FR } from '@/lib/report/labels'

export default function AuditComparePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const audit = useAudit(id)
  const compare = useAuditCompare(id)

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Audits', href: '/dashboard/audits' },
          { label: id.slice(0, 8), href: `/dashboard/audits/${id}` },
          { label: 'Évolution' },
        ]}
      />
      <PageHeader
        title="Évolution depuis l'audit précédent"
        description="Comparaison N vs N-1 : score, phases, constats résolus et nouveaux."
        actions={
          <Link href={`/dashboard/audits/${id}`} className="btn-secondary">
            Retour au détail
          </Link>
        }
      />

      <section className="p-6 space-y-6">
        {compare.isLoading || audit.isLoading ? (
          <div
            className="card-premium text-sm py-8 text-center"
            style={{ color: 'var(--color-muted)' }}
          >
            Calcul de l&apos;évolution…
          </div>
        ) : compare.isError ? (
          <NoComparePlaceholder auditId={id} message={extractError(compare.error)} />
        ) : compare.data ? (
          <>
            <DeltaHeader data={compare.data} />
            <PhaseDeltaTable phases={compare.data.result.phases} />
            <FindingsBuckets findings={compare.data.result.findings} />
          </>
        ) : null}
      </section>
    </div>
  )
}

function DeltaHeader({ data }: { data: NonNullable<ReturnType<typeof useAuditCompare>['data']> }) {
  const { currentScore, previousScore, scoreDelta, daysBetween } = data.result
  const deltaColor =
    scoreDelta > 0.5
      ? 'var(--color-green)'
      : scoreDelta < -0.5
        ? 'var(--color-red)'
        : 'var(--color-muted)'
  const deltaSign = scoreDelta > 0 ? '+' : ''

  return (
    <div className="card-premium grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
      <div className="flex items-center gap-4">
        <ScoreBadge score={Math.round(previousScore)} size="sm" />
        <div>
          <div
            className="text-xs uppercase tracking-wider font-[family-name:var(--font-display)]"
            style={{ color: 'var(--color-muted)' }}
          >
            Audit précédent
          </div>
          <div className="text-sm font-[family-name:var(--font-sans)]">
            {data.previous.finishedAt
              ? new Date(data.previous.finishedAt).toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })
              : '—'}
          </div>
        </div>
      </div>

      <div className="text-center">
        <div
          className="text-3xl font-[family-name:var(--font-display)] font-bold tabular-nums"
          style={{ color: deltaColor }}
        >
          {deltaSign}
          {scoreDelta.toFixed(1)}
        </div>
        <div className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
          {daysBetween !== null
            ? `sur ${daysBetween} jour${daysBetween > 1 ? 's' : ''}`
            : 'points'}
        </div>
      </div>

      <div className="flex items-center gap-4 justify-end">
        <div className="text-right">
          <div
            className="text-xs uppercase tracking-wider font-[family-name:var(--font-display)]"
            style={{ color: 'var(--color-muted)' }}
          >
            Audit actuel
          </div>
          <div className="text-sm font-[family-name:var(--font-sans)]">
            {data.current.finishedAt
              ? new Date(data.current.finishedAt).toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })
              : '—'}
          </div>
        </div>
        <ScoreBadge score={Math.round(currentScore)} size="sm" />
      </div>
    </div>
  )
}

function PhaseDeltaTable({ phases }: { phases: PhaseDeltaRow[] }) {
  if (phases.length === 0) return null
  return (
    <div className="card-premium">
      <h2
        className="text-sm uppercase tracking-wider font-[family-name:var(--font-display)] mb-4"
        style={{ color: 'var(--color-muted)' }}
      >
        Évolution par phase
      </h2>
      <table className="w-full text-sm font-[family-name:var(--font-sans)]">
        <thead>
          <tr
            className="text-left border-b"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <th className="pb-2 font-medium">Phase</th>
            <th className="pb-2 font-medium text-right">Avant</th>
            <th className="pb-2 font-medium text-right">Après</th>
            <th className="pb-2 font-medium text-right">Delta</th>
          </tr>
        </thead>
        <tbody>
          {phases.map((p) => (
            <tr
              key={p.phaseKey}
              className="border-b"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <td className="py-2">{PHASE_LABELS_FR[p.phaseKey] ?? p.phaseKey}</td>
              <td className="py-2 text-right tabular-nums">
                {p.previousScore.toFixed(1)}
                <span
                  style={{ color: 'var(--color-muted)' }}
                >{` / ${p.scoreMax}`}</span>
              </td>
              <td className="py-2 text-right tabular-nums">
                {p.currentScore.toFixed(1)}
                <span
                  style={{ color: 'var(--color-muted)' }}
                >{` / ${p.scoreMax}`}</span>
              </td>
              <td
                className="py-2 text-right tabular-nums font-[family-name:var(--font-display)] font-semibold"
                style={{
                  color:
                    p.delta > 0.1
                      ? 'var(--color-green)'
                      : p.delta < -0.1
                        ? 'var(--color-red)'
                        : 'var(--color-muted)',
                }}
              >
                {p.delta > 0 ? '+' : ''}
                {p.delta.toFixed(1)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function FindingsBuckets({
  findings,
}: {
  findings: { resolved: FindingLite[]; introduced: FindingLite[]; persistent: FindingLite[] }
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <FindingsBucket
        title="Résolus"
        count={findings.resolved.length}
        items={findings.resolved}
        color="var(--color-green)"
        emptyMsg="Aucun constat résolu."
      />
      <FindingsBucket
        title="Persistants"
        count={findings.persistent.length}
        items={findings.persistent}
        color="var(--color-amber)"
        emptyMsg="Aucun constat répété."
      />
      <FindingsBucket
        title="Nouveaux"
        count={findings.introduced.length}
        items={findings.introduced}
        color="var(--color-red)"
        emptyMsg="Aucun nouveau constat."
      />
    </div>
  )
}

function FindingsBucket({
  title,
  count,
  items,
  color,
  emptyMsg,
}: {
  title: string
  count: number
  items: FindingLite[]
  color: string
  emptyMsg: string
}) {
  return (
    <div
      className="rounded-lg p-4"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div className="flex items-baseline justify-between mb-3">
        <h3
          className="font-[family-name:var(--font-display)] font-semibold"
          style={{ color }}
        >
          {title}
        </h3>
        <span
          className="text-2xl font-[family-name:var(--font-display)] font-bold tabular-nums"
          style={{ color }}
        >
          {count}
        </span>
      </div>
      {items.length === 0 ? (
        <p
          className="text-xs"
          style={{ color: 'var(--color-muted)' }}
        >
          {emptyMsg}
        </p>
      ) : (
        <ul className="space-y-2">
          {items.slice(0, 6).map((f, idx) => (
            <li
              key={`${f.phaseKey}-${idx}`}
              className="text-xs font-[family-name:var(--font-sans)] leading-snug"
            >
              <span
                className="font-semibold"
                style={{ color: 'var(--color-text)' }}
              >
                {f.title}
              </span>
              {f.pointsLost > 0 ? (
                <span
                  className="ml-1"
                  style={{ color: 'var(--color-muted)' }}
                >
                  · {f.pointsLost} pt{f.pointsLost > 1 ? 's' : ''}
                </span>
              ) : null}
            </li>
          ))}
          {items.length > 6 ? (
            <li
              className="text-xs italic"
              style={{ color: 'var(--color-muted)' }}
            >
              + {items.length - 6} autre{items.length - 6 > 1 ? 's' : ''}…
            </li>
          ) : null}
        </ul>
      )}
    </div>
  )
}

function NoComparePlaceholder({
  auditId,
  message,
}: {
  auditId: string
  message: string
}) {
  return (
    <div className="card-premium text-center py-12">
      <h2 className="text-lg font-[family-name:var(--font-display)] font-semibold">
        Comparaison indisponible
      </h2>
      <p
        className="mt-2 text-sm max-w-md mx-auto"
        style={{ color: 'var(--color-muted)' }}
      >
        {message}
      </p>
      <Link
        href={`/dashboard/audits/${auditId}`}
        className="btn-secondary mt-6 inline-flex"
      >
        Retour au détail
      </Link>
    </div>
  )
}

function extractError(err: unknown): string {
  if (err instanceof Error) return err.message
  return 'Impossible de charger la comparaison.'
}
