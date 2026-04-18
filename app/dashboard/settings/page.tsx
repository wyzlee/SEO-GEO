'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { type UseMutationResult } from '@tanstack/react-query'
import { PageHeader } from '@/components/layout/header'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import {
  useOrganization,
  useUpdateBranding,
  useUpdateCustomDomain,
  useDomainStatus,
  type OrgResponse,
  type DomainStatus,
  type UpdateCustomDomainInput,
} from '@/lib/hooks/use-organization'

const HEX_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/
const HOSTNAME_REGEX = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/

export default function SettingsPage() {
  const { data: org, isLoading } = useOrganization()
  const update = useUpdateBranding()
  const updateDomain = useUpdateCustomDomain()
  const { data: domainStatus, isLoading: isDomainStatusLoading } = useDomainStatus(org?.customDomain)

  const [companyName, setCompanyName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#FF6B35')
  const [accentColor, setAccentColor] = useState('#E55A22')
  const [touched, setTouched] = useState(false)

  const [customDomain, setCustomDomain] = useState('')
  const [customEmailFromName, setCustomEmailFromName] = useState('')
  const [domainTouched, setDomainTouched] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (!org?.branding) return
    setCompanyName(org.branding.companyName ?? '')
    setLogoUrl(org.branding.logoUrl ?? '')
    setPrimaryColor(org.branding.primaryColor ?? '#FF6B35')
    setAccentColor(org.branding.accentColor ?? '#E55A22')
  }, [org?.branding])

  useEffect(() => {
    if (org === undefined) return
    setCustomDomain(org.customDomain ?? '')
    setCustomEmailFromName(org.customEmailFromName ?? '')
  }, [org?.customDomain, org?.customEmailFromName])

  const canEdit = org?.role === 'owner' || org?.role === 'admin'
  const logoInvalid = logoUrl.trim().length > 0 && !/^https?:\/\//i.test(logoUrl)
  const primaryInvalid = !HEX_REGEX.test(primaryColor)
  const accentInvalid = !HEX_REGEX.test(accentColor)
  const disabled =
    !canEdit ||
    update.isPending ||
    logoInvalid ||
    primaryInvalid ||
    accentInvalid

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    update.mutate(
      {
        companyName: companyName.trim() || null,
        logoUrl: logoUrl.trim() || null,
        primaryColor,
        accentColor,
      },
      {
        onSuccess: () => toast.success('Branding mis à jour'),
        onError: (err) =>
          toast.error(
            `Échec de la mise à jour : ${err instanceof Error ? err.message : 'erreur inconnue'}`,
          ),
      },
    )
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Paramètres' },
        ]}
      />
      <PageHeader
        title="Paramètres"
        description="Branding white-label appliqué à vos rapports livrés aux clients."
      />

      <section className="p-6 space-y-4 max-w-2xl">
        <div
          className="flex flex-wrap gap-3 text-sm font-[family-name:var(--font-sans)]"
        >
          <Link
            href="/dashboard/settings"
            aria-current="page"
            className="px-3 py-1.5 rounded"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
            }}
          >
            Branding
          </Link>
          <a
            href="#domaine-personnalise"
            className="px-3 py-1.5 rounded"
            style={{ color: 'var(--color-muted)' }}
          >
            Domaine
          </a>
          <Link
            href="/dashboard/settings/webhooks"
            className="px-3 py-1.5 rounded"
            style={{ color: 'var(--color-muted)' }}
          >
            Webhooks
          </Link>
        </div>
        <div className="card-premium">
          {isLoading ? (
            <p
              className="text-sm py-6 text-center"
              style={{ color: 'var(--color-muted)' }}
            >
              Chargement…
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <header className="pb-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
                <h2 className="text-lg font-[family-name:var(--font-display)] font-semibold">
                  Branding rapport
                </h2>
                <p
                  className="mt-1 text-sm"
                  style={{ color: 'var(--color-muted)' }}
                >
                  Ces valeurs apparaissent sur la page de garde et dans les couleurs
                  du rapport HTML partageable. Laissez vide pour conserver le
                  branding Wyzlee par défaut.
                </p>
              </header>

              <Field
                label="Nom affiché en pied de rapport"
                hint='Remplace « Wyzlee » dans "Audit généré par …"'
              >
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  disabled={!canEdit}
                  maxLength={80}
                  placeholder="Agence Exemple"
                  className="w-full px-3 py-2 rounded-md text-sm font-[family-name:var(--font-sans)]"
                  style={{
                    background: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                />
              </Field>

              <Field
                label="URL du logo"
                hint="HTTPS uniquement. PNG ou SVG. Hauteur rendue ≈ 48px."
                error={touched && logoInvalid ? 'URL invalide (doit commencer par http:// ou https://)' : null}
              >
                <input
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  disabled={!canEdit}
                  maxLength={500}
                  placeholder="https://votre-agence.com/logo.png"
                  className="w-full px-3 py-2 rounded-md text-sm font-[family-name:var(--font-sans)]"
                  style={{
                    background: 'var(--color-bg)',
                    border: `1px solid ${logoInvalid && touched ? 'var(--color-red)' : 'var(--color-border)'}`,
                    color: 'var(--color-text)',
                  }}
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ColorField
                  label="Couleur primaire"
                  hint="Score badge, liens, accents"
                  value={primaryColor}
                  onChange={setPrimaryColor}
                  invalid={primaryInvalid}
                  disabled={!canEdit}
                />
                <ColorField
                  label="Couleur secondaire"
                  hint="Dégradé cover, détails"
                  value={accentColor}
                  onChange={setAccentColor}
                  invalid={accentInvalid}
                  disabled={!canEdit}
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                  {canEdit
                    ? 'Appliqué aux prochains rapports générés.'
                    : 'Lecture seule — seuls les owners/admins peuvent modifier.'}
                </p>
                <button
                  type="submit"
                  disabled={disabled}
                  className="btn-primary"
                  style={{ opacity: disabled ? 0.5 : 1 }}
                >
                  {update.isPending ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </form>
          )}
        </div>

        {!isLoading && (
        <DomainSection
          org={org}
          canEdit={canEdit}
          customDomain={customDomain}
          setCustomDomain={setCustomDomain}
          customEmailFromName={customEmailFromName}
          setCustomEmailFromName={setCustomEmailFromName}
          domainTouched={domainTouched}
          setDomainTouched={setDomainTouched}
          showDeleteConfirm={showDeleteConfirm}
          setShowDeleteConfirm={setShowDeleteConfirm}
          updateDomain={updateDomain}
          domainStatus={domainStatus ?? null}
          isDomainStatusLoading={isDomainStatusLoading}
        />
        )}
      </section>
    </div>
  )
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string | null
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <div className="text-sm font-[family-name:var(--font-display)] mb-1">
        {label}
      </div>
      {children}
      {error ? (
        <p className="mt-1 text-xs" style={{ color: 'var(--color-red)' }}>
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-xs" style={{ color: 'var(--color-muted)' }}>
          {hint}
        </p>
      ) : null}
    </label>
  )
}

function ColorField({
  label,
  hint,
  value,
  onChange,
  invalid,
  disabled,
}: {
  label: string
  hint: string
  value: string
  onChange: (v: string) => void
  invalid: boolean
  disabled?: boolean
}) {
  return (
    <Field
      label={label}
      hint={hint}
      error={invalid ? 'Couleur hex attendue (ex: #FF6B35)' : null}
    >
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={HEX_REGEX.test(value) ? value : '#000000'}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          aria-label={`${label} : sélecteur visuel`}
          className="h-9 w-12 rounded cursor-pointer"
          style={{ border: '1px solid var(--color-border)' }}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="#FF6B35"
          className="flex-1 px-3 py-2 rounded-md text-sm font-mono"
          style={{
            background: 'var(--color-bg)',
            border: `1px solid ${invalid ? 'var(--color-red)' : 'var(--color-border)'}`,
            color: 'var(--color-text)',
          }}
        />
      </div>
    </Field>
  )
}

function DomainSection({
  org,
  canEdit,
  customDomain,
  setCustomDomain,
  customEmailFromName,
  setCustomEmailFromName,
  domainTouched,
  setDomainTouched,
  showDeleteConfirm,
  setShowDeleteConfirm,
  updateDomain,
  domainStatus,
  isDomainStatusLoading,
}: {
  org: OrgResponse | undefined
  canEdit: boolean
  customDomain: string
  setCustomDomain: (v: string) => void
  customEmailFromName: string
  setCustomEmailFromName: (v: string) => void
  domainTouched: boolean
  setDomainTouched: (v: boolean) => void
  showDeleteConfirm: boolean
  setShowDeleteConfirm: (v: boolean) => void
  updateDomain: UseMutationResult<OrgResponse, Error, UpdateCustomDomainInput>
  domainStatus: DomainStatus | null
  isDomainStatusLoading: boolean
}) {
  const hasDomainAccess = org?.plan === 'studio' || org?.plan === 'agency'
  const domainInvalid =
    customDomain.trim().length > 0 && !HOSTNAME_REGEX.test(customDomain.trim())
  const domainDisabled =
    !canEdit || updateDomain.isPending || domainInvalid || !customDomain.trim()

  const handleDomainSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setDomainTouched(true)
    if (domainInvalid) return
    updateDomain.mutate(
      {
        customDomain: customDomain.trim() || null,
        customEmailFromName: customEmailFromName.trim() || null,
      },
      {
        onSuccess: () => toast.success('Domaine enregistré'),
        onError: (err) =>
          toast.error(
            `Échec : ${err instanceof Error ? err.message : 'erreur inconnue'}`,
          ),
      },
    )
  }

  const handleDeleteDomain = () => {
    updateDomain.mutate(
      { customDomain: null, customEmailFromName: null },
      {
        onSuccess: () => {
          setCustomDomain('')
          setCustomEmailFromName('')
          setShowDeleteConfirm(false)
          toast.success('Domaine supprimé')
        },
        onError: (err) =>
          toast.error(
            `Échec : ${err instanceof Error ? err.message : 'erreur inconnue'}`,
          ),
      },
    )
  }

  return (
    <div id="domaine-personnalise" className="mt-6 card-premium">
      <header className="pb-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <h2 className="text-lg font-[family-name:var(--font-display)] font-semibold">
          Domaine personnalisé
        </h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-muted)' }}>
          Vos rapports seront accessibles sur votre propre domaine (ex :
          audits.votreagence.com). Nécessite un plan Studio ou Agency.
        </p>
      </header>

      {!hasDomainAccess ? (
        <div
          className="mt-4 px-4 py-3 rounded-md text-sm"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-muted)',
          }}
        >
          Disponible à partir du plan Studio (490 €/mois).
        </div>
      ) : (
        <form onSubmit={handleDomainSubmit} className="mt-4 space-y-5">
          <Field
            label="Domaine"
            error={
              domainTouched && domainInvalid
                ? 'Format invalide (ex : audits.votreagence.com)'
                : null
            }
          >
            <input
              type="text"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              disabled={!canEdit}
              placeholder="audits.votreagence.com"
              className="w-full px-3 py-2 rounded-md text-sm font-[family-name:var(--font-sans)]"
              style={{
                background: 'var(--color-bg)',
                border: `1px solid ${domainTouched && domainInvalid ? 'var(--color-red)' : 'var(--color-border)'}`,
                color: 'var(--color-text)',
              }}
            />
          </Field>

          <Field
            label="Nom d'expéditeur email"
            hint='Affiché comme expéditeur dans les emails post-audit (ex : « Agence Exemple <notifications@wyzlee.cloud> »)'
          >
            <input
              type="text"
              value={customEmailFromName}
              onChange={(e) => setCustomEmailFromName(e.target.value)}
              disabled={!canEdit}
              maxLength={80}
              placeholder="Agence Exemple"
              className="w-full px-3 py-2 rounded-md text-sm font-[family-name:var(--font-sans)]"
              style={{
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
            />
          </Field>

          {org?.customDomain && (
            <DomainStatusBlock
              customDomain={org.customDomain}
              domainStatus={domainStatus}
              isLoading={isDomainStatusLoading}
              showDeleteConfirm={showDeleteConfirm}
              setShowDeleteConfirm={setShowDeleteConfirm}
              onDelete={handleDeleteDomain}
              isDeleting={updateDomain.isPending}
              canEdit={canEdit}
            />
          )}

          <div
            className="flex items-center justify-between pt-4 border-t"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
              {canEdit
                ? 'Appliqué aux prochains rapports générés.'
                : 'Lecture seule — seuls les owners/admins peuvent modifier.'}
            </p>
            <button
              type="submit"
              disabled={domainDisabled}
              className="btn-primary"
              style={{ opacity: domainDisabled ? 0.5 : 1 }}
            >
              {updateDomain.isPending
                ? 'Enregistrement…'
                : 'Enregistrer le domaine'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

function DomainStatusBlock({
  customDomain,
  domainStatus,
  isLoading,
  showDeleteConfirm,
  setShowDeleteConfirm,
  onDelete,
  isDeleting,
  canEdit,
}: {
  customDomain: string
  domainStatus: DomainStatus | null
  isLoading: boolean
  showDeleteConfirm: boolean
  setShowDeleteConfirm: (v: boolean) => void
  onDelete: () => void
  isDeleting: boolean
  canEdit: boolean
}) {
  return (
    <div
      className="rounded-md p-4 space-y-3"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-sm font-[family-name:var(--font-display)]"
          style={{ color: 'var(--color-text)' }}
        >
          Statut DNS
        </span>
        <DnsStatusBadge status={domainStatus?.status ?? null} isLoading={isLoading} />
      </div>

      <div
        className="space-y-1 text-xs font-[family-name:var(--font-sans)]"
        style={{ color: 'var(--color-muted)' }}
      >
        <p>
          Pour activer votre domaine, créez un enregistrement CNAME chez votre
          registrar :
        </p>
        <div
          className="mt-2 rounded px-3 py-2 font-mono text-xs space-y-1"
          style={{
            background: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)',
          }}
        >
          <div>
            <span style={{ color: 'var(--color-muted)' }}>Type&nbsp;</span>{' '}
            CNAME
          </div>
          <div>
            <span style={{ color: 'var(--color-muted)' }}>Nom&nbsp;&nbsp;</span>{' '}
            {customDomain}
          </div>
          <div>
            <span style={{ color: 'var(--color-muted)' }}>Valeur</span>{' '}
            cname.vercel-dns.com
          </div>
        </div>
      </div>

      {canEdit && (
        <div className="pt-1">
          {showDeleteConfirm ? (
            <div className="flex items-center gap-3">
              <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
                Confirmer la suppression ?
              </span>
              <button
                type="button"
                onClick={onDelete}
                disabled={isDeleting}
                aria-label="Confirmer la suppression du domaine"
                className="px-3 py-1.5 rounded text-xs font-[family-name:var(--font-display)]"
                style={{
                  background: 'var(--color-red)',
                  color: '#fff',
                  minWidth: '44px',
                  minHeight: '44px',
                  opacity: isDeleting ? 0.6 : 1,
                }}
              >
                {isDeleting ? 'Suppression…' : 'Confirmer'}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                aria-label="Annuler la suppression du domaine"
                className="px-3 py-1.5 rounded text-xs font-[family-name:var(--font-display)]"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text)',
                  minWidth: '44px',
                  minHeight: '44px',
                }}
              >
                Annuler
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              aria-label="Supprimer le domaine personnalisé"
              className="px-3 py-1.5 rounded text-xs font-[family-name:var(--font-display)]"
              style={{
                border: '1px solid var(--color-red)',
                color: 'var(--color-red)',
                minWidth: '44px',
                minHeight: '44px',
              }}
            >
              Supprimer le domaine
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function DnsStatusBadge({
  status,
  isLoading,
}: {
  status: 'pending' | 'verified' | 'error' | null
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <span
        role="status"
        aria-label="Vérification du statut DNS en cours"
        className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full"
        style={{
          background: 'var(--color-surface)',
          color: 'var(--color-muted)',
          border: '1px solid var(--color-border)',
        }}
      >
        <svg
          className="animate-spin h-3 w-3"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        Vérification…
      </span>
    )
  }

  if (status === 'verified') {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full"
        style={{
          background: 'color-mix(in srgb, var(--color-green, #16a34a) 15%, transparent)',
          color: 'var(--color-green, #16a34a)',
          border: '1px solid var(--color-green, #16a34a)',
        }}
      >
        ✓ Vérifié
      </span>
    )
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full"
      style={{
        background: 'var(--color-surface)',
        color: 'var(--color-muted)',
        border: '1px solid var(--color-border)',
      }}
    >
      En attente
    </span>
  )
}
