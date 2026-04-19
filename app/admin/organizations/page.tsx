'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useAdminOrganizations, useAdminChangePlan, type AdminOrgRow } from '@/lib/hooks/use-admin'
import { Building2 } from 'lucide-react'

const PLAN_LABELS: Record<string, string> = {
  discovery: 'Discovery',
  studio: 'Studio',
  agency: 'Agency',
}

const PLAN_COLORS: Record<string, string> = {
  discovery: 'var(--color-muted)',
  studio: 'var(--color-accent)',
  agency: 'var(--color-green)',
}

function PlanSelector({ org }: { org: AdminOrgRow }) {
  const changePlan = useAdminChangePlan(org.id)
  const [open, setOpen] = useState(false)

  if (org.stripeSubscriptionId) {
    return (
      <span
        className="text-xs font-[family-name:var(--font-sans)] px-2 py-0.5 rounded"
        style={{
          background: 'color-mix(in srgb, var(--color-muted) 12%, transparent)',
          color: 'var(--color-muted)',
        }}
        title="Gérer via Stripe"
      >
        {PLAN_LABELS[org.plan] ?? org.plan} (Stripe)
      </span>
    )
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-[family-name:var(--font-sans)] px-2 py-0.5 rounded transition-colors"
        style={{
          background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
          color: PLAN_COLORS[org.plan] ?? 'var(--color-text)',
          border: '1px solid color-mix(in srgb, var(--color-accent) 20%, transparent)',
        }}
        disabled={changePlan.isPending}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Plan : ${PLAN_LABELS[org.plan] ?? org.plan}`}
      >
        {changePlan.isPending ? '…' : (PLAN_LABELS[org.plan] ?? org.plan)} ▾
      </button>
      {open && (
        <div
          role="listbox"
          aria-label="Choisir un plan"
          className="absolute top-full left-0 mt-1 z-50 rounded py-1 min-w-[130px]"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          }}
        >
          {(['discovery', 'studio', 'agency'] as const).map((plan) => (
            <button
              key={plan}
              type="button"
              role="option"
              aria-selected={org.plan === plan}
              onClick={async () => {
                setOpen(false)
                try {
                  await changePlan.mutateAsync(plan)
                  toast.success(`Plan changé → ${PLAN_LABELS[plan]}`)
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Erreur')
                }
              }}
              className="flex w-full items-center px-3 py-1.5 text-[12px] font-[family-name:var(--font-display)] transition-colors"
              style={{
                background: org.plan === plan ? 'color-mix(in srgb, var(--color-accent) 8%, transparent)' : 'transparent',
                color: org.plan === plan ? 'var(--color-accent)' : 'var(--color-text)',
              }}
            >
              {PLAN_LABELS[plan]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AdminOrganizationsPage() {
  const { data, isLoading } = useAdminOrganizations()

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1
          className="text-2xl font-[family-name:var(--font-display)] font-bold"
          style={{ color: 'var(--color-text)' }}
        >
          Organisations
        </h1>
        <p className="text-sm mt-1 font-[family-name:var(--font-sans)]" style={{ color: 'var(--color-muted)' }}>
          {data?.organizations.length ?? '—'} organisation{(data?.organizations.length ?? 0) !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="card-premium overflow-hidden p-0">
        {isLoading ? (
          <div className="p-6 text-sm" role="status" style={{ color: 'var(--color-muted)' }}>Chargement…</div>
        ) : !data?.organizations.length ? (
          <div className="p-6 text-sm" style={{ color: 'var(--color-muted)' }}>Aucune organisation.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                {['Organisation', 'Plan', 'Audits', 'Membres', 'Créée le'].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="text-left px-4 py-3 text-[11px] font-[family-name:var(--font-display)] uppercase tracking-wider"
                    style={{ color: 'var(--color-muted)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.organizations.map((org) => (
                <tr
                  key={org.id}
                  style={{ borderBottom: '1px solid var(--color-border)' }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Building2 size={14} style={{ color: 'var(--color-muted)' }} aria-hidden="true" />
                      <div>
                        <div className="text-sm font-[family-name:var(--font-display)] font-semibold" style={{ color: 'var(--color-text)' }}>
                          {org.name}
                        </div>
                        <div className="text-[11px] font-[family-name:var(--font-sans)]" style={{ color: 'var(--color-muted)' }}>
                          {org.slug}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <PlanSelector org={org} />
                  </td>
                  <td className="px-4 py-3 text-sm font-[family-name:var(--font-sans)]" style={{ color: 'var(--color-text)' }}>
                    {org.auditUsage}
                  </td>
                  <td className="px-4 py-3 text-sm font-[family-name:var(--font-sans)]" style={{ color: 'var(--color-text)' }}>
                    {org.memberCount}
                  </td>
                  <td className="px-4 py-3 text-xs font-[family-name:var(--font-sans)]" style={{ color: 'var(--color-muted)' }}>
                    {new Date(org.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
