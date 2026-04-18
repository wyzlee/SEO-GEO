'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiJson, authFetch } from '@/lib/api/fetch'

export interface ScheduledAuditRow {
  id: string
  organizationId: string
  createdBy: string
  targetUrl: string
  mode: string
  frequency: string
  nextRunAt: string
  lastRunAt: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateScheduledAuditInput {
  targetUrl: string
  frequency: 'daily' | 'weekly' | 'monthly'
  mode: 'standard' | 'full'
}

export function useScheduledAudits() {
  return useQuery({
    queryKey: ['scheduled-audits'],
    queryFn: () =>
      apiJson<{ scheduledAudits: ScheduledAuditRow[] }>('/api/scheduled-audits'),
    staleTime: 30_000,
  })
}

export function useCreateScheduledAudit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateScheduledAuditInput) =>
      apiJson<{ scheduledAudit: ScheduledAuditRow }>('/api/scheduled-audits', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scheduled-audits'] })
    },
  })
}

export function useDeleteScheduledAudit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await authFetch(`/api/scheduled-audits/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok && res.status !== 204) {
        throw new Error(`Erreur ${res.status}`)
      }
      return id
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scheduled-audits'] })
    },
  })
}
