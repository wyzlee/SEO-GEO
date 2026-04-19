'use client'

import { useRef, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  useAdminUsers,
  useAdminSyncUsers,
  useAdminToggleSuperAdmin,
  useAdminDeleteUser,
  useAdminSendMagicLink,
  useAdminResetPassword,
  useAdminToggleActive,
  useAdminChangeEmail,
} from '@/lib/hooks/use-admin'
import {
  ShieldCheck,
  ShieldOff,
  Trash2,
  User,
  RefreshCw,
  MoreHorizontal,
  Mail,
  KeyRound,
  UserX,
  UserCheck,
  Pencil,
  Check,
  X,
} from 'lucide-react'

// ─── User actions dropdown ────────────────────────────────────────────────────

function UserActionsDropdown({
  user,
  isSelf,
  onToggleSuperAdmin,
  onDelete,
}: {
  user: {
    id: string
    email: string
    displayName: string | null
    isSuperAdmin: boolean
    isActive: boolean
    memberships: unknown[]
  }
  isSelf: boolean
  onToggleSuperAdmin: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const [emailEditActive, setEmailEditActive] = useState(false)
  const [emailInput, setEmailInput] = useState(user.email)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const sendMagicLink = useAdminSendMagicLink()
  const resetPassword = useAdminResetPassword()
  const toggleActive = useAdminToggleActive()
  const changeEmail = useAdminChangeEmail()

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  async function handleSendMagicLink() {
    setOpen(false)
    try {
      await sendMagicLink.mutateAsync(user.id)
      toast.success(`Magic link envoyé à ${user.email}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'envoi')
    }
  }

  async function handleResetPassword() {
    setOpen(false)
    try {
      await resetPassword.mutateAsync(user.id)
      toast.success('Email de reset envoyé')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors du reset')
    }
  }

  async function handleToggleActive() {
    setOpen(false)
    if (!user.isActive) {
      // Reactivate — no confirm needed
    } else {
      const ok = window.confirm(`Désactiver le compte de ${user.email} ? L'utilisateur ne pourra plus se connecter.`)
      if (!ok) return
    }
    try {
      await toggleActive.mutateAsync({ id: user.id, isActive: !user.isActive })
      toast.success(user.isActive ? 'Compte désactivé' : 'Compte réactivé')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur')
    }
  }

  function openEmailEdit() {
    setEmailInput(user.email)
    setEmailEditActive(true)
    setOpen(false)
  }

  async function handleChangeEmail() {
    if (!emailInput || emailInput === user.email) {
      setEmailEditActive(false)
      return
    }
    try {
      await changeEmail.mutateAsync({ id: user.id, email: emailInput })
      toast.success(`Email mis à jour : ${emailInput}`)
      setEmailEditActive(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur')
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Inline email edit */}
      {emailEditActive && (
        <div
          className="absolute right-0 bottom-full mb-1 z-50 flex items-center gap-1 p-2 rounded-lg shadow-lg"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            minWidth: 260,
          }}
        >
          <label htmlFor={`email-edit-${user.id}`} className="sr-only">
            Nouvel email pour {user.email}
          </label>
          <input
            id={`email-edit-${user.id}`}
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleChangeEmail()
              if (e.key === 'Escape') setEmailEditActive(false)
            }}
            className="input-modern text-sm font-[family-name:var(--font-sans)] flex-1"
            style={{ minHeight: 36, paddingTop: 6, paddingBottom: 6 }}
            autoFocus
          />
          <button
            type="button"
            onClick={handleChangeEmail}
            disabled={changeEmail.isPending}
            aria-label="Confirmer le changement d'email"
            className="flex items-center justify-center rounded transition-colors"
            style={{
              minWidth: 32,
              minHeight: 32,
              color: 'var(--color-green)',
              background: 'color-mix(in srgb, var(--color-green) 10%, transparent)',
            }}
          >
            <Check size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setEmailEditActive(false)}
            aria-label="Annuler le changement d'email"
            className="flex items-center justify-center rounded transition-colors"
            style={{
              minWidth: 32,
              minHeight: 32,
              color: 'var(--color-muted)',
            }}
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Actions pour ${user.email}`}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center justify-center rounded transition-colors"
        style={{
          minWidth: 32,
          minHeight: 32,
          color: 'var(--color-muted)',
          background: open
            ? 'color-mix(in srgb, var(--color-accent) 8%, transparent)'
            : 'transparent',
        }}
        onMouseEnter={(e) => {
          if (!open) {
            ;(e.currentTarget as HTMLElement).style.color = 'var(--color-text)'
            ;(e.currentTarget as HTMLElement).style.background =
              'color-mix(in srgb, var(--color-accent) 4%, transparent)'
          }
        }}
        onMouseLeave={(e) => {
          if (!open) {
            ;(e.currentTarget as HTMLElement).style.color = 'var(--color-muted)'
            ;(e.currentTarget as HTMLElement).style.background = 'transparent'
          }
        }}
      >
        <MoreHorizontal size={15} aria-hidden="true" />
      </button>

      {/* Dropdown menu */}
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 z-50 rounded-lg py-1"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            minWidth: 200,
          }}
        >
          {/* Magic link */}
          <button
            type="button"
            role="menuitem"
            onClick={handleSendMagicLink}
            disabled={sendMagicLink.isPending}
            className="flex items-center gap-2 w-full px-3 py-2 text-left text-[12px] transition-colors font-[family-name:var(--font-sans)]"
            style={{ color: 'var(--color-text)' }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLElement).style.background =
                'color-mix(in srgb, var(--color-accent) 6%, transparent)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLElement).style.background = 'transparent'
            }}
          >
            <Mail size={13} aria-hidden="true" style={{ color: 'var(--color-muted)', flexShrink: 0 }} />
            Envoyer un magic link
          </button>

          {/* Reset password */}
          <button
            type="button"
            role="menuitem"
            onClick={handleResetPassword}
            disabled={resetPassword.isPending}
            className="flex items-center gap-2 w-full px-3 py-2 text-left text-[12px] transition-colors font-[family-name:var(--font-sans)]"
            style={{ color: 'var(--color-text)' }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLElement).style.background =
                'color-mix(in srgb, var(--color-accent) 6%, transparent)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLElement).style.background = 'transparent'
            }}
          >
            <KeyRound size={13} aria-hidden="true" style={{ color: 'var(--color-muted)', flexShrink: 0 }} />
            Réinitialiser le mot de passe
          </button>

          {/* Toggle active */}
          <button
            type="button"
            role="menuitem"
            onClick={handleToggleActive}
            disabled={isSelf || toggleActive.isPending}
            className="flex items-center gap-2 w-full px-3 py-2 text-left text-[12px] transition-colors font-[family-name:var(--font-sans)]"
            style={{
              color: isSelf ? 'var(--color-muted)' : (user.isActive ? 'var(--color-amber)' : 'var(--color-green)'),
              opacity: isSelf ? 0.5 : 1,
              cursor: isSelf ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!isSelf) {
                ;(e.currentTarget as HTMLElement).style.background =
                  'color-mix(in srgb, var(--color-accent) 6%, transparent)'
              }
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLElement).style.background = 'transparent'
            }}
          >
            {user.isActive
              ? <UserX size={13} aria-hidden="true" style={{ flexShrink: 0 }} />
              : <UserCheck size={13} aria-hidden="true" style={{ flexShrink: 0 }} />
            }
            {user.isActive ? 'Désactiver le compte' : 'Réactiver le compte'}
          </button>

          {/* Change email */}
          <button
            type="button"
            role="menuitem"
            onClick={openEmailEdit}
            disabled={isSelf}
            className="flex items-center gap-2 w-full px-3 py-2 text-left text-[12px] transition-colors font-[family-name:var(--font-sans)]"
            style={{
              color: 'var(--color-text)',
              opacity: isSelf ? 0.5 : 1,
              cursor: isSelf ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!isSelf) {
                ;(e.currentTarget as HTMLElement).style.background =
                  'color-mix(in srgb, var(--color-accent) 6%, transparent)'
              }
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLElement).style.background = 'transparent'
            }}
          >
            <Pencil size={13} aria-hidden="true" style={{ color: 'var(--color-muted)', flexShrink: 0 }} />
            Changer l&apos;email
          </button>

          {/* Separator */}
          <div
            aria-hidden="true"
            className="my-1"
            style={{ borderTop: '1px solid var(--color-border)' }}
          />

          {/* Toggle super-admin */}
          <button
            type="button"
            role="menuitem"
            onClick={() => { setOpen(false); onToggleSuperAdmin() }}
            disabled={isSelf}
            className="flex items-center gap-2 w-full px-3 py-2 text-left text-[12px] transition-colors font-[family-name:var(--font-sans)]"
            style={{
              color: user.isSuperAdmin ? 'var(--color-red)' : 'var(--color-text)',
              opacity: isSelf ? 0.5 : 1,
              cursor: isSelf ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!isSelf) {
                ;(e.currentTarget as HTMLElement).style.background =
                  'color-mix(in srgb, var(--color-accent) 6%, transparent)'
              }
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLElement).style.background = 'transparent'
            }}
          >
            {user.isSuperAdmin
              ? <ShieldOff size={13} aria-hidden="true" style={{ flexShrink: 0 }} />
              : <ShieldCheck size={13} aria-hidden="true" style={{ flexShrink: 0 }} />
            }
            {user.isSuperAdmin ? 'Retirer super-admin' : 'Accorder super-admin'}
          </button>

          {/* Delete */}
          <button
            type="button"
            role="menuitem"
            onClick={() => { setOpen(false); onDelete() }}
            disabled={isSelf}
            className="flex items-center gap-2 w-full px-3 py-2 text-left text-[12px] transition-colors font-[family-name:var(--font-sans)]"
            style={{
              color: 'var(--color-red)',
              opacity: isSelf ? 0.5 : 1,
              cursor: isSelf ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!isSelf) {
                ;(e.currentTarget as HTMLElement).style.background =
                  'color-mix(in srgb, var(--color-red) 6%, transparent)'
              }
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLElement).style.background = 'transparent'
            }}
          >
            <Trash2 size={13} aria-hidden="true" style={{ flexShrink: 0 }} />
            Supprimer
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

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
      <div className="card-premium p-0">
        {isLoading ? (
          <div className="p-6 text-sm" role="status" style={{ color: 'var(--color-muted)' }}>Chargement…</div>
        ) : !data?.users.length ? (
          <div className="p-6 text-sm" style={{ color: 'var(--color-muted)' }}>Aucun utilisateur.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                {['Utilisateur', 'Statut', 'Organisations', 'Inscrit le', 'Actions'].map((h) => (
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

                return (
                  <tr
                    key={user.id}
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                      opacity: user.isActive ? 1 : 0.65,
                    }}
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

                    {/* Colonne statut */}
                    <td className="px-4 py-3">
                      <span
                        className="text-[10px] px-2 py-0.5 rounded font-[family-name:var(--font-sans)]"
                        style={
                          user.isActive
                            ? {
                                background: 'color-mix(in srgb, var(--color-green) 12%, transparent)',
                                color: 'var(--color-green)',
                                border: '1px solid color-mix(in srgb, var(--color-green) 25%, transparent)',
                              }
                            : {
                                background: 'color-mix(in srgb, var(--color-red) 12%, transparent)',
                                color: 'var(--color-red)',
                                border: '1px solid color-mix(in srgb, var(--color-red) 25%, transparent)',
                              }
                        }
                      >
                        {user.isActive ? 'Actif' : 'Inactif'}
                      </span>
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

                    {/* Colonne actions — dropdown unique */}
                    <td className="px-4 py-3">
                      <UserActionsDropdown
                        user={user}
                        isSelf={selfUser}
                        onToggleSuperAdmin={() => handleToggleSuperAdmin(user.id, user.isSuperAdmin)}
                        onDelete={() => handleDelete(user.id, user.email)}
                      />
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
