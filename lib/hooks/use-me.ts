'use client'

import { useQuery } from '@tanstack/react-query'
import { apiJson } from '@/lib/api/fetch'

export interface MeMembership {
  organizationId: string
  organizationName: string
  organizationSlug: string
  role: string
}

export interface MeResponse {
  user: { id: string; email: string }
  memberships: MeMembership[]
}

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => apiJson<MeResponse>('/api/me'),
    staleTime: 60_000,
  })
}
