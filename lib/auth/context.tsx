'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react'
import { getStackAuth } from './stack-auth'
import { setTokenGetter } from '@/lib/api/fetch'

interface AuthUser {
  id: string
  email: string
  name?: string
}

interface AuthContextType {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  getToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const stackAuth = getStackAuth()

  const getTokenFn = useCallback(async (): Promise<string | null> => {
    try {
      return await stackAuth.getAccessToken()
    } catch {
      return null
    }
  }, [stackAuth])

  useEffect(() => {
    setTokenGetter(getTokenFn)
  }, [getTokenFn])

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await stackAuth.getUser()
      if (!currentUser) {
        setUser(null)
        setToken(null)
        return
      }
      const accessToken = await stackAuth.getAccessToken()
      setToken(accessToken)
      setUser({
        id: currentUser.id,
        email: currentUser.primaryEmail || '',
        name: currentUser.displayName || '',
      })
    } catch {
      setUser(null)
      setToken(null)
    }
  }, [stackAuth])

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      window.location.pathname === '/auth/callback'
    ) {
      setLoading(false)
      return
    }

    let cancelled = false

    const ssoToken = new URLSearchParams(window.location.search).get(
      'sso_token',
    )
    if (ssoToken) {
      const projectId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID
      const secureFlag =
        window.location.protocol === 'https:' ? '; Secure' : ''
      document.cookie = `stack-refresh-${projectId}=${ssoToken}; path=/; max-age=31536000; SameSite=Lax${secureFlag}`
      const params = new URLSearchParams(window.location.search)
      params.delete('sso_token')
      const cleanUrl = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname
      window.history.replaceState({}, '', cleanUrl)
    }

    refreshUser().finally(() => {
      if (!cancelled) setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [refreshUser])

  const login = async (email: string, password: string) => {
    await stackAuth.signInWithCredential({ email, password })
    await refreshUser()
  }

  const logout = async () => {
    const currentUser = await stackAuth.getUser()
    if (currentUser) await currentUser.signOut()
    setUser(null)
    setToken(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        loading,
        login,
        logout,
        refreshUser,
        getToken: getTokenFn,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
