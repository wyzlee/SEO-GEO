'use client'

import { useQuery } from '@tanstack/react-query'
import { apiJson } from '@/lib/api/fetch'

export interface PhaseDeltaRow {
  phaseKey: string
  previousScore: number
  currentScore: number
  scoreMax: number
  delta: number
}

export interface FindingLite {
  phaseKey: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  title: string
  description: string
  recommendation: string
  pointsLost: number
  locationUrl: string | null
}

export interface CompareResponse {
  current: { id: string; finishedAt: string | null }
  previous: { id: string; finishedAt: string | null }
  result: {
    scoreDelta: number
    currentScore: number
    previousScore: number
    daysBetween: number | null
    phases: PhaseDeltaRow[]
    findings: {
      resolved: FindingLite[]
      introduced: FindingLite[]
      persistent: FindingLite[]
    }
  }
}

export function useAuditCompare(auditId: string | undefined) {
  return useQuery({
    queryKey: ['audit', auditId, 'compare'],
    enabled: !!auditId,
    queryFn: () => apiJson<CompareResponse>(`/api/audits/${auditId}/compare`),
    retry: (count, err) => {
      // 409 (pas de prédécesseur) et 404 ne sont pas retryables
      const status = (err as { status?: number } | null)?.status
      if (status === 409 || status === 404) return false
      return count < 2
    },
  })
}
