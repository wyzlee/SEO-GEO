'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getStackAuth } from '@/lib/auth/stack-auth'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const stackAuth = getStackAuth()
    stackAuth
      .callOAuthCallback()
      .then(() => router.replace('/dashboard'))
      .catch(() => router.replace('/login?error=oauth'))
  }, [router])

  return (
    <main id="main-content" className="min-h-screen flex items-center justify-center">
      <p
        className="text-sm font-[family-name:var(--font-sans)]"
        style={{ color: 'var(--color-muted)' }}
      >
        Finalisation de la connexion…
      </p>
    </main>
  )
}
