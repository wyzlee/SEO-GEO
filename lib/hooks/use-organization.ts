'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiJson } from '@/lib/api/fetch'

export interface OrgBranding {
  companyName: string | null
  logoUrl: string | null
  primaryColor: string | null
  accentColor: string | null
}

export interface OrgResponse {
  id: string
  name: string
  slug: string
  plan: string
  role: string
  branding: OrgBranding | null
  stripeCustomerId: string | null
  subscriptionStatus: string | null
  auditUsage: number
}

export function useOrganization() {
  return useQuery({
    queryKey: ['organization', 'me'],
    queryFn: () => apiJson<OrgResponse>('/api/organizations/me'),
    staleTime: 30_000,
  })
}

export interface UpdateBrandingInput {
  companyName?: string | null
  logoUrl?: string | null
  primaryColor?: string | null
  accentColor?: string | null
}

export function useUpdateBranding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateBrandingInput) =>
      apiJson<{ branding: OrgBranding | null }>('/api/organizations/me', {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organization', 'me'] })
    },
  })
}
