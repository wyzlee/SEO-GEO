'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth/context'

export default function SignupPage() {
  const { signup } = useAuth()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      toast.error('Les mots de passe ne correspondent pas.')
      return
    }
    if (password.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    setSubmitting(true)
    try {
      await signup(email, password)
      toast.success('Compte créé — bienvenue !')
      router.push('/onboarding')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Inscription impossible')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main id="main-content" className="min-h-screen flex items-center justify-center px-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm card-premium space-y-5"
      >
        <div className="space-y-1">
          <h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">
            Créer un compte
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            Gratuit — 1 audit offert, sans carte bancaire.
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-medium mb-1 font-[family-name:var(--font-display)]"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-modern"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-xs font-medium mb-1 font-[family-name:var(--font-display)]"
            >
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-modern"
            />
          </div>
          <div>
            <label
              htmlFor="confirm"
              className="block text-xs font-medium mb-1 font-[family-name:var(--font-display)]"
            >
              Confirmer le mot de passe
            </label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="input-modern"
            />
          </div>
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? 'Création du compte…' : 'Créer mon compte'}
        </button>

        <p className="text-center text-xs" style={{ color: 'var(--color-muted)' }}>
          Déjà un compte ?{' '}
          <Link href="/login" style={{ color: 'var(--color-accent)' }}>
            Se connecter →
          </Link>
        </p>
      </form>
    </main>
  )
}
