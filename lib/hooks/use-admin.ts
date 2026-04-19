'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiJson } from '@/lib/api/fetch'

export function useAdminMe(enabled = true) {
  return useQuery({
    queryKey: ['admin', 'me'],
    queryFn: () => apiJson<{ isSuperAdmin: boolean }>('/api/admin/me'),
    staleTime: 60_000,
    retry: false,
    enabled,
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

// ─── Audit types ────────────────────────────────────────────────────────────

export interface AdminAuditRow {
  id: string
  organizationId: string
  organizationName: string
  createdByEmail: string
  inputType: string
  targetUrl: string | null
  status: string
  scoreTotal: number | null
  mode: string
  createdAt: string
  finishedAt: string | null
  errorMessage: string | null
}

// ─── User mutations ──────────────────────────────────────────────────────────

export function useAdminSyncUsers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiJson<{ synced: number }>('/api/admin/sync-users', { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })
}

export function useAdminToggleSuperAdmin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isSuperAdmin }: { id: string; isSuperAdmin: boolean }) =>
      apiJson<{ isSuperAdmin: boolean }>(`/api/admin/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isSuperAdmin }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
  })
}

export function useAdminDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiJson<{ deleted: boolean }>(`/api/admin/users/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })
}

// ─── Organization mutations ──────────────────────────────────────────────────

export function useAdminCreateOrg() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; slug: string; plan: string }) =>
      apiJson<{ organization: AdminOrgRow }>('/api/admin/organizations', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'organizations'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })
}

export function useAdminDeleteOrg() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiJson<{ deleted: boolean }>(`/api/admin/organizations/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'organizations'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })
}

// ─── Audit queries & mutations ────────────────────────────────────────────────

export function useAdminAudits() {
  return useQuery({
    queryKey: ['admin', 'audits'],
    queryFn: () => apiJson<{ audits: AdminAuditRow[] }>('/api/admin/audits'),
  })
}

export function useAdminDeleteAudit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiJson<{ deleted: boolean }>(`/api/admin/audits/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'audits'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })
}

// ─── Organization detail types ────────────────────────────────────────────────

export interface AdminOrgDetail {
  organization: {
    id: string
    name: string
    slug: string
    plan: string
    auditUsage: number
    subscriptionStatus: string | null
    stripeCustomerId: string | null
    stripeSubscriptionId: string | null
    stripePriceId: string | null
    createdAt: string
    updatedAt: string
  }
  members: Array<{
    userId: string
    email: string
    displayName: string | null
    avatarUrl: string | null
    role: string
    joinedAt: string
  }>
  recentAudits: Array<{
    id: string
    targetUrl: string | null
    status: string
    scoreTotal: number | null
    mode: string
    createdAt: string
    finishedAt: string | null
  }>
}

export interface AdminPlanConfig {
  id: string
  name: string
  priceMonthly: number
  priceId: string | null
  auditLimit: number
  orgCount: number
}

// ─── Organization detail hooks ────────────────────────────────────────────────

export function useAdminOrgDetail(id: string) {
  return useQuery({
    queryKey: ['admin', 'org', id],
    queryFn: () => apiJson<AdminOrgDetail>(`/api/admin/organizations/${id}`),
    enabled: !!id,
  })
}

export function useAdminUpdateOrg(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { plan?: string; name?: string; auditUsage?: number }) =>
      apiJson<{ organization: AdminOrgDetail['organization'] }>(`/api/admin/organizations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'organizations'] })
      qc.invalidateQueries({ queryKey: ['admin', 'org', id] })
    },
  })
}

// ─── Organization membership hooks ───────────────────────────────────────────

export function useAdminAddMember(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { userId: string; role: string }) =>
      apiJson<{ member: AdminOrgDetail['members'][number] }>(
        `/api/admin/organizations/${orgId}/members`,
        { method: 'POST', body: JSON.stringify(body) },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'organizations'] })
      qc.invalidateQueries({ queryKey: ['admin', 'org', orgId] })
    },
  })
}

export function useAdminUpdateMember(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      apiJson<{ member: AdminOrgDetail['members'][number] }>(
        `/api/admin/organizations/${orgId}/members/${userId}`,
        { method: 'PATCH', body: JSON.stringify({ role }) },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'org', orgId] })
    },
  })
}

export function useAdminRemoveMember(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) =>
      apiJson<{ removed: boolean }>(
        `/api/admin/organizations/${orgId}/members/${userId}`,
        { method: 'DELETE' },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'organizations'] })
      qc.invalidateQueries({ queryKey: ['admin', 'org', orgId] })
    },
  })
}

// ─── Plans hook ───────────────────────────────────────────────────────────────

export function useAdminPlans() {
  return useQuery({
    queryKey: ['admin', 'plans'],
    queryFn: () => apiJson<{ plans: AdminPlanConfig[] }>('/api/admin/plans'),
    staleTime: 60_000,
  })
}
