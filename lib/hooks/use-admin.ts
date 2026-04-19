'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiJson } from '@/lib/api/fetch'

export interface AdminMeResponse {
  isSuperAdmin: boolean
  userId?: string
  email?: string
  orgId?: string | null
  orgRole?: string | null
  orgName?: string | null
}

export function useAdminMe(enabled = true) {
  return useQuery({
    queryKey: ['admin', 'me'],
    queryFn: () => apiJson<AdminMeResponse>('/api/admin/me'),
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

// ─── Org-scoped member hooks (org-admin + super-admin) ────────────────────────
// Uses /api/admin/org/members which accepts both org-admins (auto-resolved)
// and super-admins (resolved via x-org-id header).

export interface OrgMember {
  userId: string
  email: string
  displayName: string | null
  avatarUrl: string | null
  role: string
  joinedAt: string
}

/**
 * Fetches members of the current admin org.
 * Super-admins pass orgId via x-org-id header; org-admins are auto-scoped.
 * orgId = null → query disabled (super-admin hasn't selected an org yet).
 */
export function useOrgMembers(orgId: string | null) {
  return useQuery({
    queryKey: ['admin', 'org', orgId, 'members'],
    queryFn: () =>
      apiJson<{ members: OrgMember[] }>('/api/admin/org/members', {
        orgId: orgId ?? undefined,
      }).then((d) => d.members),
    enabled: !!orgId,
    staleTime: 30_000,
  })
}

export function useOrgAddMember(orgId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { userId: string; role: string }) => {
      if (!orgId) return Promise.reject(new Error('No org selected'))
      return apiJson<{ member: OrgMember }>('/api/admin/org/members', {
        method: 'POST',
        body: JSON.stringify(body),
        orgId,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'org', orgId, 'members'] })
    },
  })
}

export function useOrgUpdateMember(orgId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) => {
      if (!orgId) return Promise.reject(new Error('No org selected'))
      return apiJson<{ member: OrgMember }>(
        `/api/admin/org/members/${userId}`,
        { method: 'PATCH', body: JSON.stringify({ role }), orgId },
      )
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'org', orgId, 'members'] })
    },
  })
}

export function useOrgRemoveMember(orgId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => {
      if (!orgId) return Promise.reject(new Error('No org selected'))
      return apiJson<{ removed: boolean }>(
        `/api/admin/org/members/${userId}`,
        { method: 'DELETE', orgId },
      )
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'org', orgId, 'members'] })
      qc.invalidateQueries({ queryKey: ['admin', 'organizations'] })
    },
  })
}

/**
 * Audits for the current org.
 *
 * Calls GET /api/admin/audits which is super-admin gated.
 * For org-admins, this will 403 until a scoped org audit endpoint is
 * implemented. The org-audits page handles this gracefully with an error state.
 *
 * TODO (backend-builder): add GET /api/admin/org/audits using requireAdmin +
 * resolveOrgId to make this accessible to org-admins.
 */
export function useOrgAudits(orgId: string | null) {
  return useQuery({
    queryKey: ['admin', 'org-audits', orgId],
    queryFn: () =>
      apiJson<{ audits: AdminAuditRow[] }>('/api/admin/audits'),
    staleTime: 30_000,
    retry: false,
  })
}
