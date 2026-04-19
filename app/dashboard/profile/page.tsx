'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Save, Mail, BadgeCheck } from 'lucide-react'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { useAuth } from '@/lib/auth/context'
import { apiJson } from '@/lib/api/fetch'
import { useMutation, useQueryClient } from '@tanstack/react-query'

function useUpdateProfile() {
  return useMutation({
    mutationFn: (data: { displayName: string }) =>
      apiJson<{ ok: boolean; displayName: string }>('/api/me/profile', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  })
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const update = useUpdateProfile()
  const queryClient = useQueryClient()

  const [displayName, setDisplayName] = useState('')
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (user?.name) setDisplayName(user.name)
  }, [user?.name])

  const canSave = touched && displayName.trim().length > 0 && displayName.trim().length <= 100

  async function handleSave() {
    if (!canSave) return
    try {
      await update.mutateAsync({ displayName: displayName.trim() })
      await refreshUser()
      queryClient.invalidateQueries({ queryKey: ['me'] })
      setTouched(false)
      toast.success('Profil mis à jour')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur de mise à jour')
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-xl">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Mon profil' },
        ]}
      />

      <div>
        <h1
          className="text-2xl font-[family-name:var(--font-display)] font-bold"
          style={{ color: 'var(--color-text)' }}
        >
          Mon profil
        </h1>
        <p className="text-sm mt-1 font-[family-name:var(--font-sans)]" style={{ color: 'var(--color-muted)' }}>
          Informations de votre compte personnel.
        </p>
      </div>

      {/* Carte profil */}
      <div className="card-premium space-y-5">
        {/* Avatar placeholder */}
        <div className="flex items-center gap-4">
          <div
            className="flex items-center justify-center rounded-full shrink-0"
            style={{
              width: 56,
              height: 56,
              background: 'color-mix(in srgb, var(--color-accent) 14%, transparent)',
            }}
          >
            <span
              className="text-xl font-[family-name:var(--font-display)] font-bold"
              style={{ color: 'var(--color-accent)' }}
            >
              {(displayName || user?.email || '?').charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <div
              className="font-[family-name:var(--font-display)] font-semibold text-base"
              style={{ color: 'var(--color-text)' }}
            >
              {displayName || user?.email || '—'}
            </div>
            <div className="text-[12px] font-[family-name:var(--font-sans)] mt-0.5" style={{ color: 'var(--color-muted)' }}>
              {user?.email}
            </div>
          </div>
        </div>

        <hr style={{ borderColor: 'var(--color-border)' }} />

        {/* Nom affiché */}
        <div className="space-y-1.5">
          <label
            htmlFor="display-name"
            className="text-[12px] font-[family-name:var(--font-display)] font-semibold tracking-wide"
            style={{ color: 'var(--color-muted)' }}
          >
            NOM AFFICHÉ
          </label>
          <input
            id="display-name"
            type="text"
            value={displayName}
            onChange={(e) => { setDisplayName(e.target.value); setTouched(true) }}
            maxLength={100}
            placeholder="Votre nom ou prénom"
            className="w-full px-3 py-2 rounded-lg text-sm font-[family-name:var(--font-sans)] transition-colors"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
              outline: 'none',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)' }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
          />
          <p className="text-[11px] font-[family-name:var(--font-sans)]" style={{ color: 'var(--color-muted)' }}>
            Visible dans l'interface et les rapports.
          </p>
        </div>

        {/* Email — lecture seule */}
        <div className="space-y-1.5">
          <label
            className="text-[12px] font-[family-name:var(--font-display)] font-semibold tracking-wide"
            style={{ color: 'var(--color-muted)' }}
          >
            ADRESSE EMAIL
          </label>
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-[family-name:var(--font-sans)]"
            style={{
              background: 'color-mix(in srgb, var(--color-surface) 60%, transparent)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-muted)',
            }}
          >
            <Mail size={14} aria-hidden="true" style={{ color: 'var(--color-muted)', flexShrink: 0 }} />
            <span>{user?.email || '—'}</span>
            <BadgeCheck size={14} aria-hidden="true" style={{ color: 'var(--color-green)', marginLeft: 'auto', flexShrink: 0 }} />
          </div>
          <p className="text-[11px] font-[family-name:var(--font-sans)]" style={{ color: 'var(--color-muted)' }}>
            Modifiable via votre compte Stack Auth ou par un administrateur.
          </p>
        </div>

        {/* Bouton save */}
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave || update.isPending}
            className="btn-primary flex items-center gap-2 text-sm"
            style={{ minHeight: 40, opacity: canSave ? 1 : 0.5, cursor: canSave ? 'pointer' : 'not-allowed' }}
          >
            <Save size={14} aria-hidden="true" />
            {update.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>

      {/* Infos de session */}
      <div className="card-premium space-y-3">
        <h2
          className="text-[13px] font-[family-name:var(--font-display)] font-semibold"
          style={{ color: 'var(--color-text)' }}
        >
          Session
        </h2>
        <dl className="space-y-2 text-[12px] font-[family-name:var(--font-sans)]">
          <div className="flex justify-between gap-4">
            <dt style={{ color: 'var(--color-muted)' }}>Identifiant</dt>
            <dd className="truncate" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-mono, monospace)', fontSize: 11 }}>
              {user?.id || '—'}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
