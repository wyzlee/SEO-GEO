'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

interface InviteInfo {
  valid: boolean
  email?: string
  orgName?: string
  role?: string
  inviterName?: string
  error?: string
}

const ROLE_LABELS: Record<string, string> = {
  member: 'Membre',
  admin: 'Administrateur',
}

export default function InviteAcceptPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [info, setInfo] = useState<InviteInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) {
      setInfo({ valid: false, error: 'Aucun token fourni.' })
      setLoading(false)
      return
    }

    fetch(`/api/invitations/accept?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json()
        setInfo(data)
      })
      .catch(() => setInfo({ valid: false, error: 'Impossible de vérifier l\'invitation.' }))
      .finally(() => setLoading(false))
  }, [token])

  const handleAccept = () => {
    const redirectPath = `/invite/accept?token=${encodeURIComponent(token ?? '')}`
    window.location.href = `/login?redirect=${encodeURIComponent(redirectPath)}`
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center px-6"
      id="main-content"
    >
      <div
        className="w-full max-w-md card-premium space-y-6"
        style={{ textAlign: 'center' }}
      >
        <div
          className="w-12 h-12 rounded-full mx-auto flex items-center justify-center"
          aria-hidden="true"
          style={{ background: 'var(--color-surface)' }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-accent-primary, #4F46E5)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" y1="8" x2="19" y2="14" />
            <line x1="22" y1="11" x2="16" y2="11" />
          </svg>
        </div>

        {loading ? (
          <p
            role="status"
            aria-label="Vérification de l'invitation en cours"
            className="text-sm"
            style={{ color: 'var(--color-muted)' }}
          >
            Vérification de l'invitation…
          </p>
        ) : !token ? (
          <InvalidState message="Lien d'invitation invalide." />
        ) : info?.valid ? (
          <ValidState info={info} onAccept={handleAccept} />
        ) : (
          <InvalidState message={info?.error ?? 'Invitation invalide ou expirée.'} />
        )}
      </div>
    </main>
  )
}

function ValidState({
  info,
  onAccept,
}: {
  info: InviteInfo
  onAccept: () => void
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h1
          className="text-2xl font-bold font-[family-name:var(--font-display)]"
          style={{ color: 'var(--color-text)' }}
        >
          Vous avez été invité
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          {info.inviterName
            ? `${info.inviterName} vous invite à rejoindre `
            : 'Vous avez été invité à rejoindre '}
          <span
            className="font-semibold font-[family-name:var(--font-display)]"
            style={{ color: 'var(--color-text)' }}
          >
            {info.orgName}
          </span>{' '}
          en tant que{' '}
          <span style={{ color: 'var(--color-text)' }}>
            {info.role ? (ROLE_LABELS[info.role] ?? info.role) : 'Membre'}
          </span>
          .
        </p>
        {info.email && (
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
            Invitation destinée à{' '}
            <span className="font-[family-name:var(--font-sans)]">{info.email}</span>
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onAccept}
        className="btn-primary w-full"
        style={{ minHeight: '44px' }}
      >
        Accepter l'invitation
      </button>
    </div>
  )
}

function InvalidState({ message }: { message: string }) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h1
          className="text-xl font-bold font-[family-name:var(--font-display)]"
          style={{ color: 'var(--color-text)' }}
        >
          Invitation introuvable
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          {message}
        </p>
      </div>
      <a
        href="/dashboard"
        className="btn-primary block w-full"
        style={{ minHeight: '44px', lineHeight: '44px' }}
      >
        Retour au tableau de bord
      </a>
    </div>
  )
}
