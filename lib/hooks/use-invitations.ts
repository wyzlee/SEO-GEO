'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiJson } from '@/lib/api/fetch'

export interface PendingInvitation {
  id: string
  email: string
  role: string
  expiresAt: string
}

export function useInvitations() {
  return useQuery({
    queryKey: ['invitations'],
    queryFn: () => apiJson<{ invitations: PendingInvitation[] }>('/api/organizations/me/invitations'),
    staleTime: 30_000,
  })
}

export function useInviteMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { email: string; role: string }) =>
      apiJson('/api/organizations/me/invitations', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invitations'] }),
  })
}
