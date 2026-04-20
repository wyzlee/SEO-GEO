'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { UserPlus, Search, ChevronDown, Trash2 } from 'lucide-react'
import {
  useOrgMembers,
  useOrgAddMember,
  useOrgUpdateMember,
  useOrgRemoveMember,
  useAdminUsers,
  type OrgMember,
} from '@/lib/hooks/use-admin'
import { useAdminContext } from '@/app/admin/layout'

// ─── Role badge ───────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  owner: {
    label: 'Owner',
    color: 'var(--color-accent)',
    bg: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
  },
  admin: {
    label: 'Admin',
    color: 'var(--color-amber)',
    bg: 'color-mix(in srgb, var(--color-amber) 10%, transparent)',
  },
  member: {
    label: 'Membre',
    color: 'var(--color-muted)',
    bg: 'color-mix(in srgb, var(--color-muted) 10%, transparent)',
  },
}

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_CONFIG[role] ?? {
    label: role,
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

// ─── Avatar initials ──────────────────────────────────────────────────────────

function Avatar({ member }: { member: OrgMember }) {
  const initials = (member.displayName ?? member.email)
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  if (member.avatarUrl) {
    return (
      <Image
        src={member.avatarUrl}
        alt=""
        aria-hidden="true"
        width={32}
        height={32}
        className="rounded-full object-cover"
      />
    )
  }

  return (
    <span
      className="flex items-center justify-center rounded-full font-[family-name:var(--font-display)] font-bold text-[11px] shrink-0"
      aria-hidden="true"
      style={{
        width: 32,
        height: 32,
        background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
        color: 'var(--color-accent)',
      }}
    >
      {initials || '?'}
    </span>
  )
}

// ─── Role select inline ───────────────────────────────────────────────────────

const ROLES = ['owner', 'admin', 'member'] as const

function RoleSelect({
  memberId,
  currentRole,
  orgId,
  disabled,
}: {
  memberId: string
  currentRole: string
  orgId: string | null
  disabled?: boolean
}) {
  const update = useOrgUpdateMember(orgId)

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newRole = e.target.value
    if (newRole === currentRole) return
    try {
      await update.mutateAsync({ userId: memberId, role: newRole })
      toast.success('Rôle mis à jour')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la mise à jour')
    }
  }

  return (
    <div className="relative inline-flex items-center">
      <select
        value={currentRole}
        onChange={handleChange}
        disabled={disabled || update.isPending}
        aria-label={`Modifier le rôle du membre`}
        className="appearance-none pl-2 pr-6 py-1 rounded text-[12px] font-[family-name:var(--font-sans)] transition-colors cursor-pointer"
        style={{
          background: 'var(--color-bgAlt)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text)',
          outline: 'none',
        }}
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_CONFIG[r]?.label ?? r}
          </option>
        ))}
      </select>
      <ChevronDown
        size={10}
        aria-hidden="true"
        className="absolute right-1.5 pointer-events-none"
        style={{ color: 'var(--color-muted)' }}
      />
    </div>
  )
}

// ─── Add member form ──────────────────────────────────────────────────────────

function AddMemberForm({
  orgId,
  onClose,
}: {
  orgId: string | null
  onClose: () => void
}) {
  const [selectedUserId, setSelectedUserId] = useState('')
  const [role, setRole] = useState<'owner' | 'admin' | 'member'>('member')
  const { data: usersData, isLoading: usersLoading } = useAdminUsers()
  const addMember = useOrgAddMember(orgId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedUserId) {
      toast.error('Veuillez sélectionner un utilisateur')
      return
    }
    try {
      await addMember.mutateAsync({ userId: selectedUserId, role })
      toast.success('Membre ajouté avec succès')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'ajout')
    }
  }

  return (
    <div
      className="card-premium mb-6"
      role="region"
      aria-label="Ajouter un membre"
    >
      <h2
        className="text-sm font-[family-name:var(--font-display)] font-semibold mb-4"
        style={{ color: 'var(--color-text)' }}
      >
        Ajouter un membre
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
        {/* User select */}
        <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
          <label
            htmlFor="add-member-user"
            className="text-[11px] font-[family-name:var(--font-display)] uppercase tracking-wider"
            style={{ color: 'var(--color-muted)' }}
          >
            Utilisateur
          </label>
          <div className="relative">
            <select
              id="add-member-user"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              disabled={usersLoading}
              className="w-full appearance-none pl-3 pr-8 py-2 rounded-md text-[13px] font-[family-name:var(--font-sans)]"
              style={{
                background: 'var(--color-bgAlt)',
                border: '1px solid var(--color-border)',
                color: selectedUserId ? 'var(--color-text)' : 'var(--color-muted)',
                outline: 'none',
                minHeight: 44,
              }}
            >
              <option value="">
                {usersLoading ? 'Chargement…' : '— Sélectionner un utilisateur —'}
              </option>
              {usersData?.users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.displayName ? `${u.displayName} (${u.email})` : u.email}
                </option>
              ))}
            </select>
            <ChevronDown
              size={12}
              aria-hidden="true"
              className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--color-muted)' }}
            />
          </div>
        </div>

        {/* Role select */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="add-member-role"
            className="text-[11px] font-[family-name:var(--font-display)] uppercase tracking-wider"
            style={{ color: 'var(--color-muted)' }}
          >
            Rôle
          </label>
          <div className="relative">
            <select
              id="add-member-role"
              value={role}
              onChange={(e) => setRole(e.target.value as typeof role)}
              className="appearance-none pl-3 pr-8 py-2 rounded-md text-[13px] font-[family-name:var(--font-sans)]"
              style={{
                background: 'var(--color-bgAlt)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
                outline: 'none',
                minHeight: 44,
              }}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_CONFIG[r]?.label ?? r}
                </option>
              ))}
            </select>
            <ChevronDown
              size={12}
              aria-hidden="true"
              className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--color-muted)' }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={addMember.isPending || !selectedUserId}
            className="btn-primary text-[13px]"
            style={{ minHeight: 44, opacity: addMember.isPending ? 0.7 : 1 }}
          >
            {addMember.isPending ? 'Ajout…' : 'Ajouter'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-[13px]"
            style={{ minHeight: 44 }}
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminMembersPage() {
  const { orgId, orgName } = useAdminContext()
  const { data: members, isLoading } = useOrgMembers(orgId)
  const removeMember = useOrgRemoveMember(orgId)

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [showAddForm, setShowAddForm] = useState(false)

  const filtered = useMemo(() => {
    if (!members) return []
    return members.filter((m) => {
      const matchesSearch =
        !search ||
        m.email.toLowerCase().includes(search.toLowerCase()) ||
        (m.displayName ?? '').toLowerCase().includes(search.toLowerCase())
      const matchesRole = roleFilter === 'all' || m.role === roleFilter
      return matchesSearch && matchesRole
    })
  }, [members, search, roleFilter])

  async function handleRemove(member: OrgMember) {
    const confirmed = window.confirm(
      `Retirer ${member.displayName ?? member.email} de l'organisation ? Cette action est irréversible.`,
    )
    if (!confirmed) return
    try {
      await removeMember.mutateAsync(member.userId)
      toast.success(`${member.displayName ?? member.email} a été retiré`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression')
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-[family-name:var(--font-display)] font-bold"
            style={{ color: 'var(--color-text)' }}
          >
            Membres
          </h1>
          <p
            className="text-sm mt-1 font-[family-name:var(--font-sans)]"
            style={{ color: 'var(--color-muted)' }}
          >
            {orgName ? (
              <>
                Organisation&nbsp;
                <span
                  className="font-semibold"
                  style={{ color: 'var(--color-text)' }}
                >
                  {orgName}
                </span>
                {members ? ` — ${members.length} membre${members.length !== 1 ? 's' : ''}` : ''}
              </>
            ) : (
              'Sélectionnez une organisation'
            )}
          </p>
        </div>

        {orgId && (
          <button
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            className="btn-primary flex items-center gap-2 text-[13px]"
            style={{ minHeight: 44 }}
          >
            <UserPlus size={15} aria-hidden="true" />
            Ajouter un membre
          </button>
        )}
      </div>

      {/* Add form */}
      {showAddForm && orgId && (
        <AddMemberForm orgId={orgId} onClose={() => setShowAddForm(false)} />
      )}

      {/* Filters */}
      {orgId && (
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search
              size={14}
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--color-muted)' }}
            />
            <label htmlFor="member-search" className="sr-only">
              Rechercher par email ou nom
            </label>
            <input
              id="member-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par email ou nom…"
              className="input-modern pl-9 w-full text-[13px]"
              style={{ minHeight: 40 }}
            />
          </div>

          {/* Role filter */}
          <div className="relative">
            <label htmlFor="role-filter" className="sr-only">
              Filtrer par rôle
            </label>
            <select
              id="role-filter"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 rounded-md text-[13px] font-[family-name:var(--font-sans)]"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
                outline: 'none',
                minHeight: 40,
              }}
            >
              <option value="all">Tous les rôles</option>
              <option value="owner">Owner</option>
              <option value="admin">Admin</option>
              <option value="member">Membre</option>
            </select>
            <ChevronDown
              size={12}
              aria-hidden="true"
              className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--color-muted)' }}
            />
          </div>
        </div>
      )}

      {/* Table */}
      {!orgId ? (
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
          className="card-premium text-sm font-[family-name:var(--font-sans)] p-6"
          role="status"
          style={{ color: 'var(--color-muted)' }}
        >
          Chargement des membres…
        </div>
      ) : !members?.length ? (
        <div
          className="card-premium text-sm font-[family-name:var(--font-sans)] p-6"
          style={{ color: 'var(--color-muted)' }}
        >
          Aucun membre dans cette organisation.
        </div>
      ) : (
        <div className="card-premium p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]" aria-label="Membres de l'organisation">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  {['Membre', 'Rôle', 'Depuis', 'Actions'].map((h) => (
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
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-6 text-sm text-center font-[family-name:var(--font-sans)]"
                      style={{ color: 'var(--color-muted)' }}
                    >
                      Aucun résultat pour cette recherche.
                    </td>
                  </tr>
                ) : (
                  filtered.map((member) => {
                    const isPendingRemove =
                      removeMember.isPending &&
                      removeMember.variables === member.userId
                    return (
                      <tr
                        key={member.userId}
                        style={{ borderBottom: '1px solid var(--color-border)' }}
                      >
                        {/* Member info */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar member={member} />
                            <div className="min-w-0">
                              <div
                                className="text-[13px] font-[family-name:var(--font-display)] font-semibold truncate"
                                style={{ color: 'var(--color-text)' }}
                              >
                                {member.displayName ?? member.email}
                              </div>
                              {member.displayName && (
                                <div
                                  className="text-[11px] font-[family-name:var(--font-sans)] truncate"
                                  style={{ color: 'var(--color-muted)' }}
                                >
                                  {member.email}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <RoleBadge role={member.role} />
                            <RoleSelect
                              memberId={member.userId}
                              currentRole={member.role}
                              orgId={orgId}
                              disabled={isPendingRemove}
                            />
                          </div>
                        </td>

                        {/* Joined at */}
                        <td
                          className="px-4 py-3 text-[12px] font-[family-name:var(--font-sans)]"
                          style={{ color: 'var(--color-muted)' }}
                        >
                          {new Date(member.joinedAt).toLocaleDateString('fr-FR', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>

                        {/* Remove */}
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => handleRemove(member)}
                            disabled={isPendingRemove}
                            aria-label={`Retirer ${member.displayName ?? member.email} de l'organisation`}
                            title="Retirer de l'organisation"
                            className="flex items-center justify-center rounded transition-colors"
                            style={{
                              width: 44,
                              height: 44,
                              color: 'var(--color-red)',
                              background: 'transparent',
                              opacity: isPendingRemove ? 0.5 : 1,
                              cursor: isPendingRemove ? 'not-allowed' : 'pointer',
                            }}
                          >
                            <Trash2 size={15} aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
