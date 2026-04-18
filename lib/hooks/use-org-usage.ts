'use client'

import { useQuery } from '@tanstack/react-query'
import { apiJson } from '@/lib/api/fetch'

export interface OrgUsage {
  plan: string
  auditUsage: number
  auditLimit: number | null
  recentAudits: {
    id: string
    targetUrl: string | null
    status: string
    scoreTotal: number | null
    createdAt: string
  }[]
  auditsByDay: { date: string; count: number }[]
}

export function useOrgUsage() {
  return useQuery({
    queryKey: ['org', 'usage'],
    queryFn: () => apiJson<OrgUsage>('/api/organizations/me/usage'),
    staleTime: 60_000,
  })
}
