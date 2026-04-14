'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth/context'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      const target = `/login?redirect=${encodeURIComponent(pathname || '/dashboard')}`
      router.replace(target)
    }
  }, [loading, isAuthenticated, router, pathname])

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div
          className="h-10 w-10 rounded-full border-[3px] animate-spin"
          style={{
            borderColor: 'var(--color-border)',
            borderTopColor: 'var(--color-accent)',
          }}
          aria-label="Vérification de la session"
        />
      </div>
    )
  }

  return <>{children}</>
}
