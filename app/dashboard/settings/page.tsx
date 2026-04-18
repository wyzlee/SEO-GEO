'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/header'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import {
  useOrganization,
  useUpdateBranding,
} from '@/lib/hooks/use-organization'

const HEX_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

export default function SettingsPage() {
  const { data: org, isLoading } = useOrganization()
  const update = useUpdateBranding()

  const [companyName, setCompanyName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#FF6B35')
  const [accentColor, setAccentColor] = useState('#E55A22')
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (!org?.branding) return
    setCompanyName(org.branding.companyName ?? '')
    setLogoUrl(org.branding.logoUrl ?? '')
    setPrimaryColor(org.branding.primaryColor ?? '#FF6B35')
    setAccentColor(org.branding.accentColor ?? '#E55A22')
  }, [org?.branding])

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
