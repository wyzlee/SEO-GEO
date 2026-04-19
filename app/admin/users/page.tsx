'use client'

import { toast } from 'sonner'
import {
  useAdminUsers,
  useAdminSyncUsers,
  useAdminToggleSuperAdmin,
  useAdminDeleteUser,
} from '@/lib/hooks/use-admin'
import { ShieldCheck, ShieldOff, Trash2, User, RefreshCw } from 'lucide-react'

export default function AdminUsersPage() {
  const { data, isLoading } = useAdminUsers()
  const syncUsers = useAdminSyncUsers()
  const toggleSuperAdmin = useAdminToggleSuperAdmin()
  const deleteUser = useAdminDeleteUser()

  async function handleSync() {
    try {
      const result = await syncUsers.mutateAsync()
      toast.success(`${result.synced} utilisateur${result.synced !== 1 ? 's' : ''} synchronisé${result.synced !== 1 ? 's' : ''}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur de synchronisation')
    }
  }

  async function handleToggleSuperAdmin(id: string, current: boolean) {
    // Confirmation uniquement pour activer le statut super-admin
    if (!current) {
      const ok = window.confirm('Accorder le statut super-admin à cet utilisateur ?')
      if (!ok) return
    }
    try {
      await toggleSuperAdmin.mutateAsync({ id, isSuperAdmin: !current })
      toast.success(!current ? 'Statut super-admin accordé' : 'Statut super-admin retiré')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur')
    }
  }

  async function handleDelete(id: string, email: string) {
    const ok = window.confirm(`Supprimer cet utilisateur ? Cette action est irréversible.\n\n${email}`)
    if (!ok) return
    try {
      await deleteUser.mutateAsync(id)
      toast.success('Utilisateur supprimé')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur')
    }
  }

  // Heuristique : désactiver les actions sur les super-admins sans membership
  // (évite l'auto-suppression quand userId n'est pas exposé par /api/admin/me)
  function isSelf(user: { isSuperAdmin: boolean; memberships: unknown[] }): boolean {
    return user.isSuperAdmin && user.memberships.length === 0
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-[family-name:var(--font-display)] font-bold"
            style={{ color: 'var(--color-text)' }}
          >
            Utilisateurs
          </h1>
          <p className="text-sm mt-1 font-[family-name:var(--font-sans)]" style={{ color: 'var(--color-muted)' }}>
            {data?.users.length ?? '—'} utilisateur{(data?.users.length ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>

        <button
          type="button"
          onClick={handleSync}
          disabled={syncUsers.isPending}
          className="btn-secondary flex items-center gap-2 text-sm"
          style={{ minHeight: 44, minWidth: 44 }}
          aria-label="Synchroniser les utilisateurs depuis Stack Auth"
        >
          <RefreshCw
            size={15}
            aria-hidden="true"
            className={syncUsers.isPending ? 'animate-spin' : ''}
          />
          {syncUsers.isPending ? 'Synchronisation…' : 'Synchroniser Stack Auth'}
        </button>
      </div>

      {/* Table */}
      <div className="card-premium overflow-hidden p-0">
        {isLoading ? (
          <div className="p-6 text-sm" role="status" style={{ color: 'var(--color-muted)' }}>Chargement…</div>
        ) : !data?.users.length ? (
          <div className="p-6 text-sm" style={{ color: 'var(--color-muted)' }}>Aucun utilisateur.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                {['Utilisateur', 'Organisations', 'Inscrit le', 'Actions'].map((h) => (
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
              {data.users.map((user) => {
                const selfUser = isSelf(user)
                const isPendingToggle = toggleSuperAdmin.isPending && toggleSuperAdmin.variables?.id === user.id
                const isPendingDelete = deleteUser.isPending && deleteUser.variables === user.id

                return (
                  <tr
                    key={user.id}
                    style={{ borderBottom: '1px solid var(--color-border)' }}
                  >
                    {/* Colonne utilisateur */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="flex items-center justify-center rounded-full shrink-0"
                          style={{
                            width: 28,
                            height: 28,
                            background: user.isSuperAdmin
                              ? 'color-mix(in srgb, var(--color-red) 12%, transparent)'
                              : 'color-mix(in srgb, var(--color-muted) 12%, transparent)',
                          }}
                          aria-hidden="true"
                        >
                          {user.isSuperAdmin
                            ? <ShieldCheck size={14} style={{ color: 'var(--color-red)' }} />
                            : <User size={14} style={{ color: 'var(--color-muted)' }} />
                          }
                        </div>
                        <div>
                          <div className="text-sm font-[family-name:var(--font-display)] font-semibold" style={{ color: 'var(--color-text)' }}>
                            {user.displayName || user.email}
                          </div>
                          <div className="text-[11px] font-[family-name:var(--font-sans)]" style={{ color: 'var(--color-muted)' }}>
                            {user.displayName ? user.email : null}
                            {user.isSuperAdmin && (
                              <span className="ml-1" style={{ color: 'var(--color-red)' }}>super-admin</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Colonne organisations */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {user.memberships.length === 0 ? (
                          <span className="text-xs" style={{ color: 'var(--color-muted)' }}>—</span>
                        ) : user.memberships.map((m) => (
                          <div key={m.organizationId} className="flex items-center gap-1.5">
                            <span className="text-xs font-[family-name:var(--font-sans)]" style={{ color: 'var(--color-text)' }}>
                              {m.organizationName}
                            </span>
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded font-[family-name:var(--font-sans)]"
                              style={{
                                background: 'color-mix(in srgb, var(--color-muted) 10%, transparent)',
                                color: 'var(--color-muted)',
                              }}
                            >
                              {m.role}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>

                    {/* Colonne date */}
                    <td className="px-4 py-3 text-xs font-[family-name:var(--font-sans)]" style={{ color: 'var(--color-muted)' }}>
                      {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                    </td>

                    {/* Colonne actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {/* Toggle super-admin */}
                        <button
                          type="button"
                          onClick={() => handleToggleSuperAdmin(user.id, user.isSuperAdmin)}
                          disabled={selfUser || isPendingToggle}
                          className="flex items-center justify-center rounded transition-colors"
                          style={{
                            minWidth: 44,
                            minHeight: 44,
                            color: user.isSuperAdmin ? 'var(--color-red)' : 'var(--color-muted)',
                            background: 'transparent',
                            opacity: selfUser ? 0.35 : 1,
                            cursor: selfUser ? 'not-allowed' : 'pointer',
                          }}
                          aria-label={user.isSuperAdmin ? 'Retirer le statut super-admin' : 'Accorder le statut super-admin'}
                          title={selfUser ? 'Impossible de modifier votre propre compte' : (user.isSuperAdmin ? 'Retirer super-admin' : 'Accorder super-admin')}
                        >
                          {user.isSuperAdmin
                            ? <ShieldOff size={16} aria-hidden="true" />
                            : <ShieldCheck size={16} aria-hidden="true" />
                          }
                        </button>

                        {/* Supprimer */}
                        <button
                          type="button"
                          onClick={() => handleDelete(user.id, user.email)}
                          disabled={selfUser || isPendingDelete}
                          className="flex items-center justify-center rounded transition-colors"
                          style={{
                            minWidth: 44,
                            minHeight: 44,
                            color: 'var(--color-red)',
                            background: 'transparent',
                            opacity: selfUser ? 0.35 : 1,
                            cursor: selfUser ? 'not-allowed' : 'pointer',
                          }}
                          aria-label={`Supprimer l'utilisateur ${user.email}`}
                          title={selfUser ? 'Impossible de supprimer votre propre compte' : 'Supprimer cet utilisateur'}
                        >
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
