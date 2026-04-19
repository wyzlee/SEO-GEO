'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/context'
import { authFetch } from '@/lib/api/fetch'

export interface OrgSummary {
  organizationId: string
  organizationName: string
  organizationSlug: string
  role: string
}

function getCurrentOrgId(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/seo-geo-org=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

export function setCurrentOrgId(orgId: string) {
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `seo-geo-org=${encodeURIComponent(orgId)}; path=/; max-age=2592000; SameSite=Lax${secure}`
}

export function useOrganizations() {
  const [orgs, setOrgs] = useState<OrgSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentOrgId, setCurrentOrgIdState] = useState<string | null>(null)
  const { user, loading: authLoading } = useAuth()

  useEffect(() => {
    setCurrentOrgIdState(getCurrentOrgId())
    if (authLoading || !user) {
      if (!authLoading) setIsLoading(false)
      return
    }
    authFetch('/api/organizations')
      .then(r => r.ok ? r.json() : { memberships: [] })
      .then(data => { setOrgs(data.memberships ?? []); setIsLoading(false) })
      .catch(() => setIsLoading(false))
  }, [user, authLoading])

  const switchOrg = (orgId: string) => {
    setCurrentOrgId(orgId)
    window.location.reload()
  }

  const activeOrg = orgs.find(o => o.organizationId === currentOrgId) ?? orgs[0]

  return { orgs, isLoading, activeOrg, switchOrg }
}
