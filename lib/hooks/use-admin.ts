'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiJson } from '@/lib/api/fetch'

export function useAdminMe() {
  return useQuery({
    queryKey: ['admin', 'me'],
    queryFn: () => apiJson<{ isSuperAdmin: boolean }>('/api/admin/me'),
    staleTime: 60_000,
  })
}

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => apiJson<{ organizations: number; users: number; audits: number }>('/api/admin/stats'),
  })
}

export interface AdminOrgRow {
  id: string
  name: string
  slug: string
  plan: string
  auditUsage: number
  subscriptionStatus: string | null
  stripeSubscriptionId: string | null
  memberCount: number
  createdAt: string
}

export function useAdminOrganizations() {
  return useQuery({
    queryKey: ['admin', 'organizations'],
    queryFn: () => apiJson<{ organizations: AdminOrgRow[] }>('/api/admin/organizations'),
  })
}

export function useAdminChangePlan(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (plan: string) =>
      apiJson<{ organization: AdminOrgRow }>(`/api/admin/organizations/${orgId}`, {
        method: 'PATCH',
        body: JSON.stringify({ plan }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'organizations'] })
    },
  })
}

export interface AdminUserRow {
  id: string
  email: string
  displayName: string | null
  isSuperAdmin: boolean
  createdAt: string
  memberships: Array<{ organizationId: string; organizationName: string; role: string }>
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => apiJson<{ users: AdminUserRow[] }>('/api/admin/users'),
  })
}
