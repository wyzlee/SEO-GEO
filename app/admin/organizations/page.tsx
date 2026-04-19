'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  useAdminOrganizations,
  useAdminChangePlan,
  useAdminCreateOrg,
  useAdminDeleteOrg,
  type AdminOrgRow,
} from '@/lib/hooks/use-admin'
import { Building2, Plus, Trash2, X } from 'lucide-react'
import Link from 'next/link'

const PLAN_LABELS: Record<string, string> = {
  discovery: 'Discovery',
  studio: 'Studio',
  agency: 'Agency',
}

const PLAN_COLORS: Record<string, string> = {
  discovery: 'var(--color-muted)',
  studio: 'var(--color-accent)',
  agency: 'var(--color-green)',
}

// ─── PlanSelector ─────────────────────────────────────────────────────────────

function PlanSelector({ org }: { org: AdminOrgRow }) {
  const changePlan = useAdminChangePlan(org.id)
  const [open, setOpen] = useState(false)

  if (org.stripeSubscriptionId) {
    return (
      <span
        className="text-xs font-[family-name:var(--font-sans)] px-2 py-0.5 rounded"
        style={{
          background: 'color-mix(in srgb, var(--color-muted) 12%, transparent)',
          color: 'var(--color-muted)',
        }}
        title="Gérer via Stripe"
      >
        {PLAN_LABELS[org.plan] ?? org.plan} (Stripe)
      </span>
    )
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-[family-name:var(--font-sans)] px-2 py-0.5 rounded transition-colors"
        style={{
          background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
          color: PLAN_COLORS[org.plan] ?? 'var(--color-text)',
          border: '1px solid color-mix(in srgb, var(--color-accent) 20%, transparent)',
        }}
        disabled={changePlan.isPending}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Plan : ${PLAN_LABELS[org.plan] ?? org.plan}`}
      >
        {changePlan.isPending ? '…' : (PLAN_LABELS[org.plan] ?? org.plan)} ▾
      </button>
      {open && (
        <div
          role="listbox"
          aria-label="Choisir un plan"
          className="absolute top-full left-0 mt-1 z-50 rounded py-1 min-w-[130px]"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          }}
        >
          {(['discovery', 'studio', 'agency'] as const).map((plan) => (
            <button
              key={plan}
              type="button"
              role="option"
              aria-selected={org.plan === plan}
              onClick={async () => {
                setOpen(false)
                try {
                  await changePlan.mutateAsync(plan)
                  toast.success(`Plan changé → ${PLAN_LABELS[plan]}`)
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Erreur')
                }
              }}
              className="flex w-full items-center px-3 py-1.5 text-[12px] font-[family-name:var(--font-display)] transition-colors"
              style={{
                background: org.plan === plan ? 'color-mix(in srgb, var(--color-accent) 8%, transparent)' : 'transparent',
                color: org.plan === plan ? 'var(--color-accent)' : 'var(--color-text)',
              }}
            >
              {PLAN_LABELS[plan]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── CreateOrgForm ────────────────────────────────────────────────────────────

function CreateOrgForm({ onClose }: { onClose: () => void }) {
  const createOrg = useAdminCreateOrg()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [plan, setPlan] = useState<'discovery' | 'studio' | 'agency'>('discovery')
  const [errors, setErrors] = useState<{ name?: string; slug?: string }>({})

  function autoSlug(value: string) {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  function handleNameChange(value: string) {
    setName(value)
    if (!slug || slug === autoSlug(name)) {
      setSlug(autoSlug(value))
    }
  }

  function validate() {
    const errs: { name?: string; slug?: string } = {}
    if (!name.trim()) errs.name = 'Le nom est requis'
    if (!slug.trim()) errs.slug = 'Le slug est requis'
    else if (!/^[a-z0-9-]+$/.test(slug)) errs.slug = 'Slug invalide (minuscules, chiffres, tirets)'
    return errs
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }
    setErrors({})
    try {
      await createOrg.mutateAsync({ name: name.trim(), slug: slug.trim(), plan })
      toast.success(`Organisation « ${name.trim()} » créée`)
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la création')
    }
  }

  return (
    <div
      className="rounded-lg p-5 mb-4"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-[family-name:var(--font-display)] font-semibold" style={{ color: 'var(--color-text)' }}>
          Nouvelle organisation
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center justify-center rounded transition-colors"
          style={{ minWidth: 44, minHeight: 44, color: 'var(--color-muted)' }}
          aria-label="Fermer le formulaire"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Nom */}
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
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Mon Agence"
              className="input-modern text-sm font-[family-name:var(--font-sans)]"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'org-name-error' : undefined}
            />
            {errors.name && (
              <span id="org-name-error" className="text-[11px]" style={{ color: 'var(--color-red)' }} role="alert">
                {errors.name}
              </span>
            )}
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
              placeholder="mon-agence"
              className="input-modern text-sm font-[family-name:var(--font-sans)]"
              aria-invalid={!!errors.slug}
              aria-describedby={errors.slug ? 'org-slug-error' : undefined}
            />
            {errors.slug && (
              <span id="org-slug-error" className="text-[11px]" style={{ color: 'var(--color-red)' }} role="alert">
                {errors.slug}
              </span>
            )}
          </div>

          {/* Plan */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="org-plan"
              className="text-[11px] font-[family-name:var(--font-display)] uppercase tracking-wider"
              style={{ color: 'var(--color-muted)' }}
            >
              Plan
            </label>
            <select
              id="org-plan"
              value={plan}
              onChange={(e) => setPlan(e.target.value as typeof plan)}
              className="input-modern text-sm font-[family-name:var(--font-sans)]"
            >
              <option value="discovery">Discovery</option>
              <option value="studio">Studio</option>
              <option value="agency">Agency</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <button
            type="submit"
            disabled={createOrg.isPending}
            className="btn-primary text-sm"
            style={{ minHeight: 44, paddingLeft: 20, paddingRight: 20 }}
          >
            {createOrg.isPending ? 'Création…' : 'Créer l\'organisation'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminOrganizationsPage() {
  const { data, isLoading } = useAdminOrganizations()
  const deleteOrg = useAdminDeleteOrg()
  const [showCreateForm, setShowCreateForm] = useState(false)

  async function handleDelete(id: string, name: string) {
    const ok = window.confirm(`Supprimer cette organisation et tous ses audits ? Irréversible.\n\n${name}`)
    if (!ok) return
    try {
      await deleteOrg.mutateAsync(id)
      toast.success(`Organisation « ${name} » supprimée`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur')
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
            Organisations
          </h1>
          <p className="text-sm mt-1 font-[family-name:var(--font-sans)]" style={{ color: 'var(--color-muted)' }}>
            {data?.organizations.length ?? '—'} organisation{(data?.organizations.length ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateForm((v) => !v)}
          className="btn-primary flex items-center gap-2 text-sm"
          style={{ minHeight: 44, minWidth: 44 }}
          aria-expanded={showCreateForm}
          aria-controls="create-org-form"
        >
          <Plus size={15} aria-hidden="true" />
          Nouvelle organisation
        </button>
      </div>

      {/* Formulaire de création inline */}
      {showCreateForm && (
        <div id="create-org-form">
          <CreateOrgForm onClose={() => setShowCreateForm(false)} />
        </div>
      )}

      {/* Table */}
      <div className="card-premium overflow-hidden p-0">
        {isLoading ? (
          <div className="p-6 text-sm" role="status" style={{ color: 'var(--color-muted)' }}>Chargement…</div>
        ) : !data?.organizations.length ? (
          <div className="p-6 text-sm" style={{ color: 'var(--color-muted)' }}>Aucune organisation.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                {['Organisation', 'Plan', 'Audits', 'Membres', 'Créée le', 'Actions'].map((h) => (
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
              {data.organizations.map((org) => {
                const isPendingDelete = deleteOrg.isPending && deleteOrg.variables === org.id
                const deleteDisabled = !!org.stripeSubscriptionId

                return (
                  <tr
                    key={org.id}
                    style={{ borderBottom: '1px solid var(--color-border)' }}
                  >
                    {/* Organisation */}
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/organizations/${org.id}`}
                        className="flex items-center gap-2 transition-opacity hover:opacity-80"
                        aria-label={`Voir les détails de ${org.name}`}
                      >
                        <Building2 size={14} style={{ color: 'var(--color-muted)' }} aria-hidden="true" />
                        <div>
                          <div className="text-sm font-[family-name:var(--font-display)] font-semibold" style={{ color: 'var(--color-text)' }}>
                            {org.name}
                          </div>
                          <div className="text-[11px] font-[family-name:var(--font-sans)]" style={{ color: 'var(--color-muted)' }}>
                            {org.slug}
                          </div>
                        </div>
                      </Link>
                    </td>

                    {/* Plan */}
                    <td className="px-4 py-3">
                      <PlanSelector org={org} />
                    </td>

                    {/* Audits */}
                    <td className="px-4 py-3 text-sm font-[family-name:var(--font-sans)]" style={{ color: 'var(--color-text)' }}>
                      {org.auditUsage}
                    </td>

                    {/* Membres */}
                    <td className="px-4 py-3 text-sm font-[family-name:var(--font-sans)]" style={{ color: 'var(--color-text)' }}>
                      {org.memberCount}
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-xs font-[family-name:var(--font-sans)]" style={{ color: 'var(--color-muted)' }}>
                      {new Date(org.createdAt).toLocaleDateString('fr-FR')}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleDelete(org.id, org.name)}
                        disabled={deleteDisabled || isPendingDelete}
                        className="flex items-center justify-center rounded transition-colors"
                        style={{
                          minWidth: 44,
                          minHeight: 44,
                          color: deleteDisabled ? 'var(--color-muted)' : 'var(--color-red)',
                          background: 'transparent',
                          opacity: deleteDisabled ? 0.35 : 1,
                          cursor: deleteDisabled ? 'not-allowed' : 'pointer',
                        }}
                        aria-label={`Supprimer l'organisation ${org.name}`}
                        title={deleteDisabled ? 'Abonnement Stripe actif — suppression impossible' : 'Supprimer cette organisation'}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
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
