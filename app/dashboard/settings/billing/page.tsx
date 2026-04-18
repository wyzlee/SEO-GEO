'use client'

import { Suspense } from 'react'
import { useOrganization } from '@/lib/hooks/use-organization'
import { BillingClient } from '@/components/billing/billing-client'

function BillingPageInner() {
  const { data: org, isLoading } = useOrganization()

  if (isLoading) {
    return (
      <div className="p-6">
        <div
          className="card-premium text-sm py-10 text-center"
          role="status"
          aria-label="Chargement de la facturation"
          style={{ color: 'var(--color-muted)' }}
        >
          Chargement…
        </div>
      </div>
    )
  }

  if (!org) {
    return (
      <div className="p-6">
        <div
          className="card-premium text-sm py-10 text-center"
          style={{ color: 'var(--color-muted)' }}
        >
          Impossible de charger les données de facturation.
        </div>
      </div>
    )
  }

  return <BillingClient org={org} />
}

export default function BillingPage() {
  return (
    <Suspense>
      <BillingPageInner />
    </Suspense>
  )
}
