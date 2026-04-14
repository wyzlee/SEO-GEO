'use client'

import { FormEvent, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth/context'

export default function LoginPage() {
  const { login } = useAuth()
  const router = useRouter()
  const search = useSearchParams()
  const redirect = search.get('redirect') || '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await login(email, password)
      toast.success('Connexion réussie')
      router.push(redirect)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Connexion impossible')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm card-premium space-y-5"
      >
        <div className="space-y-1">
          <h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">
            Se connecter
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            Accès interne SEO-GEO.
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
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-modern"
            />
          </div>
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </main>
  )
}
