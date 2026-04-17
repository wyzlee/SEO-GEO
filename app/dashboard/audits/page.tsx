'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Globe, Github, FileArchive, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/header'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { useAudits, useDeleteAudit } from '@/lib/hooks/use-audits'
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

type StatusFilter = AuditRow['status'] | 'all'

const INPUT_ICONS: Record<AuditRow['inputType'], typeof Globe> = {
  url: Globe,
  github: Github,
  zip: FileArchive,
}

export default function AuditsListPage() {
  const { data, isLoading } = useAudits()
  const allAudits = data?.audits ?? []
  const deleteAudit = useDeleteAudit()

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const handleDelete = (id: string, label: string) => {
    if (pendingDeleteId !== id) {
      setPendingDeleteId(id)
      return
    }
    deleteAudit.mutate(id, {
      onSuccess: () => {
        toast.success(`Audit supprimé : ${label}`)
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

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = {
      all: allAudits.length,
      queued: 0,
      running: 0,
      completed: 0,
      failed: 0,
    }
    for (const a of allAudits) c[a.status]++
    return c
  }, [allAudits])

  const audits = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return allAudits.filter((a) => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false
      if (!needle) return true
      return (
        a.targetUrl?.toLowerCase().includes(needle) ||
        a.githubRepo?.toLowerCase().includes(needle) ||
        a.clientName?.toLowerCase().includes(needle)
      )
    })
  }, [allAudits, statusFilter, search])

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Audits' },
        ]}
      />
      <PageHeader
        title="Audits"
        description="Historique complet des audits de votre organisation."
        actions={
          <Link href="/dashboard/audits/new" className="btn-primary">
            Nouvel audit
          </Link>
        }
      />

      <section className="p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-md flex-1 min-w-[200px]"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            <Search size={16} style={{ color: 'var(--color-muted)' }} />
            <input
              type="text"
              placeholder="Rechercher URL, dépôt, client…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm font-[family-name:var(--font-sans)] outline-none"
              style={{ color: 'var(--color-text)' }}
            />
          </div>

          <div className="flex items-center gap-1 rounded-md p-1"
            style={{ background: 'var(--color-bgAlt)', border: '1px solid var(--color-border)' }}>
            {(['all', 'queued', 'running', 'completed', 'failed'] as StatusFilter[]).map((status) => {
              const active = statusFilter === status
              const label = status === 'all' ? 'Tous' : STATUS_STYLES[status].label
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className="px-3 py-1.5 text-xs font-[family-name:var(--font-display)] rounded transition-colors"
                  style={{
                    background: active ? 'var(--color-surface)' : 'transparent',
                    color: active ? 'var(--color-text)' : 'var(--color-muted)',
                    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  {label}
                  <span className="ml-1.5 tabular-nums opacity-75">{counts[status]}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="card-premium">
          {isLoading ? (
            <p className="text-sm py-6 text-center" style={{ color: 'var(--color-muted)' }}>
              Chargement…
            </p>
          ) : allAudits.length === 0 ? (
            <div className="text-center py-16">
              <h2 className="text-xl font-semibold font-[family-name:var(--font-display)]">
                Aucun audit pour l&apos;instant
              </h2>
              <p
                className="mt-2 text-sm max-w-md mx-auto"
                style={{ color: 'var(--color-muted)' }}
              >
                Lancez votre premier audit pour voir les constats, le scoring
                sur 100 points et le rapport livrable apparaître ici.
              </p>
              <Link
                href="/dashboard/audits/new"
                className="btn-primary mt-6 inline-flex"
              >
                Lancer un audit
              </Link>
            </div>
          ) : audits.length === 0 ? (
            <p className="text-sm py-10 text-center" style={{ color: 'var(--color-muted)' }}>
              Aucun audit ne correspond à votre recherche.
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
                  <th className="pb-3"></th>
                </tr>
              </thead>
              <tbody>
                {audits.map((audit) => {
                  const style = STATUS_STYLES[audit.status]
                  const Icon = INPUT_ICONS[audit.inputType] ?? Globe
                  const target =
                    audit.targetUrl || audit.githubRepo || 'Upload code'
                  const isPending = pendingDeleteId === audit.id
                  const isDeleting = deleteAudit.isPending && isPending
                  return (
                    <tr
                      key={audit.id}
                      className="border-b"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <td className="py-3 max-w-[260px]">
                        <span className="flex items-center gap-2 truncate">
                          <Icon
                            size={14}
                            className="shrink-0"
                            style={{ color: 'var(--color-muted)' }}
                          />
                          <span className="truncate">{target}</span>
                        </span>
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
                      <td className="py-3 text-right pl-2">
                        <button
                          type="button"
                          onClick={() => handleDelete(audit.id, target)}
                          onBlur={() => {
                            if (pendingDeleteId === audit.id && !deleteAudit.isPending) {
                              setPendingDeleteId(null)
                            }
                          }}
                          disabled={isDeleting}
                          aria-label={isPending ? `Confirmer la suppression de ${target}` : `Supprimer l'audit ${target}`}
                          className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded transition-all font-[family-name:var(--font-sans)]"
                          style={{
                            color: isPending ? 'var(--color-red)' : 'var(--color-muted)',
                            background: isPending ? 'color-mix(in srgb, var(--color-red) 10%, transparent)' : 'transparent',
                            border: `1px solid ${isPending ? 'var(--color-red)' : 'transparent'}`,
                            cursor: isDeleting ? 'progress' : 'pointer',
                            opacity: isDeleting ? 0.6 : 1,
                          }}
                        >
                          <Trash2 size={13} />
                          {isPending ? (isDeleting ? 'Suppression…' : 'Confirmer ?') : 'Supprimer'}
                        </button>
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
