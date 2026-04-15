'use client'

import Link from 'next/link'
import { PageHeader } from '@/components/layout/header'
import { useAudits } from '@/lib/hooks/use-audits'
import type { AuditRow } from '@/lib/hooks/use-audits'

const STATUS_STYLES: Record<
  AuditRow['status'],
  { label: string; color: string }
> = {
  queued: { label: 'En file', color: 'var(--color-muted)' },
  running: { label: 'En cours', color: 'var(--color-blue)' },
  completed: { label: 'Terminé', color: 'var(--color-green)' },
  failed: { label: 'Échec', color: 'var(--color-red)' },
}

export default function AuditsListPage() {
  const { data, isLoading } = useAudits()
  const audits = data?.audits ?? []

  return (
    <div>
      <PageHeader
        title="Audits"
        description="Historique complet des audits de votre organisation."
        actions={
          <Link href="/dashboard/audits/new" className="btn-primary">
            Nouvel audit
          </Link>
        }
      />

      <section className="p-6">
        <div className="card-premium">
          {isLoading ? (
            <p className="text-sm py-6 text-center" style={{ color: 'var(--color-muted)' }}>
              Chargement…
            </p>
          ) : audits.length === 0 ? (
            <p className="text-sm py-10 text-center" style={{ color: 'var(--color-muted)' }}>
              Pas encore d&apos;audit. Lancez-en un pour remplir cette vue.
            </p>
          ) : (
            <table className="w-full text-sm font-[family-name:var(--font-sans)]">
              <thead>
                <tr
                  className="text-left border-b"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <th className="pb-3 font-medium">Cible</th>
                  <th className="pb-3 font-medium">Client</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Score</th>
                  <th className="pb-3 font-medium">Créé le</th>
                  <th className="pb-3"></th>
                </tr>
              </thead>
              <tbody>
                {audits.map((audit) => {
                  const style = STATUS_STYLES[audit.status]
                  return (
                    <tr
                      key={audit.id}
                      className="border-b"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <td className="py-3 truncate max-w-[220px]">
                        {audit.targetUrl ?? '—'}
                      </td>
                      <td className="py-3">{audit.clientName ?? '—'}</td>
                      <td className="py-3">
                        <span
                          className="inline-flex items-center gap-1.5 text-xs font-[family-name:var(--font-display)]"
                          style={{ color: style.color }}
                        >
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ background: style.color }}
                            aria-hidden="true"
                          />
                          {style.label}
                        </span>
                      </td>
                      <td className="py-3">
                        {audit.scoreTotal !== null
                          ? `${audit.scoreTotal}/100`
                          : '—'}
                      </td>
                      <td className="py-3">
                        {new Date(audit.createdAt).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          href={`/dashboard/audits/${audit.id}`}
                          className="text-xs font-[family-name:var(--font-sans)]"
                          style={{ color: 'var(--color-accent)' }}
                        >
                          Détail →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  )
}
