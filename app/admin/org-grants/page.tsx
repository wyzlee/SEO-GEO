'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  ShieldCheck,
  ShieldOff,
  X,
} from 'lucide-react'
import {
  useAdminOrgGrants,
  useAdminGrantOrgAccess,
  useAdminRevokeOrgAccess,
  useAdminUsers,
  useAdminOrganizations,
} from '@/lib/hooks/use-admin'

export default function AdminOrgGrantsPage() {
  const { data: grantsData, isLoading } = useAdminOrgGrants()
  const { data: usersData } = useAdminUsers()
  const { data: orgsData } = useAdminOrganizations()

  const grantAccess = useAdminGrantOrgAccess()
  const revokeAccess = useAdminRevokeOrgAccess()

  const [showForm, setShowForm] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedOrgId, setSelectedOrgId] = useState('')

  const grants = grantsData?.grants ?? []

  async function handleGrant(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedUserId || !selectedOrgId) return
    try {
      await grantAccess.mutateAsync({ userId: selectedUserId, orgId: selectedOrgId })
      toast.success('Accès accordé')
      setSelectedUserId('')
      setSelectedOrgId('')
      setShowForm(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'accord d\'accès')
    }
  }

  async function handleRevoke(id: string, email: string, orgName: string) {
    const ok = window.confirm(`Révoquer l'accès admin de ${email} sur « ${orgName} » ?`)
    if (!ok) return
    try {
      await revokeAccess.mutateAsync(id)
      toast.success('Accès révoqué')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la révocation')
    }
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
            Accès cross-org
          </h1>
          <p
            className="text-sm mt-1 font-[family-name:var(--font-sans)]"
            style={{ color: 'var(--color-muted)' }}
          >
            {grants.length} accès admin externe{grants.length !== 1 ? 's' : ''} actif{grants.length !== 1 ? 's' : ''}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="btn-primary flex items-center gap-2 text-sm"
          style={{ minHeight: 44 }}
          aria-expanded={showForm}
        >
          <ShieldCheck size={15} aria-hidden="true" />
          Accorder un accès
        </button>
      </div>

      {/* Grant form */}
      {showForm && (
        <div
          className="rounded-lg p-4"
          style={{
            background: 'color-mix(in srgb, var(--color-accent) 4%, var(--color-surface))',
            border: '1px solid color-mix(in srgb, var(--color-accent) 20%, var(--color-border))',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-[13px] font-[family-name:var(--font-display)] font-semibold"
              style={{ color: 'var(--color-text)' }}
            >
              Accorder un accès admin
            </h2>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex items-center justify-center rounded transition-colors"
              style={{ minWidth: 36, minHeight: 36, color: 'var(--color-muted)' }}
              aria-label="Fermer le formulaire"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>

          <form onSubmit={handleGrant} noValidate>
            <div className="flex flex-wrap gap-3 items-end">
              {/* User select */}
              <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
                <label
                  htmlFor="grant-user"
                  className="text-[11px] font-[family-name:var(--font-display)] uppercase tracking-wider"
                  style={{ color: 'var(--color-muted)' }}
                >
                  Utilisateur
                </label>
                <select
                  id="grant-user"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="input-modern text-sm font-[family-name:var(--font-sans)]"
                  required
                >
                  <option value="">Choisir un utilisateur…</option>
                  {(usersData?.users ?? []).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.email}{u.displayName ? ` — ${u.displayName}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Org select */}
              <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
                <label
                  htmlFor="grant-org"
                  className="text-[11px] font-[family-name:var(--font-display)] uppercase tracking-wider"
                  style={{ color: 'var(--color-muted)' }}
                >
                  Organisation
                </label>
                <select
                  id="grant-org"
                  value={selectedOrgId}
                  onChange={(e) => setSelectedOrgId(e.target.value)}
                  className="input-modern text-sm font-[family-name:var(--font-sans)]"
                  required
                >
                  <option value="">Choisir une organisation…</option>
                  {(orgsData?.organizations ?? []).map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={!selectedUserId || !selectedOrgId || grantAccess.isPending}
                className="btn-primary text-sm flex items-center gap-1.5"
                style={{ minHeight: 44 }}
              >
                <ShieldCheck size={14} aria-hidden="true" />
                {grantAccess.isPending ? 'Accord…' : 'Accorder'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="card-premium overflow-hidden p-0">
        {isLoading ? (
          <div className="p-6 text-sm" role="status" style={{ color: 'var(--color-muted)' }}>
            Chargement…
          </div>
        ) : grants.length === 0 ? (
          <div className="p-6 text-sm" style={{ color: 'var(--color-muted)' }}>
            Aucun accès admin externe configuré.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                {['Utilisateur', 'Organisation', 'Accordé par', 'Date', 'Révoquer'].map((h) => (
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
              {grants.map((grant) => (
                <tr
                  key={grant.id}
                  style={{ borderBottom: '1px solid var(--color-border)' }}
                >
                  {/* User */}
                  <td className="px-4 py-3">
                    <div>
                      <div
                        className="text-sm font-[family-name:var(--font-display)] font-semibold"
                        style={{ color: 'var(--color-text)' }}
                      >
                        {grant.userDisplayName ?? grant.userEmail}
                      </div>
                      {grant.userDisplayName && (
                        <div
                          className="text-[11px] font-[family-name:var(--font-sans)]"
                          style={{ color: 'var(--color-muted)' }}
                        >
                          {grant.userEmail}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Organisation */}
                  <td className="px-4 py-3">
                    <span
                      className="text-sm font-[family-name:var(--font-sans)]"
                      style={{ color: 'var(--color-text)' }}
                    >
                      {grant.orgName}
                    </span>
                  </td>

                  {/* Accordé par */}
                  <td className="px-4 py-3">
                    <span
                      className="text-xs font-[family-name:var(--font-sans)]"
                      style={{ color: 'var(--color-muted)' }}
                    >
                      {grant.grantedByEmail}
                    </span>
                  </td>

                  {/* Date */}
                  <td className="px-4 py-3 text-xs font-[family-name:var(--font-sans)]" style={{ color: 'var(--color-muted)' }}>
                    {new Date(grant.createdAt).toLocaleDateString('fr-FR')}
                  </td>

                  {/* Révoquer */}
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleRevoke(grant.id, grant.userEmail, grant.orgName)}
                      disabled={revokeAccess.isPending && revokeAccess.variables === grant.id}
                      className="flex items-center justify-center rounded transition-colors"
                      style={{
                        minWidth: 44,
                        minHeight: 44,
                        color: 'var(--color-red)',
                        background: 'transparent',
                      }}
                      aria-label={`Révoquer l'accès de ${grant.userEmail} sur ${grant.orgName}`}
                      title="Révoquer cet accès"
                    >
                      <ShieldOff size={16} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
