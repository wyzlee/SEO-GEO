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
      // Efface les cookies Stack Auth pour éviter que le middleware ne renvoie sur /dashboard
      const projectId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID
      if (projectId) {
        document.cookie = `stack-access-${projectId}=; path=/; max-age=0; SameSite=Lax`
        document.cookie = `stack-refresh-${projectId}=; path=/; max-age=0; SameSite=Lax`
      }
      document.cookie = `stack-access=; path=/; max-age=0; SameSite=Lax`
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
