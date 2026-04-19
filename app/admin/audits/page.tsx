'use client'

import { toast } from 'sonner'
import { useAdminAudits, useAdminDeleteAudit, type AdminAuditRow } from '@/lib/hooks/use-admin'
import { Trash2, Globe, FileCode2 } from 'lucide-react'

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
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    color: 'var(--color-muted)',
    bg: 'color-mix(in srgb, var(--color-muted) 10%, transparent)',
  }

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-[family-name:var(--font-sans)] font-medium"
      style={{ color: config.color, background: config.bg }}
    >
      {config.label}
    </span>
  )
}

// ─── Audit row ────────────────────────────────────────────────────────────────

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
        {isUrl
          ? <Globe size={12} style={{ color: 'var(--color-accent)' }} />
          : <FileCode2 size={12} style={{ color: 'var(--color-green)' }} />
        }
      </div>
      <div>
        <div className="text-xs font-[family-name:var(--font-sans)]" style={{ color: 'var(--color-text)' }}>
          {audit.targetUrl
            ? <span title={audit.targetUrl}>{audit.targetUrl.length > 48 ? `${audit.targetUrl.slice(0, 48)}…` : audit.targetUrl}</span>
            : <span style={{ color: 'var(--color-muted)' }}>Upload code</span>
          }
        </div>
        <div className="text-[10px] font-[family-name:var(--font-sans)] uppercase tracking-wider mt-0.5" style={{ color: 'var(--color-muted)' }}>
          {audit.mode}
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminAuditsPage() {
  const { data, isLoading } = useAdminAudits()
  const deleteAudit = useAdminDeleteAudit()

  async function handleDelete(id: string) {
    const ok = window.confirm('Supprimer cet audit ? Cette action est irréversible.')
    if (!ok) return
    try {
      await deleteAudit.mutateAsync(id)
      toast.success('Audit supprimé')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur')
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-[family-name:var(--font-display)] font-bold"
          style={{ color: 'var(--color-text)' }}
        >
          Audits
        </h1>
        <p className="text-sm mt-1 font-[family-name:var(--font-sans)]" style={{ color: 'var(--color-muted)' }}>
          {data?.audits.length ?? '—'} audit{(data?.audits.length ?? 0) !== 1 ? 's' : ''}
          {(data?.audits.length ?? 0) >= 200 && (
            <span className="ml-1" style={{ color: 'var(--color-muted)' }}>— 200 max affichés</span>
          )}
        </p>
      </div>

      {/* Table */}
      <div className="card-premium overflow-hidden p-0">
        {isLoading ? (
          <div className="p-6 text-sm" role="status" style={{ color: 'var(--color-muted)' }}>Chargement…</div>
        ) : !data?.audits.length ? (
          <div className="p-6 text-sm" style={{ color: 'var(--color-muted)' }}>Aucun audit.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  {['Organisation', 'URL / Mode', 'Statut', 'Score', 'Créé le', 'Actions'].map((h) => (
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
                {data.audits.map((audit) => {
                  const isPendingDelete = deleteAudit.isPending && deleteAudit.variables === audit.id

                  return (
                    <tr
                      key={audit.id}
                      style={{ borderBottom: '1px solid var(--color-border)' }}
                    >
                      {/* Organisation */}
                      <td className="px-4 py-3">
                        <div className="text-sm font-[family-name:var(--font-display)] font-semibold" style={{ color: 'var(--color-text)' }}>
                          {audit.organizationName}
                        </div>
                        <div className="text-[11px] font-[family-name:var(--font-sans)] truncate max-w-[160px]" style={{ color: 'var(--color-muted)' }} title={audit.createdByEmail}>
                          {audit.createdByEmail}
                        </div>
                      </td>

                      {/* URL / Mode */}
                      <td className="px-4 py-3 max-w-[240px]">
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
                              {audit.errorMessage.slice(0, 60)}{audit.errorMessage.length > 60 ? '…' : ''}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Score */}
                      <td className="px-4 py-3">
                        {audit.scoreTotal == null ? (
                          <span className="text-sm font-[family-name:var(--font-sans)]" style={{ color: 'var(--color-muted)' }}>—</span>
                        ) : (
                          <span
                            className="text-sm font-[family-name:var(--font-display)] font-semibold tabular-nums"
                            style={{
                              color: audit.scoreTotal >= 80
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
                      <td className="px-4 py-3 text-xs font-[family-name:var(--font-sans)]" style={{ color: 'var(--color-muted)' }}>
                        <div>{new Date(audit.createdAt).toLocaleDateString('fr-FR')}</div>
                        <div style={{ color: 'var(--color-muted)', opacity: 0.7 }}>
                          {new Date(audit.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleDelete(audit.id)}
                          disabled={isPendingDelete}
                          className="flex items-center justify-center rounded transition-colors"
                          style={{
                            minWidth: 44,
                            minHeight: 44,
                            color: 'var(--color-red)',
                            background: 'transparent',
                            opacity: isPendingDelete ? 0.5 : 1,
                            cursor: isPendingDelete ? 'not-allowed' : 'pointer',
                          }}
                          aria-label="Supprimer cet audit"
                          title="Supprimer cet audit"
                        >
                          <Trash2 size={16} aria-hidden="true" />
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
    </div>
  )
}
