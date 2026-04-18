'use client'

import Link from 'next/link'
import { PageHeader } from '@/components/layout/header'
import { useOrgUsage } from '@/lib/hooks/use-org-usage'

const PLAN_LABELS: Record<string, string> = {
  discovery: 'Découverte',
  studio: 'Studio',
  agency: 'Agency',
}

const STATUS_LABELS: Record<string, string> = {
  queued: 'En attente',
  running: 'En cours',
  completed: 'Terminé',
  failed: 'Échoué',
}

const STATUS_COLORS: Record<string, string> = {
  queued: 'var(--color-muted)',
  running: 'var(--color-blue)',
  completed: 'var(--color-green)',
  failed: 'var(--color-red)',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function QuotaBar({ used, limit }: { used: number; limit: number | null }) {
  if (limit === null) {
    return (
      <span
        className="text-sm font-[family-name:var(--font-sans)]"
        style={{ color: 'var(--color-green)' }}
      >
        Illimité
      </span>
    )
  }

  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0
  const barColor =
    pct > 90
      ? 'var(--color-red)'
      : pct > 70
        ? 'var(--color-amber)'
        : '#4F46E5'

  return (
    <div className="space-y-2">
      <div
        className="text-sm font-[family-name:var(--font-sans)]"
        style={{ color: 'var(--color-text)' }}
      >
        <span className="font-bold">{used}</span>
        <span style={{ color: 'var(--color-muted)' }}> / {limit} audits ce mois</span>
      </div>
      <div
        style={{
          background: 'var(--color-surface)',
          borderRadius: 8,
          height: 8,
          overflow: 'hidden',
          border: '1px solid var(--color-border)',
        }}
      >
        <div
          style={{
            background: barColor,
            width: `${pct}%`,
            height: '100%',
            transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
          }}
        />
      </div>
      <div
        className="text-xs font-[family-name:var(--font-sans)]"
        style={{ color: 'var(--color-muted)' }}
      >
        {Math.round(pct)}% du quota mensuel utilisé
      </div>
    </div>
  )
}

function DayBars({ auditsByDay }: { auditsByDay: { date: string; count: number }[] }) {
  if (auditsByDay.length === 0) {
    return (
      <p
        className="text-sm font-[family-name:var(--font-sans)]"
        style={{ color: 'var(--color-muted)' }}
      >
        Aucun audit sur les 30 derniers jours.
      </p>
    )
  }

  const maxCount = Math.max(...auditsByDay.map((d) => d.count), 1)

  return (
    <div
      className="flex items-end gap-1"
      role="img"
      aria-label="Activité des audits sur 30 jours"
      style={{ height: 64 }}
    >
      {auditsByDay.map((day) => {
        const heightPct = Math.max((day.count / maxCount) * 100, 8)
        return (
          <div
            key={day.date}
            title={`${day.date} — ${day.count} audit${day.count > 1 ? 's' : ''}`}
            style={{
              flex: 1,
              height: `${heightPct}%`,
              background: '#4F46E5',
              borderRadius: '3px 3px 0 0',
              opacity: 0.8,
              minWidth: 4,
              transition: 'height 0.2s ease-out',
            }}
          />
        )
      })}
    </div>
  )
}

function UsageSkeleton() {
  return (
    <div className="space-y-4 p-4 md:p-6" role="status" aria-label="Chargement…">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="card-premium animate-pulse"
          style={{ height: 80 }}
        />
      ))}
    </div>
  )
}

export default function UsagePage() {
  const { data, isLoading, error } = useOrgUsage()

  const planLabel = data ? (PLAN_LABELS[data.plan] ?? data.plan) : null

  return (
    <div>
      <PageHeader
        title="Utilisation"
        description="Quota mensuel et historique d'activité de votre organisation."
      />

      <nav
        className="px-6 py-3 flex items-center gap-2 text-xs font-[family-name:var(--font-sans)]"
        style={{ color: 'var(--color-muted)' }}
        aria-label="Fil d'Ariane"
      >
        <Link
          href="/dashboard"
          className="hover:underline"
          style={{ color: 'var(--color-muted)' }}
        >
          Dashboard
        </Link>
        <span aria-hidden="true">/</span>
        <span style={{ color: 'var(--color-text)' }}>Utilisation</span>
      </nav>

      {isLoading ? (
        <UsageSkeleton />
      ) : error ? (
        <div className="p-4 md:p-6">
          <div
            className="card-premium text-sm text-center py-8"
            style={{ color: 'var(--color-red)' }}
          >
            Impossible de charger les données d&apos;utilisation.
          </div>
        </div>
      ) : data ? (
        <div className="p-4 md:p-6 space-y-6">
          {/* Card quota */}
          <section
            className="card-premium space-y-4"
            aria-labelledby="quota-heading"
          >
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2
                id="quota-heading"
                className="text-base font-semibold font-[family-name:var(--font-display)]"
              >
                Quota mensuel
              </h2>
              {planLabel && (
                <span
                  className="text-xs font-[family-name:var(--font-sans)] px-3 py-1 rounded-full"
                  style={{
                    background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--color-accent) 25%, transparent)',
                    color: 'var(--color-accent)',
                  }}
                >
                  Plan {planLabel}
                </span>
              )}
            </div>
            <QuotaBar used={data.auditUsage} limit={data.auditLimit} />
            {data.auditLimit !== null && data.plan !== 'agency' && (
              <p
                className="text-xs font-[family-name:var(--font-sans)]"
                style={{ color: 'var(--color-muted)' }}
              >
                Le quota se renouvelle le 1er de chaque mois.{' '}
                {data.auditUsage >= (data.auditLimit ?? 0) && (
                  <Link
                    href="/dashboard/settings"
                    className="underline"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    Passer au plan supérieur
                  </Link>
                )}
              </p>
            )}
          </section>

          {/* Activité 30 jours */}
          <section
            className="card-premium space-y-4"
            aria-labelledby="activity-heading"
          >
            <h2
              id="activity-heading"
              className="text-base font-semibold font-[family-name:var(--font-display)]"
            >
              Activité — 30 derniers jours
            </h2>
            <DayBars auditsByDay={data.auditsByDay} />
            <p
              className="text-xs font-[family-name:var(--font-sans)]"
              style={{ color: 'var(--color-muted)' }}
            >
              {data.auditsByDay.reduce((s, d) => s + d.count, 0)} audit(s) sur la période
            </p>
          </section>

          {/* Tableau audits récents */}
          <section
            className="card-premium space-y-4"
            aria-labelledby="recent-heading"
          >
            <h2
              id="recent-heading"
              className="text-base font-semibold font-[family-name:var(--font-display)]"
            >
              Derniers audits
            </h2>

            {data.recentAudits.length === 0 ? (
              <div className="text-center py-10">
                <p
                  className="text-sm font-[family-name:var(--font-sans)]"
                  style={{ color: 'var(--color-muted)' }}
                >
                  Aucun audit pour l&apos;instant.
                </p>
                <Link
                  href="/dashboard/audits/new"
                  className="btn-primary mt-4 inline-flex"
                >
                  Lancer un audit
                </Link>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table
                  className="w-full text-sm font-[family-name:var(--font-sans)]"
                  style={{ borderCollapse: 'collapse' }}
                >
                  <thead>
                    <tr
                      style={{
                        borderBottom: '1px solid var(--color-border)',
                        color: 'var(--color-muted)',
                      }}
                    >
                      <th
                        className="text-left pb-2 pr-4 text-xs font-[family-name:var(--font-display)] uppercase tracking-wider"
                        scope="col"
                      >
                        URL
                      </th>
                      <th
                        className="text-left pb-2 pr-4 text-xs font-[family-name:var(--font-display)] uppercase tracking-wider"
                        scope="col"
                      >
                        Statut
                      </th>
                      <th
                        className="text-right pb-2 pr-4 text-xs font-[family-name:var(--font-display)] uppercase tracking-wider"
                        scope="col"
                      >
                        Score
                      </th>
                      <th
                        className="text-right pb-2 text-xs font-[family-name:var(--font-display)] uppercase tracking-wider"
                        scope="col"
                      >
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentAudits.map((audit, idx) => (
                      <tr
                        key={audit.id}
                        style={{
                          borderBottom:
                            idx < data.recentAudits.length - 1
                              ? '1px solid var(--color-border)'
                              : 'none',
                        }}
                      >
                        <td className="py-3 pr-4" style={{ maxWidth: 260 }}>
                          <Link
                            href={`/dashboard/audits/${audit.id}`}
                            className="hover:underline truncate block"
                            style={{ color: 'var(--color-accent)' }}
                            title={audit.targetUrl ?? audit.id}
                          >
                            {audit.targetUrl
                              ? audit.targetUrl.replace(/^https?:\/\//, '')
                              : audit.id.slice(0, 8) + '…'}
                          </Link>
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{
                              background: `color-mix(in srgb, ${STATUS_COLORS[audit.status] ?? 'var(--color-muted)'} 12%, transparent)`,
                              color: STATUS_COLORS[audit.status] ?? 'var(--color-muted)',
                              border: `1px solid color-mix(in srgb, ${STATUS_COLORS[audit.status] ?? 'var(--color-muted)'} 25%, transparent)`,
                            }}
                          >
                            {STATUS_LABELS[audit.status] ?? audit.status}
                          </span>
                        </td>
                        <td
                          className="py-3 pr-4 text-right font-bold font-[family-name:var(--font-display)]"
                          style={{ color: 'var(--color-text)' }}
                        >
                          {audit.scoreTotal !== null
                            ? `${Math.round(audit.scoreTotal)}/100`
                            : '—'}
                        </td>
                        <td
                          className="py-3 text-right"
                          style={{ color: 'var(--color-muted)', whiteSpace: 'nowrap' }}
                        >
                          {formatDate(audit.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {data.recentAudits.length > 0 && (
              <Link
                href="/dashboard/audits"
                className="btn-secondary inline-flex"
              >
                Voir tous les audits
              </Link>
            )}
          </section>
        </div>
      ) : null}

      <style>{`
        @media (prefers-reduced-motion: reduce) {
          * {
            transition-duration: 0.01ms !important;
            animation-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  )
}
