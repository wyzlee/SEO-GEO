'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiJson, authFetch } from '@/lib/api/fetch'

export interface AuditRow {
  id: string
  organizationId: string
  createdBy: string
  inputType: 'url' | 'zip' | 'github'
  targetUrl: string | null
  uploadPath?: string | null
  githubRepo: string | null
  status: 'queued' | 'running' | 'completed' | 'failed'
  scoreTotal: number | null
  scoreBreakdown: Record<string, number> | null
  clientName: string | null
  consultantName: string | null
  mode: string
  previousAuditId: string | null
  createdAt: string
  startedAt: string | null
  finishedAt: string | null
  errorMessage: string | null
}

export interface FindingRow {
  id: string
  auditId: string
  phaseKey: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  category: string | null
  title: string
  description: string
  recommendation: string
  locationUrl: string | null
  locationFile: string | null
  locationLine: number | null
  metricValue: string | null
  metricTarget: string | null
  pointsLost: number
  effort: 'quick' | 'medium' | 'heavy' | null
  createdAt: string
}

export interface PhaseWithFindings {
  id: string
  auditId: string
  phaseKey: string
  phaseOrder: number
  score: number | null
  scoreMax: number
  status: 'pending' | 'running' | 'completed' | 'skipped' | 'failed'
  summary: string | null
  startedAt: string | null
  finishedAt: string | null
  findings: FindingRow[]
}

export interface AuditDetail {
  audit: AuditRow
  phases: PhaseWithFindings[]
}

export function useAudits() {
  return useQuery({
    queryKey: ['audits'],
    queryFn: () => apiJson<{ audits: AuditRow[] }>('/api/audits'),
    staleTime: 10_000,
  })
}

export function useAudit(id: string | undefined) {
  return useQuery({
    queryKey: ['audit', id],
    enabled: !!id,
    queryFn: () => apiJson<AuditDetail>(`/api/audits/${id}`),
    refetchInterval: (query) => {
      const status = query.state.data?.audit.status
      if (status === 'queued' || status === 'running') return 2000
      return false
    },
  })
}

export interface CreateAuditInput {
  targetUrl?: string
  uploadPath?: string
  githubRepo?: string
  clientName?: string
  consultantName?: string
  mode?: 'full' | 'standard'
}

export function useCreateAudit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateAuditInput) =>
      apiJson<{ id: string; status: string }>('/api/audits', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['audits'] })
    },
  })
}

export interface UpdateAuditInput {
  clientName?: string | null
  consultantName?: string | null
}

export function useUpdateAudit(id: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateAuditInput) =>
      apiJson<{ audit: AuditRow }>(`/api/audits/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: (data) => {
      qc.setQueryData(['audit', id], (old: AuditDetail | undefined) =>
        old ? { ...old, audit: data.audit } : old,
      )
      qc.invalidateQueries({ queryKey: ['audits'] })
    },
  })
}

export function useDeleteAudit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiJson<{ id: string; deleted: true }>(`/api/audits/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['audits'] })
      qc.removeQueries({ queryKey: ['audit', id] })
    },
  })
}

export interface UploadResponse {
  uploadPath: string
  fileCount: number
  skippedCount: number
  totalBytes: number
}

export function useUploadCode() {
  return useMutation({
    mutationFn: async (file: File): Promise<UploadResponse> => {
      const form = new FormData()
      form.append('file', file)
      const res = await authFetch('/api/uploads/code', {
        method: 'POST',
        body: form,
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(
          `Upload échoué (${res.status}) : ${body.slice(0, 300)}`,
        )
      }
      return (await res.json()) as UploadResponse
    },
  })
}

export interface ReportRow {
  id: string
  auditId: string
  format: string
  language: string
  templateVersion: string
  shareSlug: string | null
  shareExpiresAt: string | null
  generatedAt: string
}

export function useAuditReports(auditId: string | undefined) {
  return useQuery({
    queryKey: ['audit', auditId, 'reports'],
    enabled: !!auditId,
    queryFn: () =>
      apiJson<{ reports: ReportRow[] }>(`/api/audits/${auditId}/report`),
  })
}

export function useGenerateReport(auditId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiJson<{ id: string; shareSlug: string; shareUrl: string }>(
        `/api/audits/${auditId}/report`,
        { method: 'POST', body: '{}' },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['audit', auditId, 'reports'] })
    },
  })
}
