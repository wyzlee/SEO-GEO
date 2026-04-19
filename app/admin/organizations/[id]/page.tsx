'use client'

import { use, useState } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  ArrowLeft,
  Building2,
  Users,
  BarChart2,
  CreditCard,
  ExternalLink,
  UserMinus,
  UserPlus,
  X,
  Pencil,
  Check,
  Image as ImageIcon,
  ShieldCheck,
  ShieldOff,
} from 'lucide-react'
import {
  useAdminOrgDetail,
  useAdminUpdateOrg,
  useAdminDeleteOrg,
  useAdminAddMember,
  useAdminUpdateMember,
  useAdminRemoveMember,
  useAdminUsers,
  useAdminOrgGrants,
  useAdminGrantOrgAccess,
  useAdminRevokeOrgAccess,
  useAdminUpdateOrgTheme,
  type AdminOrgDetail,
} from '@/lib/hooks/use-admin'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PLAN_LABELS: Record<string, string> = {
  discovery: 'Discovery',
  studio: 'Studio',
  agency: 'Agency',
}

function planBadgeStyle(plan: string) {
  switch (plan) {
    case 'studio':
      return {
        background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
        color: 'var(--color-accent)',
        border: '1px solid color-mix(in srgb, var(--color-accent) 25%, transparent)',
      }
    case 'agency':
      return {
        background: 'color-mix(in srgb, var(--color-green) 12%, transparent)',
        color: 'var(--color-green)',
        border: '1px solid color-mix(in srgb, var(--color-green) 25%, transparent)',
      }
    default:
      return {
        background: 'color-mix(in srgb, var(--color-muted) 12%, transparent)',
        color: 'var(--color-muted)',
        border: '1px solid color-mix(in srgb, var(--color-muted) 25%, transparent)',
      }
  }
}

function stripeStatusBadgeStyle(status: string | null) {
  switch (status) {
    case 'active':
      return {
        background: 'color-mix(in srgb, var(--color-green) 12%, transparent)',
        color: 'var(--color-green)',
        border: '1px solid color-mix(in srgb, var(--color-green) 25%, transparent)',
      }
    case 'trialing':
      return {
        background: 'color-mix(in srgb, var(--color-amber) 12%, transparent)',
        color: 'var(--color-amber)',
        border: '1px solid color-mix(in srgb, var(--color-amber) 25%, transparent)',
      }
    case 'past_due':
      return {
        background: 'color-mix(in srgb, var(--color-red) 12%, transparent)',
        color: 'var(--color-red)',
        border: '1px solid color-mix(in srgb, var(--color-red) 25%, transparent)',
      }
    default:
      return {
        background: 'color-mix(in srgb, var(--color-muted) 12%, transparent)',
        color: 'var(--color-muted)',
        border: '1px solid color-mix(in srgb, var(--color-muted) 25%, transparent)',
      }
  }
}

function auditStatusBadgeStyle(status: string) {
  switch (status) {
    case 'completed':
      return {
        background: 'color-mix(in srgb, var(--color-green) 12%, transparent)',
        color: 'var(--color-green)',
      }
    case 'running':
      return {
        background: 'color-mix(in srgb, var(--color-blue) 12%, transparent)',
        color: 'var(--color-blue)',
      }
    case 'failed':
      return {
        background: 'color-mix(in srgb, var(--color-red) 12%, transparent)',
        color: 'var(--color-red)',
      }
    default:
      return {
        background: 'color-mix(in srgb, var(--color-muted) 12%, transparent)',
        color: 'var(--color-muted)',
      }
  }
}

function roleBadgeStyle(role: string) {
  switch (role) {
    case 'owner':
      return {
        background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
        color: 'var(--color-accent)',
      }
    case 'admin':
      return {
        background: 'color-mix(in srgb, var(--color-amber) 10%, transparent)',
        color: 'var(--color-amber)',
      }
    default:
      return {
        background: 'color-mix(in srgb, var(--color-muted) 10%, transparent)',
        color: 'var(--color-muted)',
      }
  }
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  sub,
}: {
  label: string
  value: React.ReactNode
  icon: React.ReactNode
  sub?: React.ReactNode
}) {
  return (
    <div
      className="rounded-lg p-4 flex flex-col gap-2"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div className="flex items-center gap-2">
        <span style={{ color: 'var(--color-muted)' }} aria-hidden="true">
          {icon}
        </span>
        <span
          className="text-[11px] font-[family-name:var(--font-display)] uppercase tracking-wider"
          style={{ color: 'var(--color-muted)' }}
        >
          {label}
        </span>
      </div>
      <div
        className="text-2xl font-[family-name:var(--font-display)] font-bold"
        style={{ color: 'var(--color-text)' }}
      >
        {value}
      </div>
      {sub && (
        <div className="text-[11px] font-[family-name:var(--font-sans)]" style={{ color: 'var(--color-muted)' }}>
          {sub}
        </div>
      )}
    </div>
  )
}

// ─── Inline edit section (Informations) ───────────────────────────────────────

function InfoSection({
  organization,
}: {
  organization: AdminOrgDetail['organization']
}) {
  const updateOrg = useAdminUpdateOrg(organization.id)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(organization.name)
  const [slug, setSlug] = useState(organization.slug)
  const [description, setDescription] = useState(organization.description ?? '')
  const [logoUrl, setLogoUrl] = useState(organization.logoUrl ?? '')

  function handleCancel() {
    setName(organization.name)
    setSlug(organization.slug)
    setDescription(organization.description ?? '')
    setLogoUrl(organization.logoUrl ?? '')
    setEditing(false)
  }

  async function handleSave() {
    try {
      await updateOrg.mutateAsync({
        name: name !== organization.name ? name : undefined,
        slug: slug !== organization.slug ? slug : undefined,
        description: description !== (organization.description ?? '') ? (description || null) : undefined,
        logoUrl: logoUrl !== (organization.logoUrl ?? '') ? (logoUrl || null) : undefined,
      })
      toast.success('Informations mises à jour')
      setEditing(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la mise à jour')
    }
  }

  const logoPreviewValid = logoUrl.startsWith('http://') || logoUrl.startsWith('https://')

  return (
    <section aria-labelledby="info-heading">
      <div className="flex items-center justify-between mb-3">
        <h2
          id="info-heading"
          className="text-base font-[family-name:var(--font-display)] font-semibold"
          style={{ color: 'var(--color-text)' }}
        >
          Informations
        </h2>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 text-[12px] font-[family-name:var(--font-display)] rounded-md px-3 transition-colors"
            style={{
              minHeight: 32,
              color: 'var(--color-muted)',
              border: '1px solid var(--color-border)',
              background: 'transparent',
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLElement).style.color = 'var(--color-text)'
              ;(e.currentTarget as HTMLElement).style.background =
                'color-mix(in srgb, var(--color-accent) 4%, transparent)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLElement).style.color = 'var(--color-muted)'
              ;(e.currentTarget as HTMLElement).style.background = 'transparent'
            }}
          >
            <Pencil size={12} aria-hidden="true" />
            Modifier
          </button>
        )}
      </div>

      <div
        className="rounded-lg p-4 space-y-4"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        {editing ? (
          <div className="space-y-4">
            {/* Name */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="org-name"
                className="text-[11px] font-[family-name:var(--font-display)] uppercase tracking-wider"
                style={{ color: 'var(--color-muted)' }}
              >
                Nom
              </label>
              <input
                id="org-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-modern text-sm font-[family-name:var(--font-sans)]"
              />
            </div>

            {/* Slug */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="org-slug"
                className="text-[11px] font-[family-name:var(--font-display)] uppercase tracking-wider"
                style={{ color: 'var(--color-muted)' }}
              >
                Slug
              </label>
              <input
                id="org-slug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                pattern="^[a-z0-9-]+$"
                className="input-modern text-sm font-[family-name:var(--font-sans)]"
              />
              <p className="text-[11px] font-[family-name:var(--font-sans)]" style={{ color: 'var(--color-muted)' }}>
                Lettres minuscules, chiffres et tirets uniquement.
              </p>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="org-description"
                className="text-[11px] font-[family-name:var(--font-display)] uppercase tracking-wider"
                style={{ color: 'var(--color-muted)' }}
              >
                Description
              </label>
              <textarea
                id="org-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={500}
                className="input-modern text-sm font-[family-name:var(--font-sans)] resize-none"
              />
            </div>

            {/* Logo URL */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="org-logo-url"
                className="text-[11px] font-[family-name:var(--font-display)] uppercase tracking-wider"
                style={{ color: 'var(--color-muted)' }}
              >
                URL du logo
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="org-logo-url"
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://…"
                  className="input-modern text-sm font-[family-name:var(--font-sans)] flex-1"
                />
                {logoPreviewValid ? (
                  <img
                    src={logoUrl}
                    alt="Prévisualisation du logo"
                    className="rounded object-contain shrink-0"
                    style={{
                      width: 40,
                      height: 40,
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-bgAlt)',
                    }}
                    onError={(e) => {
                      ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                    }}
                  />
                ) : (
                  <div
                    className="flex items-center justify-center rounded shrink-0"
                    style={{
                      width: 40,
                      height: 40,
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-bgAlt)',
                      color: 'var(--color-muted)',
                    }}
                    aria-hidden="true"
                  >
                    <ImageIcon size={16} />
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleSave}
                disabled={updateOrg.isPending}
                className="btn-primary text-sm flex items-center gap-1.5"
                style={{ minHeight: 36 }}
              >
                <Check size={13} aria-hidden="true" />
                {updateOrg.isPending ? 'Enregistrement…' : 'Enregistrer'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={updateOrg.isPending}
                className="btn-secondary text-sm"
                style={{ minHeight: 36 }}
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-[11px] font-[family-name:var(--font-display)] uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>
                Nom
              </dt>
              <dd className="text-sm font-[family-name:var(--font-sans)] mt-0.5" style={{ color: 'var(--color-text)' }}>
                {organization.name}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-[family-name:var(--font-display)] uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>
                Slug
              </dt>
              <dd className="text-sm font-[family-name:var(--font-sans)] mt-0.5" style={{ color: 'var(--color-text)' }}>
                {organization.slug}
              </dd>
            </div>
            {organization.description && (
              <div className="sm:col-span-2">
                <dt className="text-[11px] font-[family-name:var(--font-display)] uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>
                  Description
                </dt>
                <dd className="text-sm font-[family-name:var(--font-sans)] mt-0.5" style={{ color: 'var(--color-text)' }}>
                  {organization.description}
                </dd>
              </div>
            )}
            {organization.logoUrl && (
              <div>
                <dt className="text-[11px] font-[family-name:var(--font-display)] uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>
                  Logo
                </dt>
                <dd className="mt-1">
                  <img
                    src={organization.logoUrl}
                    alt={`Logo de ${organization.name}`}
                    className="rounded object-contain"
                    style={{
                      width: 48,
                      height: 48,
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-bgAlt)',
                    }}
                  />
                </dd>
              </div>
            )}
          </dl>
        )}
      </div>
    </section>
  )
}

// ─── Theme section ─────────────────────────────────────────────────────────────

function ThemeSection({
  organization,
}: {
  organization: AdminOrgDetail['organization']
}) {
  const updateTheme = useAdminUpdateOrgTheme(organization.id)

  const initialTheme = organization.branding?.theme ?? {}
  const [primary, setPrimary] = useState(initialTheme.primary ?? '#4F46E5')
  const [accent, setAccent] = useState(initialTheme.accent ?? '#7C3AED')
  const [background, setBackground] = useState(initialTheme.background ?? '#080C10')

  async function handleSave() {
    try {
      await updateTheme.mutateAsync({ primary, accent, background })
      toast.success('Thème mis à jour')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde du thème')
    }
  }

  return (
    <section aria-labelledby="theme-heading">
      <h2
        id="theme-heading"
        className="text-base font-[family-name:var(--font-display)] font-semibold mb-3"
        style={{ color: 'var(--color-text)' }}
      >
        Thème
      </h2>

      <div
        className="rounded-lg p-4"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div className="flex flex-wrap gap-6 mb-4">
          {/* Primary */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={`theme-primary-${organization.id}`}
              className="text-[11px] font-[family-name:var(--font-display)] uppercase tracking-wider"
              style={{ color: 'var(--color-muted)' }}
            >
              Couleur principale
            </label>
            <div className="flex items-center gap-2">
              <div
                className="rounded shrink-0"
                style={{ width: 28, height: 28, background: primary, border: '1px solid var(--color-border)' }}
                aria-hidden="true"
              />
              <input
                id={`theme-primary-${organization.id}`}
                type="color"
                value={primary}
                onChange={(e) => setPrimary(e.target.value)}
                className="rounded cursor-pointer"
                style={{ width: 44, height: 44, border: 'none', padding: 0, background: 'transparent' }}
              />
              <span
                className="text-[11px] font-[family-name:var(--font-sans)]"
                style={{ color: 'var(--color-muted)' }}
                aria-live="polite"
              >
                {primary}
              </span>
            </div>
          </div>

          {/* Accent */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={`theme-accent-${organization.id}`}
              className="text-[11px] font-[family-name:var(--font-display)] uppercase tracking-wider"
              style={{ color: 'var(--color-muted)' }}
            >
              Couleur accentuation
            </label>
            <div className="flex items-center gap-2">
              <div
                className="rounded shrink-0"
                style={{ width: 28, height: 28, background: accent, border: '1px solid var(--color-border)' }}
                aria-hidden="true"
              />
              <input
                id={`theme-accent-${organization.id}`}
                type="color"
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                className="rounded cursor-pointer"
                style={{ width: 44, height: 44, border: 'none', padding: 0, background: 'transparent' }}
              />
              <span
                className="text-[11px] font-[family-name:var(--font-sans)]"
                style={{ color: 'var(--color-muted)' }}
                aria-live="polite"
              >
                {accent}
              </span>
            </div>
          </div>

          {/* Background */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={`theme-bg-${organization.id}`}
              className="text-[11px] font-[family-name:var(--font-display)] uppercase tracking-wider"
              style={{ color: 'var(--color-muted)' }}
            >
              Arrière-plan
            </label>
            <div className="flex items-center gap-2">
              <div
                className="rounded shrink-0"
                style={{ width: 28, height: 28, background: background, border: '1px solid var(--color-border)' }}
                aria-hidden="true"
              />
              <input
                id={`theme-bg-${organization.id}`}
                type="color"
                value={background}
                onChange={(e) => setBackground(e.target.value)}
                className="rounded cursor-pointer"
                style={{ width: 44, height: 44, border: 'none', padding: 0, background: 'transparent' }}
              />
              <span
                className="text-[11px] font-[family-name:var(--font-sans)]"
                style={{ color: 'var(--color-muted)' }}
                aria-live="polite"
              >
                {background}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={updateTheme.isPending}
          className="btn-primary text-sm"
          style={{ minHeight: 36 }}
        >
          {updateTheme.isPending ? 'Sauvegarde…' : 'Sauvegarder le thème'}
        </button>
      </div>
    </section>
  )
}

// ─── Add member form ──────────────────────────────────────────────────────────

function AddMemberForm({
  orgId,
  currentMemberUserIds,
  onClose,
}: {
  orgId: string
  currentMemberUserIds: string[]
  onClose: () => void
}) {
  const { data: usersData } = useAdminUsers()
  const addMember = useAdminAddMember(orgId)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRole, setSelectedRole] = useState<'member' | 'admin' | 'owner'>('member')

  const eligibleUsers = (usersData?.users ?? []).filter(
    (u) => !currentMemberUserIds.includes(u.id),
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedUserId) return
    try {
      await addMember.mutateAsync({ userId: selectedUserId, role: selectedRole })
      toast.success('Membre ajouté')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'ajout')
    }
  }

  return (
    <div
      className="rounded-lg p-4 mt-3"
      style={{
        background: 'color-mix(in srgb, var(--color-accent) 4%, var(--color-surface))',
        border: '1px solid color-mix(in srgb, var(--color-accent) 20%, var(--color-border))',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-[12px] font-[family-name:var(--font-display)] font-semibold"
          style={{ color: 'var(--color-text)' }}
        >
          Ajouter un membre
        </span>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center justify-center rounded transition-colors"
          style={{ minWidth: 36, minHeight: 36, color: 'var(--color-muted)' }}
          aria-label="Fermer"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>

      {eligibleUsers.length === 0 ? (
        <p className="text-[12px] font-[family-name:var(--font-sans)]" style={{ color: 'var(--color-muted)' }}>
          Tous les utilisateurs sont déjà membres de cette organisation.
        </p>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
              <label
                htmlFor="add-member-user"
                className="text-[11px] font-[family-name:var(--font-display)] uppercase tracking-wider"
                style={{ color: 'var(--color-muted)' }}
              >
                Utilisateur
              </label>
              <select
                id="add-member-user"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="input-modern text-sm font-[family-name:var(--font-sans)]"
                required
              >
                <option value="">Choisir un utilisateur…</option>
                {eligibleUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.email}{u.displayName ? ` — ${u.displayName}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="add-member-role"
                className="text-[11px] font-[family-name:var(--font-display)] uppercase tracking-wider"
                style={{ color: 'var(--color-muted)' }}
              >
                Rôle
              </label>
              <select
                id="add-member-role"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as typeof selectedRole)}
                className="input-modern text-sm font-[family-name:var(--font-sans)]"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
                <option value="owner">Owner</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={!selectedUserId || addMember.isPending}
              className="btn-primary text-sm"
              style={{ minHeight: 44 }}
            >
              {addMember.isPending ? 'Ajout…' : 'Ajouter'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

// ─── Members section ──────────────────────────────────────────────────────────

function MembersSection({
  orgId,
  members,
}: {
  orgId: string
  members: AdminOrgDetail['members']
}) {
  const updateMember = useAdminUpdateMember(orgId)
  const removeMember = useAdminRemoveMember(orgId)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [showAddForm, setShowAddForm] = useState(false)

  const filtered = members.filter((m) => {
    const matchesSearch =
      !search ||
      m.email.toLowerCase().includes(search.toLowerCase()) ||
      (m.displayName ?? '').toLowerCase().includes(search.toLowerCase())
    const matchesRole = roleFilter === 'all' || m.role === roleFilter
    return matchesSearch && matchesRole
  })

  async function handleRoleChange(userId: string, role: string) {
    try {
      await updateMember.mutateAsync({ userId, role })
      toast.success('Rôle mis à jour')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur')
    }
  }

  async function handleRemove(userId: string, email: string) {
    const ok = window.confirm(`Retirer ce membre de l'organisation ?\n\n${email}`)
    if (!ok) return
    try {
      await removeMember.mutateAsync(userId)
      toast.success('Membre retiré')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur')
    }
  }

  const currentMemberUserIds = members.map((m) => m.userId)

  return (
    <section aria-labelledby="members-heading">
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <h2
          id="members-heading"
          className="text-base font-[family-name:var(--font-display)] font-semibold"
          style={{ color: 'var(--color-text)' }}
        >
          Membres ({members.length})
        </h2>

        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <div className="flex flex-col gap-0">
            <label htmlFor="member-search" className="sr-only">
              Rechercher un membre
            </label>
            <input
              id="member-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher…"
              className="input-modern text-sm font-[family-name:var(--font-sans)]"
              style={{ minHeight: 36, paddingTop: 6, paddingBottom: 6, width: 180 }}
            />
          </div>

          <div className="flex flex-col gap-0">
            <label htmlFor="member-role-filter" className="sr-only">
              Filtrer par rôle
            </label>
            <select
              id="member-role-filter"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="input-modern text-sm font-[family-name:var(--font-sans)]"
              style={{ minHeight: 36, paddingTop: 6, paddingBottom: 6 }}
            >
              <option value="all">Tous les rôles</option>
              <option value="owner">Owner</option>
              <option value="admin">Admin</option>
              <option value="member">Member</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            className="btn-secondary flex items-center gap-2 text-sm"
            style={{ minHeight: 36, paddingTop: 6, paddingBottom: 6 }}
            aria-expanded={showAddForm}
          >
            <UserPlus size={14} aria-hidden="true" />
            Ajouter
          </button>
        </div>
      </div>

      {showAddForm && (
        <AddMemberForm
          orgId={orgId}
          currentMemberUserIds={currentMemberUserIds}
          onClose={() => setShowAddForm(false)}
        />
      )}

      <div
        className="rounded-lg"
        style={{ border: '1px solid var(--color-border)' }}
      >
        {filtered.length === 0 ? (
          <div className="p-4 text-sm font-[family-name:var(--font-sans)]" style={{ color: 'var(--color-muted)' }}>
            Aucun membre trouvé.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
                {['Utilisateur', 'Rôle', 'Membre depuis', 'Actions'].map((h) => (
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
              {filtered.map((member) => (
                <tr
                  key={member.userId}
                  style={{ borderBottom: '1px solid var(--color-border)' }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {member.avatarUrl ? (
                        <img
                          src={member.avatarUrl}
                          alt=""
                          aria-hidden="true"
                          width={28}
                          height={28}
                          className="rounded-full shrink-0 object-cover"
                        />
                      ) : (
                        <div
                          className="rounded-full shrink-0 flex items-center justify-center text-[11px] font-[family-name:var(--font-display)] font-bold"
                          style={{
                            width: 28,
                            height: 28,
                            background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
                            color: 'var(--color-accent)',
                          }}
                          aria-hidden="true"
                        >
                          {(member.displayName || member.email).charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-[family-name:var(--font-display)] font-semibold" style={{ color: 'var(--color-text)' }}>
                          {member.displayName ?? member.email}
                        </div>
                        {member.displayName && (
                          <div className="text-[11px] font-[family-name:var(--font-sans)]" style={{ color: 'var(--color-muted)' }}>
                            {member.email}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded font-[family-name:var(--font-sans)]"
                        style={roleBadgeStyle(member.role)}
                        aria-hidden="true"
                      >
                        {member.role}
                      </span>
                      <label htmlFor={`role-${member.userId}`} className="sr-only">
                        Changer le rôle de {member.email}
                      </label>
                      <select
                        id={`role-${member.userId}`}
                        defaultValue={member.role}
                        onChange={(e) => handleRoleChange(member.userId, e.target.value)}
                        disabled={updateMember.isPending && updateMember.variables?.userId === member.userId}
                        className="text-[11px] font-[family-name:var(--font-sans)] rounded px-1.5 py-1 transition-colors"
                        style={{
                          background: 'var(--color-surface)',
                          border: '1px solid var(--color-border)',
                          color: 'var(--color-muted)',
                          minHeight: 28,
                        }}
                        aria-label={`Rôle de ${member.email}`}
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                        <option value="owner">Owner</option>
                      </select>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-xs font-[family-name:var(--font-sans)]" style={{ color: 'var(--color-muted)' }}>
                    {new Date(member.joinedAt).toLocaleDateString('fr-FR')}
                  </td>

                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleRemove(member.userId, member.email)}
                      disabled={removeMember.isPending && removeMember.variables === member.userId}
                      className="flex items-center justify-center rounded transition-colors"
                      style={{
                        minWidth: 44,
                        minHeight: 44,
                        color: 'var(--color-red)',
                        background: 'transparent',
                      }}
                      aria-label={`Retirer ${member.email} de l'organisation`}
                      title="Retirer ce membre"
                    >
                      <UserMinus size={15} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}

// ─── Org grants section ───────────────────────────────────────────────────────

function OrgGrantsSection({
  orgId,
  members,
}: {
  orgId: string
  members: AdminOrgDetail['members']
}) {
  const { data: grantsData } = useAdminOrgGrants()
  const { data: usersData } = useAdminUsers()
  const grantAccess = useAdminGrantOrgAccess()
  const revokeAccess = useAdminRevokeOrgAccess()

  const [selectedUserId, setSelectedUserId] = useState('')

  const orgGrants = (grantsData?.grants ?? []).filter((g) => g.orgId === orgId)

  // Exclude users who already have a grant for this org OR are already native members
  const memberUserIds = members.map((m) => m.userId)
  const grantedUserIds = orgGrants.map((g) => g.userId)
  const excludedIds = new Set([...memberUserIds, ...grantedUserIds])
  const eligibleUsers = (usersData?.users ?? []).filter((u) => !excludedIds.has(u.id))

  async function handleGrant() {
    if (!selectedUserId) return
    try {
      await grantAccess.mutateAsync({ userId: selectedUserId, orgId })
      toast.success('Accès accordé')
      setSelectedUserId('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'accord d\'accès')
    }
  }

  async function handleRevoke(id: string, email: string) {
    const ok = window.confirm(`Révoquer l'accès admin de ${email} sur cette organisation ?`)
    if (!ok) return
    try {
      await revokeAccess.mutateAsync(id)
      toast.success('Accès révoqué')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la révocation')
    }
  }

  return (
    <section aria-labelledby="grants-heading">
      <h2
        id="grants-heading"
        className="text-base font-[family-name:var(--font-display)] font-semibold mb-3"
        style={{ color: 'var(--color-text)' }}
      >
        Accès admin externes ({orgGrants.length})
      </h2>

      <div
        className="rounded-lg"
        style={{ border: '1px solid var(--color-border)' }}
      >
        {orgGrants.length === 0 ? (
          <div className="p-4 text-sm font-[family-name:var(--font-sans)]" style={{ color: 'var(--color-muted)' }}>
            Aucun accès admin externe pour cette organisation.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
                {['Utilisateur', 'Rôle', 'Accordé par', 'Date', 'Actions'].map((h) => (
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
              {orgGrants.map((grant) => (
                <tr
                  key={grant.id}
                  style={{ borderBottom: '1px solid var(--color-border)' }}
                >
                  <td className="px-4 py-3">
                    <div>
                      <div className="text-sm font-[family-name:var(--font-display)] font-semibold" style={{ color: 'var(--color-text)' }}>
                        {grant.userDisplayName ?? grant.userEmail}
                      </div>
                      {grant.userDisplayName && (
                        <div className="text-[11px] font-[family-name:var(--font-sans)]" style={{ color: 'var(--color-muted)' }}>
                          {grant.userEmail}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-[10px] px-2 py-0.5 rounded font-[family-name:var(--font-sans)] flex items-center gap-1 w-fit"
                      style={{
                        background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
                        color: 'var(--color-accent)',
                        border: '1px solid color-mix(in srgb, var(--color-accent) 20%, transparent)',
                      }}
                    >
                      <ShieldCheck size={10} aria-hidden="true" />
                      admin externe
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-[family-name:var(--font-sans)]" style={{ color: 'var(--color-muted)' }}>
                    {grant.grantedByEmail}
                  </td>
                  <td className="px-4 py-3 text-xs font-[family-name:var(--font-sans)]" style={{ color: 'var(--color-muted)' }}>
                    {new Date(grant.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleRevoke(grant.id, grant.userEmail)}
                      disabled={revokeAccess.isPending && revokeAccess.variables === grant.id}
                      className="flex items-center justify-center rounded transition-colors"
                      style={{
                        minWidth: 44,
                        minHeight: 44,
                        color: 'var(--color-red)',
                        background: 'transparent',
                      }}
                      aria-label={`Révoquer l'accès de ${grant.userEmail}`}
                      title="Révoquer cet accès"
                    >
                      <ShieldOff size={15} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Grant access form */}
      {eligibleUsers.length > 0 && (
        <div
          className="rounded-lg p-4 mt-3 flex flex-wrap items-end gap-3"
          style={{
            background: 'color-mix(in srgb, var(--color-accent) 3%, var(--color-surface))',
            border: '1px solid color-mix(in srgb, var(--color-accent) 15%, var(--color-border))',
          }}
        >
          <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
            <label
              htmlFor={`grant-user-${orgId}`}
              className="text-[11px] font-[family-name:var(--font-display)] uppercase tracking-wider"
              style={{ color: 'var(--color-muted)' }}
            >
              Accorder l&apos;accès à
            </label>
            <select
              id={`grant-user-${orgId}`}
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="input-modern text-sm font-[family-name:var(--font-sans)]"
            >
              <option value="">Choisir un utilisateur…</option>
              {eligibleUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.email}{u.displayName ? ` — ${u.displayName}` : ''}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleGrant}
            disabled={!selectedUserId || grantAccess.isPending}
            className="btn-primary text-sm flex items-center gap-1.5"
            style={{ minHeight: 44 }}
          >
            <ShieldCheck size={14} aria-hidden="true" />
            {grantAccess.isPending ? 'Accord…' : 'Accorder'}
          </button>
        </div>
      )}
    </section>
  )
}

// ─── Recent audits section ────────────────────────────────────────────────────

function RecentAuditsSection({
  audits,
}: {
  audits: AdminOrgDetail['recentAudits']
}) {
  return (
    <section aria-labelledby="audits-heading">
      <h2
        id="audits-heading"
        className="text-base font-[family-name:var(--font-display)] font-semibold mb-3"
        style={{ color: 'var(--color-text)' }}
      >
        Audits récents
      </h2>

      <div
        className="rounded-lg"
        style={{ border: '1px solid var(--color-border)' }}
      >
        {audits.length === 0 ? (
          <div className="p-4 text-sm font-[family-name:var(--font-sans)]" style={{ color: 'var(--color-muted)' }}>
            Aucun audit.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
                {['URL', 'Mode', 'Statut', 'Score', 'Date'].map((h) => (
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
              {audits.map((audit) => (
                <tr
                  key={audit.id}
                  style={{ borderBottom: '1px solid var(--color-border)' }}
                >
                  <td className="px-4 py-3">
                    <span className="text-sm font-[family-name:var(--font-sans)] truncate block max-w-[260px]" style={{ color: 'var(--color-text)' }}>
                      {audit.targetUrl ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-[family-name:var(--font-sans)] uppercase" style={{ color: 'var(--color-muted)' }}>
                      {audit.mode}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-[10px] px-2 py-0.5 rounded font-[family-name:var(--font-sans)]"
                      style={auditStatusBadgeStyle(audit.status)}
                    >
                      {audit.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-[family-name:var(--font-sans)]" style={{ color: 'var(--color-text)' }}>
                    {audit.scoreTotal != null ? `${audit.scoreTotal} / 100` : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs font-[family-name:var(--font-sans)]" style={{ color: 'var(--color-muted)' }}>
                    {new Date(audit.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}

// ─── Danger zone ──────────────────────────────────────────────────────────────

function DangerZone({
  orgId,
  orgName,
}: {
  orgId: string
  orgName: string
}) {
  const updateOrg = useAdminUpdateOrg(orgId)
  const deleteOrg = useAdminDeleteOrg()

  async function handleResetUsage() {
    const ok = window.confirm('Remettre à zéro le compteur d\'audits de cette organisation ?')
    if (!ok) return
    try {
      await updateOrg.mutateAsync({ auditUsage: 0 })
      toast.success('Compteur remis à zéro')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur')
    }
  }

  async function handleDelete() {
    const ok = window.confirm(`Supprimer cette organisation et tous ses audits ? Cette action est irréversible.\n\n${orgName}`)
    if (!ok) return
    try {
      await deleteOrg.mutateAsync(orgId)
      toast.success(`Organisation « ${orgName} » supprimée`)
      window.location.href = '/admin/organizations'
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur')
    }
  }

  return (
    <section aria-labelledby="danger-heading">
      <h2
        id="danger-heading"
        className="text-base font-[family-name:var(--font-display)] font-semibold mb-3"
        style={{ color: 'var(--color-red)' }}
      >
        Zone danger
      </h2>
      <div
        className="rounded-lg p-4 flex flex-wrap gap-3"
        style={{
          background: 'color-mix(in srgb, var(--color-red) 4%, var(--color-surface))',
          border: '1px solid color-mix(in srgb, var(--color-red) 20%, var(--color-border))',
        }}
      >
        <button
          type="button"
          onClick={handleResetUsage}
          disabled={updateOrg.isPending}
          className="text-sm font-[family-name:var(--font-display)] rounded-lg px-4 transition-colors"
          style={{
            minHeight: 44,
            background: 'color-mix(in srgb, var(--color-amber) 12%, transparent)',
            color: 'var(--color-amber)',
            border: '1px solid color-mix(in srgb, var(--color-amber) 25%, transparent)',
          }}
        >
          {updateOrg.isPending ? 'Remise à zéro…' : 'Remettre à zéro le compteur'}
        </button>

        <button
          type="button"
          onClick={handleDelete}
          disabled={deleteOrg.isPending}
          className="text-sm font-[family-name:var(--font-display)] rounded-lg px-4 transition-colors"
          style={{
            minHeight: 44,
            background: 'color-mix(in srgb, var(--color-red) 12%, transparent)',
            color: 'var(--color-red)',
            border: '1px solid color-mix(in srgb, var(--color-red) 25%, transparent)',
          }}
        >
          {deleteOrg.isPending ? 'Suppression…' : 'Supprimer cette organisation…'}
        </button>
      </div>
    </section>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminOrgDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { data, isLoading, isError, error } = useAdminOrgDetail(id)

  if (isLoading) {
    return (
      <div className="p-6">
        <p
          className="text-sm font-[family-name:var(--font-sans)]"
          role="status"
          style={{ color: 'var(--color-muted)' }}
        >
          Chargement…
        </p>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="p-6 space-y-2">
        <Link
          href="/admin/organizations"
          className="flex items-center gap-1.5 text-sm font-[family-name:var(--font-display)] transition-colors"
          style={{ color: 'var(--color-muted)' }}
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Organisations
        </Link>
        <p
          className="text-sm font-[family-name:var(--font-sans)] mt-4"
          role="alert"
          style={{ color: 'var(--color-red)' }}
        >
          {error instanceof Error ? error.message : 'Organisation introuvable ou API indisponible.'}
        </p>
      </div>
    )
  }

  const { organization, members, recentAudits } = data
  const stripeStatusLabel = organization.subscriptionStatus ?? 'Aucun'

  const now = new Date()
  const auditsThisMonth = recentAudits.filter((a) => {
    const d = new Date(a.createdAt)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  }).length

  return (
    <div className="p-6 space-y-8">
      {/* Breadcrumb */}
      <Link
        href="/admin/organizations"
        className="inline-flex items-center gap-1.5 text-sm font-[family-name:var(--font-display)] transition-colors"
        style={{ color: 'var(--color-muted)' }}
      >
        <ArrowLeft size={14} aria-hidden="true" />
        Organisations
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start gap-3">
        {organization.logoUrl ? (
          <img
            src={organization.logoUrl}
            alt={`Logo de ${organization.name}`}
            className="rounded object-contain shrink-0"
            style={{ width: 32, height: 32, border: '1px solid var(--color-border)', marginTop: 4 }}
          />
        ) : (
          <Building2 size={20} style={{ color: 'var(--color-muted)', marginTop: 4 }} aria-hidden="true" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1
              className="text-2xl font-[family-name:var(--font-display)] font-bold"
              style={{ color: 'var(--color-text)' }}
            >
              {organization.name}
            </h1>

            <span
              className="text-[11px] px-2 py-0.5 rounded font-[family-name:var(--font-sans)]"
              style={planBadgeStyle(organization.plan)}
            >
              {PLAN_LABELS[organization.plan] ?? organization.plan}
            </span>

            <span
              className="text-[11px] px-2 py-0.5 rounded font-[family-name:var(--font-sans)]"
              style={stripeStatusBadgeStyle(organization.subscriptionStatus)}
            >
              {stripeStatusLabel === 'Aucun' ? 'Aucun abonnement' : stripeStatusLabel}
            </span>
          </div>

          <p className="text-[12px] font-[family-name:var(--font-sans)]" style={{ color: 'var(--color-muted)' }}>
            <span>{organization.slug}</span>
            <span className="mx-2" aria-hidden="true">·</span>
            <span>Créée le {new Date(organization.createdAt).toLocaleDateString('fr-FR')}</span>
          </p>
          {organization.description && (
            <p className="text-sm font-[family-name:var(--font-sans)] mt-1" style={{ color: 'var(--color-muted)' }}>
              {organization.description}
            </p>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Membres"
          value={members.length}
          icon={<Users size={15} />}
        />
        <StatCard
          label="Audits ce mois"
          value={auditsThisMonth}
          icon={<BarChart2 size={15} />}
          sub={`${organization.auditUsage} total`}
        />
        <StatCard
          label="Usage audits"
          value={organization.auditUsage}
          icon={<BarChart2 size={15} />}
        />
        <StatCard
          label="Stripe"
          value={
            organization.stripeCustomerId ? (
              <a
                href={`https://dashboard.stripe.com/customers/${organization.stripeCustomerId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xl transition-colors"
                style={{ color: 'var(--color-accent)' }}
                aria-label="Voir le client dans Stripe"
              >
                Client
                <ExternalLink size={14} aria-hidden="true" />
              </a>
            ) : (
              <span style={{ color: 'var(--color-muted)', fontSize: '1rem' }}>—</span>
            )
          }
          icon={<CreditCard size={15} />}
          sub={organization.stripeSubscriptionId ? `Sub: ${organization.stripeSubscriptionId.slice(0, 14)}…` : undefined}
        />
      </div>

      {/* Informations éditables */}
      <InfoSection organization={organization} />

      {/* Thème */}
      <ThemeSection organization={organization} />

      {/* Members section */}
      <MembersSection orgId={organization.id} members={members} />

      {/* Accès admin externes */}
      <OrgGrantsSection orgId={organization.id} members={members} />

      {/* Recent audits section */}
      <RecentAuditsSection audits={recentAudits} />

      {/* Danger zone */}
      <DangerZone orgId={organization.id} orgName={organization.name} />
    </div>
  )
}
