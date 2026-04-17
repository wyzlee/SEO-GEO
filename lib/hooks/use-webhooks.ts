'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiJson } from '@/lib/api/fetch'

export interface WebhookRow {
  id: string
  url: string
  events: string
  active: number
  lastSuccessAt: string | null
  lastErrorAt: string | null
  lastErrorMessage: string | null
  createdAt: string
}

export function useWebhooks() {
  return useQuery({
    queryKey: ['webhooks', 'me'],
    queryFn: () =>
      apiJson<{ webhooks: WebhookRow[] }>('/api/organizations/me/webhooks'),
    staleTime: 30_000,
  })
}

export interface CreateWebhookInput {
  url: string
  events?: Array<'audit.completed'>
}

export interface CreateWebhookResponse {
  id: string
  url: string
  events: string
  secret: string
}

export function useCreateWebhook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateWebhookInput) =>
      apiJson<CreateWebhookResponse>('/api/organizations/me/webhooks', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['webhooks', 'me'] })
    },
  })
}

export function useDeleteWebhook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiJson<{ id: string; deleted: true }>(
        `/api/organizations/me/webhooks?id=${encodeURIComponent(id)}`,
        { method: 'DELETE' },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['webhooks', 'me'] })
    },
  })
}
