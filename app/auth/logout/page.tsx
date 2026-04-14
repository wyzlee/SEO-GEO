'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/context'

export default function LogoutPage() {
  const { logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    logout()
      .catch(() => undefined)
      .finally(() => router.replace('/'))
  }, [logout, router])

  return (
    <main className="min-h-screen flex items-center justify-center">
      <p
        className="text-sm font-[family-name:var(--font-sans)]"
        style={{ color: 'var(--color-muted)' }}
      >
        Déconnexion…
      </p>
    </main>
  )
}
