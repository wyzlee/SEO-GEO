'use client'

import { toast } from 'sonner'
import { Globe, FileCode2, Trash2, AlertCircle } from 'lucide-react'
import { useOrgAudits, useAdminDeleteAudit, type AdminAuditRow } from '@/lib/hooks/use-admin'
import { useAdminContext } from '@/app/admin/layout'

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  queued: {
    label: 'En attente',
    color: 'var(--color-muted)',
    bg: 'color-mix(in srgb, var(--color-muted) 10%, transparent)',
  },
  running: {
    label: 'En cours',
    color: 'var(--color-accent)',
    bg: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
  },
  completed: {
    label: 'Terminé',
    color: 'var(--color-green)',
    bg: 'color-mix(in srgb, var(--color-green) 10%, transparent)',
  },
  failed: {
    label: 'Erreur',
    color: 'var(--color-red)',
    bg: 'color-mix(in srgb, var(--color-red) 10%, transparent)',
  },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status,
    color: 'var(--color-muted)',
    bg: 'color-mix(in srgb, var(--color-muted) 10%, transparent)',
  }
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-[family-name:var(--font-sans)] font-medium"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      {cfg.label}
    </span>
  )
}

// ─── Audit target cell ────────────────────────────────────────────────────────

function AuditTarget({ audit }: { audit: AdminAuditRow }) {
  const isUrl = audit.inputType === 'url'
  return (
    <div className="flex items-start gap-2">
      <div
        className="flex items-center justify-center rounded shrink-0 mt-0.5"
        style={{
          width: 22,
          height: 22,
          background: isUrl
            ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)'
            : 'color-mix(in srgb, var(--color-green) 10%, transparent)',
        }}
        aria-hidden="true"
      >
        {isUrl ? (
          <Globe size={12} style={{ color: 'var(--color-accent)' }} />
        ) : (
          <FileCode2 size={12} style={{ color: 'var(--color-green)' }} />
        )}
      </div>
      <div className="min-w-0">
        <div
          className="text-[13px] font-[family-name:var(--font-sans)] truncate max-w-[200px]"
          style={{ color: 'var(--color-text)' }}
          title={audit.targetUrl ?? undefined}
        >
          {audit.targetUrl ?? (
            <span style={{ color: 'var(--color-muted)' }}>Upload code</span>
          )}
        </div>
        <div
          className="text-[10px] font-[family-name:var(--font-sans)] uppercase tracking-wider mt-0.5"
          style={{ color: 'var(--color-muted)' }}
        >
          {audit.mode}
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminOrgAuditsPage() {
  const { orgId, orgName, isSuperAdmin } = useAdminContext()
  const { data, isLoading, isError } = useOrgAudits(orgId)
  const deleteAudit = useAdminDeleteAudit()

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      'Supprimer cet audit ? Cette action est irréversible.',
    )
    if (!confirmed) return
    try {
      await deleteAudit.mutateAsync(id)
      toast.success('Audit supprimé')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression')
    }
  }

  // Super-admins: filter by selected org client-side (all audits endpoint)
  // Org-admins: endpoint is super-admin gated → handled via isError
  const allAudits = data?.audits ?? []
  const filtered = orgId
    ? allAudits.filter((a) => a.organizationId === orgId)
    : allAudits

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-[family-name:var(--font-display)] font-bold"
          style={{ color: 'var(--color-text)' }}
        >
          Audits
          {orgName && (
            <span
              className="ml-2 text-xl font-normal"
              style={{ color: 'var(--color-muted)' }}
            >
              — {orgName}
            </span>
          )}
        </h1>
        <p
          className="text-sm mt-1 font-[family-name:var(--font-sans)]"
          style={{ color: 'var(--color-muted)' }}
        >
          {isLoading
            ? 'Chargement…'
            : `${filtered.length} audit${filtered.length !== 1 ? 's' : ''}${filtered.length >= 200 ? ' — 200 max affichés' : ''}`}
        </p>
      </div>

      {/* Table */}
      {isError && !isSuperAdmin ? (
        <div
          className="card-premium flex items-start gap-3 p-5"
          role="alert"
        >
          <AlertCircle size={16} aria-hidden="true" style={{ color: 'var(--color-amber)', flexShrink: 0, marginTop: 2 }} />
          <div>
            <p className="text-sm font-[family-name:var(--font-display)] font-semibold" style={{ color: 'var(--color-text)' }}>
              Accès non disponible
            </p>
            <p className="text-xs font-[family-name:var(--font-sans)] mt-1" style={{ color: 'var(--color-muted)' }}>
              La vue des audits par organisation est en cours de déploiement pour les admins d'organisation.
              Revenez prochainement ou contactez un super-admin.
            </p>
          </div>
        </div>
      ) : !orgId ? (
        <div
          className="card-premium text-sm font-[family-name:var(--font-sans)] text-center py-12"
          style={{ color: 'var(--color-muted)' }}
        >
          Aucune organisation sélectionnée.
          {' '}
          Utilisez le sélecteur dans la barre latérale.
        </div>
      ) : isLoading ? (
        <div
          className="card-premium p-6 text-sm font-[family-name:var(--font-sans)]"
          role="status"
          style={{ color: 'var(--color-muted)' }}
        >
          Chargement des audits…
        </div>
      ) : !filtered.length ? (
        <div
          className="card-premium p-6 text-sm font-[family-name:var(--font-sans)]"
          style={{ color: 'var(--color-muted)' }}
        >
          Aucun audit pour cette organisation.
        </div>
      ) : (
        <div className="card-premium overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table
              className="w-full min-w-[640px]"
              aria-label="Audits de l'organisation"
            >
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  {['URL / Mode', 'Statut', 'Score', 'Date', 'Actions'].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className="text-left px-4 py-3 text-[11px] font-[family-name:var(--font-display)] uppercase tracking-wider"
                      style={{ color: 'var(--color-muted)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((audit) => {
                  const isPendingDelete =
                    deleteAudit.isPending && deleteAudit.variables === audit.id

                  return (
                    <tr
                      key={audit.id}
                      style={{ borderBottom: '1px solid var(--color-border)' }}
                    >
                      {/* URL / Mode */}
                      <td className="px-4 py-3 max-w-[260px]">
                        <AuditTarget audit={audit} />
                      </td>

                      {/* Statut */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <StatusBadge status={audit.status} />
                          {audit.status === 'failed' && audit.errorMessage && (
                            <span
                              className="text-[10px] font-[family-name:var(--font-sans)] truncate max-w-[180px]"
                              style={{ color: 'var(--color-red)' }}
                              title={audit.errorMessage}
                            >
                              {audit.errorMessage.slice(0, 60)}
                              {audit.errorMessage.length > 60 ? '…' : ''}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Score */}
                      <td className="px-4 py-3">
                        {audit.scoreTotal == null ? (
                          <span
                            className="text-sm font-[family-name:var(--font-sans)]"
                            style={{ color: 'var(--color-muted)' }}
                          >
                            —
                          </span>
                        ) : (
                          <span
                            className="text-sm font-[family-name:var(--font-display)] font-semibold tabular-nums"
                            style={{
                              color:
                                audit.scoreTotal >= 80
                                  ? 'var(--color-green)'
                                  : audit.scoreTotal >= 60
                                  ? 'var(--color-accent)'
                                  : audit.scoreTotal >= 40
                                  ? 'var(--color-amber)'
                                  : 'var(--color-red)',
                            }}
                          >
                            {audit.scoreTotal}/100
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td
                        className="px-4 py-3 text-[12px] font-[family-name:var(--font-sans)]"
                        style={{ color: 'var(--color-muted)' }}
                      >
                        <div>
                          {new Date(audit.createdAt).toLocaleDateString('fr-FR', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                        <div style={{ opacity: 0.7 }}>
                          {new Date(audit.createdAt).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleDelete(audit.id)}
                          disabled={isPendingDelete}
                          aria-label="Supprimer cet audit"
                          title="Supprimer cet audit"
                          className="flex items-center justify-center rounded transition-colors"
                          style={{
                            width: 44,
                            height: 44,
                            color: 'var(--color-red)',
                            background: 'transparent',
                            opacity: isPendingDelete ? 0.5 : 1,
                            cursor: isPendingDelete ? 'not-allowed' : 'pointer',
                          }}
                        >
                          <Trash2 size={15} aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
