'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { apiJson } from '@/lib/api/fetch'
import { useMe } from '@/lib/hooks/use-me'

type Step = 1 | 2 | 3

function extractErrorMessage(err: unknown): string {
  if (!(err instanceof Error)) return 'Erreur inattendue.'
  // apiJson inclut le JSON du body dans le message : "Request failed (400): {...}"
  const match = err.message.match(/:\s*(\{.*\})$/)
  if (match) {
    try {
      const parsed = JSON.parse(match[1]) as Record<string, unknown>
      if (typeof parsed.error === 'string') return parsed.error
    } catch {
      // ignore, on retombe sur le message brut
    }
  }
  return err.message
}

const STEP_LABELS = ['Votre espace', 'Premier audit', 'Confirmation']

export default function OnboardingPage() {
  const router = useRouter()
  const { data: me, isLoading: meLoading } = useMe()

  const [step, setStep] = useState<Step>(1)
  const [orgName, setOrgName] = useState('')
  const [targetUrl, setTargetUrl] = useState('')
  const [orgId, setOrgId] = useState<string | null>(null)

  const [step1Error, setStep1Error] = useState<string | null>(null)
  const [step1Loading, setStep1Loading] = useState(false)
  const [step2Error, setStep2Error] = useState<string | null>(null)
  const [step2Loading, setStep2Loading] = useState(false)

  // Guard contre le double-onboarding : si l'user a déjà une org, on redirige
  useEffect(() => {
    if (!meLoading && me && me.memberships.length > 0) {
      router.replace('/dashboard')
    }
  }, [meLoading, me, router])

  async function handleStep1Submit(e: React.FormEvent) {
    e.preventDefault()
    if (orgName.trim().length < 2) {
      setStep1Error('Le nom doit contenir au moins 2 caractères.')
      return
    }
    setStep1Error(null)
    setStep1Loading(true)
    try {
      const data = await apiJson<{ org: { id: string } }>('/api/organizations', {
        method: 'POST',
        body: JSON.stringify({ name: orgName.trim() }),
      })
      setOrgId(data.org.id)
      setStep(2)
    } catch (err) {
      setStep1Error(extractErrorMessage(err))
    } finally {
      setStep1Loading(false)
    }
  }

  async function handleStep2Submit(e: React.FormEvent) {
    e.preventDefault()
    const url = targetUrl.trim()
    if (!url.match(/^https?:\/\/.+/)) {
      setStep2Error("L'URL doit commencer par http:// ou https://")
      return
    }
    setStep2Error(null)
    setStep2Loading(true)
    try {
      await apiJson('/api/audits', {
        method: 'POST',
        body: JSON.stringify({ targetUrl: url }),
        orgId: orgId ?? undefined,
      })
      setStep(3)
    } catch (err) {
      setStep2Error(extractErrorMessage(err))
    } finally {
      setStep2Loading(false)
    }
  }

  function handleSkip() {
    router.push('/dashboard')
  }

  if (meLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--color-bg)' }}
      >
        <div
          role="status"
          aria-label="Chargement"
          className="h-10 w-10 rounded-full border-[3px] animate-spin"
          style={{
            borderColor: 'var(--color-border)',
            borderTopColor: 'var(--color-accent)',
          }}
        />
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: 'var(--color-bg)' }}
    >
      <div className="w-full max-w-md">
        {/* Barre de progression */}
        <nav aria-label="Étapes de l'onboarding" className="mb-10">
          <ol className="flex items-center gap-2">
            {STEP_LABELS.map((label, idx) => {
              const stepNum = (idx + 1) as Step
              const isActive = step === stepNum
              const isDone = step > stepNum
              return (
                <li key={stepNum} className="flex items-center gap-2 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold font-[family-name:var(--font-display)] transition-colors duration-200"
                      style={{
                        background: isDone || isActive
                          ? 'var(--color-accent)'
                          : 'var(--color-surface)',
                        color: isDone || isActive
                          ? '#ffffff'
                          : 'var(--color-muted)',
                        border: isDone || isActive
                          ? 'none'
                          : '1px solid var(--color-border)',
                      }}
                      aria-current={isActive ? 'step' : undefined}
                    >
                      {isDone ? '✓' : stepNum}
                    </span>
                    <span
                      className="text-xs font-[family-name:var(--font-sans)] truncate hidden sm:block"
                      style={{
                        color: isActive ? 'var(--color-text)' : 'var(--color-muted)',
                      }}
                    >
                      {label}
                    </span>
                  </div>
                  {idx < STEP_LABELS.length - 1 && (
                    <div
                      className="flex-1 h-px mx-1"
                      style={{
                        background: step > stepNum
                          ? 'var(--color-accent)'
                          : 'var(--color-border)',
                        transition: 'background 300ms cubic-bezier(0.4,0,0.2,1)',
                      }}
                    />
                  )}
                </li>
              )
            })}
          </ol>
        </nav>

        {/* Étape 1 — Nom de l'organisation */}
        {step === 1 && (
          <div
            className="card-premium"
            style={{ animation: 'flash-fade-in 200ms ease-out' }}
          >
            <h1
              className="text-2xl font-bold font-[family-name:var(--font-display)] mb-2"
              style={{ color: 'var(--color-text)' }}
            >
              Bienvenue sur SEO-GEO
            </h1>
            <p
              className="text-sm font-[family-name:var(--font-sans)] mb-6"
              style={{ color: 'var(--color-muted)' }}
            >
              Commençons par donner un nom à votre espace de travail.
            </p>

            <form onSubmit={handleStep1Submit} noValidate>
              <div className="space-y-2 mb-6">
                <label
                  htmlFor="org-name"
                  className="block text-sm font-semibold font-[family-name:var(--font-display)]"
                  style={{ color: 'var(--color-text)' }}
                >
                  Nom de votre organisation
                </label>
                <input
                  id="org-name"
                  type="text"
                  className="input-modern"
                  placeholder="ex : Agence Dupont, Studio XYZ…"
                  value={orgName}
                  onChange={(e) => {
                    setOrgName(e.target.value)
                    if (step1Error) setStep1Error(null)
                  }}
                  autoFocus
                  autoComplete="organization"
                  aria-describedby={step1Error ? 'step1-error' : undefined}
                  aria-invalid={!!step1Error}
                  disabled={step1Loading}
                />
                {step1Error && (
                  <p
                    id="step1-error"
                    role="alert"
                    className="text-xs font-[family-name:var(--font-sans)]"
                    style={{ color: 'var(--color-red)' }}
                  >
                    {step1Error}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="btn-primary w-full"
                disabled={step1Loading || orgName.trim().length < 2}
                aria-busy={step1Loading}
              >
                {step1Loading ? 'Création en cours…' : 'Continuer'}
              </button>
            </form>
          </div>
        )}

        {/* Étape 2 — Premier audit */}
        {step === 2 && (
          <div
            className="card-premium"
            style={{ animation: 'flash-fade-in 200ms ease-out' }}
          >
            <h1
              className="text-2xl font-bold font-[family-name:var(--font-display)] mb-2"
              style={{ color: 'var(--color-text)' }}
            >
              Votre premier audit
            </h1>
            <p
              className="text-sm font-[family-name:var(--font-sans)] mb-6"
              style={{ color: 'var(--color-muted)' }}
            >
              Entrez l&apos;URL du site à analyser.
            </p>

            <form onSubmit={handleStep2Submit} noValidate>
              <div className="space-y-2 mb-6">
                <label
                  htmlFor="target-url"
                  className="block text-sm font-semibold font-[family-name:var(--font-display)]"
                  style={{ color: 'var(--color-text)' }}
                >
                  URL à auditer
                </label>
                <input
                  id="target-url"
                  type="url"
                  className="input-modern"
                  placeholder="https://votre-site.com"
                  value={targetUrl}
                  onChange={(e) => {
                    setTargetUrl(e.target.value)
                    if (step2Error) setStep2Error(null)
                  }}
                  autoFocus
                  autoComplete="url"
                  aria-describedby={step2Error ? 'step2-error' : 'step2-hint'}
                  aria-invalid={!!step2Error}
                  disabled={step2Loading}
                />
                {step2Error ? (
                  <p
                    id="step2-error"
                    role="alert"
                    className="text-xs font-[family-name:var(--font-sans)]"
                    style={{ color: 'var(--color-red)' }}
                  >
                    {step2Error}
                  </p>
                ) : (
                  <p
                    id="step2-hint"
                    className="text-xs font-[family-name:var(--font-sans)]"
                    style={{ color: 'var(--color-muted)' }}
                  >
                    Format attendu : https://exemple.com
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <button
                  type="submit"
                  className="btn-primary w-full"
                  disabled={step2Loading || !targetUrl.trim()}
                  aria-busy={step2Loading}
                >
                  {step2Loading ? 'Lancement en cours…' : "Lancer l'audit"}
                </button>

                <button
                  type="button"
                  className="btn-secondary w-full"
                  onClick={handleSkip}
                  disabled={step2Loading}
                >
                  Passer pour l&apos;instant — aller au dashboard
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Étape 3 — Confirmation */}
        {step === 3 && (
          <div
            className="card-premium text-center"
            style={{ animation: 'flash-fade-in 200ms ease-out' }}
          >
            <div
              className="mx-auto mb-4 w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: 'var(--color-green)', opacity: 0.15 }}
              aria-hidden="true"
            />
            <div
              className="mx-auto -mt-16 mb-4 w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: 'var(--color-green)' }}
              aria-hidden="true"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ffffff"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            <h1
              className="text-2xl font-bold font-[family-name:var(--font-display)] mb-2"
              style={{ color: 'var(--color-text)' }}
            >
              Votre audit est en cours !
            </h1>
            <p
              className="text-sm font-[family-name:var(--font-sans)] mb-8"
              style={{ color: 'var(--color-muted)' }}
            >
              Vous recevrez un e-mail quand le rapport sera prêt (3 à 5 minutes).
            </p>

            <Link href="/dashboard" className="btn-primary w-full">
              Voir le dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
