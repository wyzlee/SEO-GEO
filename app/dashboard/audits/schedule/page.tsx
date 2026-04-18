'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CalendarClock, Globe, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/header'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import {
  useScheduledAudits,
  useDeleteScheduledAudit,
} from '@/lib/hooks/use-scheduled-audits'

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Quotidien',
  weekly: 'Hebdomadaire',
  monthly: 'Mensuel',
}

const MODE_LABELS: Record<string, string> = {
  standard: 'Standard',
  full: 'Complet',
}

export default function ScheduledAuditsPage() {
  const { data, isLoading } = useScheduledAudits()
  const scheduled = data?.scheduledAudits ?? []
  const deleteSchedule = useDeleteScheduledAudit()
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const handleDelete = (id: string, url: string) => {
    if (pendingDeleteId !== id) {
      setPendingDeleteId(id)
      return
    }
    deleteSchedule.mutate(id, {
      onSuccess: () => {
        toast.success(`Planification supprimée : ${url}`)
        setPendingDeleteId(null)
      },
      onError: (err) => {
        toast.error(
          `Suppression échouée : ${err instanceof Error ? err.message : 'erreur inconnue'}`,
        )
        setPendingDeleteId(null)
      },
    })
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Audits', href: '/dashboard/audits' },
          { label: 'Planification' },
        ]}
      />
      <PageHeader
        title="Audits planifiés"
        description="Audits récurrents automatiques pour surveiller vos sites."
        actions={
          <Link href="/dashboard/audits/schedule/new" className="btn-primary">
            Planifier un audit →
          </Link>
        }
      />

      <section className="p-4 md:p-6">
        <div className="card-premium">
          {isLoading ? (
            <p
              className="text-sm py-6 text-center font-[family-name:var(--font-sans)]"
              style={{ color: 'var(--color-muted)' }}
            >
              Chargement…
            </p>
          ) : scheduled.length === 0 ? (
            <div className="text-center py-16">
              <CalendarClock
                size={40}
                className="mx-auto mb-4"
                style={{ color: 'var(--color-muted)' }}
              />
              <h2
                className="text-xl font-semibold font-[family-name:var(--font-display)]"
                style={{ color: 'var(--color-text)' }}
              >
                Aucun audit planifié
              </h2>
              <p
                className="mt-2 text-sm max-w-md mx-auto font-[family-name:var(--font-sans)]"
                style={{ color: 'var(--color-muted)' }}
              >
                Planifiez des audits récurrents pour surveiller votre site
                automatiquement.
              </p>
              <Link
                href="/dashboard/audits/schedule/new"
                className="btn-primary mt-6 inline-flex"
              >
                Planifier un audit →
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
            <table className="w-full min-w-[640px] text-sm font-[family-name:var(--font-sans)]">
              <thead>
                <tr
                  className="text-left border-b"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <th className="pb-3 font-medium">URL cible</th>
                  <th className="pb-3 font-medium">Mode</th>
                  <th className="pb-3 font-medium">Fréquence</th>
                  <th className="pb-3 font-medium">Prochain audit</th>
                  <th className="pb-3 font-medium">Statut</th>
                  <th className="pb-3" />
                </tr>
              </thead>
              <tbody>
                {scheduled.map((s) => {
                  const isPending = pendingDeleteId === s.id
                  const isDeleting = deleteSchedule.isPending && isPending
                  return (
                    <tr
                      key={s.id}
                      className="border-b"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <td className="py-3 max-w-[280px]">
                        <span className="flex items-center gap-2 truncate">
                          <Globe
                            size={14}
                            className="shrink-0"
                            style={{ color: 'var(--color-muted)' }}
                          />
                          <span className="truncate">{s.targetUrl}</span>
                        </span>
                      </td>
                      <td className="py-3">
                        {MODE_LABELS[s.mode] ?? s.mode}
                      </td>
                      <td className="py-3">
                        {FREQUENCY_LABELS[s.frequency] ?? s.frequency}
                      </td>
                      <td className="py-3">
                        {new Date(s.nextRunAt).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3">
                        <span
                          className="inline-flex items-center gap-1.5 text-xs font-[family-name:var(--font-display)]"
                          style={{
                            color: s.isActive
                              ? 'var(--color-green)'
                              : 'var(--color-muted)',
                          }}
                        >
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{
                              background: s.isActive
                                ? 'var(--color-green)'
                                : 'var(--color-muted)',
                            }}
                            aria-hidden="true"
                          />
                          {s.isActive ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="py-3 text-right pl-2">
                        <button
                          type="button"
                          onClick={() => handleDelete(s.id, s.targetUrl)}
                          onBlur={() => {
                            if (
                              pendingDeleteId === s.id &&
                              !deleteSchedule.isPending
                            ) {
                              setPendingDeleteId(null)
                            }
                          }}
                          disabled={isDeleting}
                          aria-label={
                            isPending
                              ? `Confirmer la suppression de ${s.targetUrl}`
                              : `Supprimer la planification ${s.targetUrl}`
                          }
                          className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded transition-all font-[family-name:var(--font-sans)]"
                          style={{
                            color: isPending
                              ? 'var(--color-red)'
                              : 'var(--color-muted)',
                            background: isPending
                              ? 'color-mix(in srgb, var(--color-red) 10%, transparent)'
                              : 'transparent',
                            border: `1px solid ${isPending ? 'var(--color-red)' : 'transparent'}`,
                            cursor: isDeleting ? 'progress' : 'pointer',
                            opacity: isDeleting ? 0.6 : 1,
                          }}
                        >
                          <Trash2 size={13} />
                          {isPending
                            ? isDeleting
                              ? 'Suppression…'
                              : 'Confirmer ?'
                            : 'Supprimer'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
