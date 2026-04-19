'use client'

import Link from 'next/link'
import { useAdminPlans, type AdminPlanConfig } from '@/lib/hooks/use-admin'
import { Building2, ExternalLink } from 'lucide-react'

// ─── Plan card ────────────────────────────────────────────────────────────────

function formatPrice(priceMonthly: number): string {
  if (priceMonthly === 0) return 'Gratuit'
  return `${priceMonthly.toLocaleString('fr-FR')} €/mois`
}

function formatAuditLimit(limit: number): string {
  if (limit === -1) return 'Illimité'
  return `${limit} audit${limit > 1 ? 's' : ''}/mois`
}

function planCardStyle(planId: string): React.CSSProperties {
  switch (planId) {
    case 'studio':
      return {
        border: '2px solid color-mix(in srgb, var(--color-accent) 50%, transparent)',
        background: 'var(--color-surface)',
      }
    case 'agency':
      return {
        border: '2px solid color-mix(in srgb, var(--color-green) 50%, transparent)',
        background: 'var(--color-surface)',
      }
    default:
      return {
        border: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
      }
  }
}

function planAccentColor(planId: string): string {
  switch (planId) {
    case 'studio':
      return 'var(--color-accent)'
    case 'agency':
      return 'var(--color-green)'
    default:
      return 'var(--color-muted)'
  }
}

function PlanCard({ plan }: { plan: AdminPlanConfig }) {
  const accent = planAccentColor(plan.id)
  const isAgency = plan.id === 'agency'

  return (
    <div
      className="rounded-xl p-6 flex flex-col gap-4 relative"
      style={planCardStyle(plan.id)}
    >
      {/* "Populaire" badge sur agency */}
      {isAgency && (
        <span
          className="absolute top-4 right-4 text-[10px] px-2 py-0.5 rounded font-[family-name:var(--font-display)] tracking-wider uppercase"
          style={{
            background: 'color-mix(in srgb, var(--color-green) 15%, transparent)',
            color: 'var(--color-green)',
            border: '1px solid color-mix(in srgb, var(--color-green) 30%, transparent)',
          }}
        >
          Populaire
        </span>
      )}

      {/* Plan name */}
      <div>
        <h2
          className="text-lg font-[family-name:var(--font-display)] font-bold"
          style={{ color: accent }}
        >
          {plan.name}
        </h2>

        <p
          className="text-2xl font-[family-name:var(--font-display)] font-black mt-1"
          style={{ color: 'var(--color-text)' }}
        >
          {formatPrice(plan.priceMonthly)}
        </p>
      </div>

      {/* Limit */}
      <div>
        <span
          className="text-[11px] font-[family-name:var(--font-display)] uppercase tracking-wider"
          style={{ color: 'var(--color-muted)' }}
        >
          Limite audits
        </span>
        <p
          className="text-sm font-[family-name:var(--font-sans)] mt-0.5"
          style={{ color: 'var(--color-text)' }}
        >
          {formatAuditLimit(plan.auditLimit)}
        </p>
      </div>

      {/* Stripe Price ID */}
      <div>
        <span
          className="text-[11px] font-[family-name:var(--font-display)] uppercase tracking-wider"
          style={{ color: 'var(--color-muted)' }}
        >
          Stripe Price ID
        </span>
        <p
          className="text-[12px] font-[family-name:var(--font-sans)] mt-0.5"
          style={{ color: 'var(--color-text)', fontFamily: 'monospace' }}
        >
          {plan.priceId || '—'}
        </p>
      </div>

      {/* Org count */}
      <div>
        <span
          className="text-[11px] font-[family-name:var(--font-display)] uppercase tracking-wider"
          style={{ color: 'var(--color-muted)' }}
        >
          Organisations
        </span>
        <p
          className="text-3xl font-[family-name:var(--font-display)] font-black mt-0.5"
          style={{ color: accent }}
        >
          {plan.orgCount}
        </p>
      </div>

      {/* Link to orgs filtered by plan */}
      <Link
        href={`/admin/organizations?plan=${plan.id}`}
        className="inline-flex items-center gap-1.5 text-sm font-[family-name:var(--font-display)] transition-colors mt-auto"
        style={{ color: accent }}
      >
        <Building2 size={14} aria-hidden="true" />
        Voir les orgs
        <ExternalLink size={12} aria-hidden="true" />
      </Link>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPlansPage() {
  const { data, isLoading, isError, error } = useAdminPlans()

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-[family-name:var(--font-display)] font-bold"
          style={{ color: 'var(--color-text)' }}
        >
          Plans tarifaires
        </h1>
        <p
          className="text-sm mt-1 font-[family-name:var(--font-sans)]"
          style={{ color: 'var(--color-muted)' }}
        >
          Configuration des plans — éditable dans{' '}
          <code
            className="text-[11px] px-1 py-0.5 rounded font-[family-name:var(--font-sans)]"
            style={{
              background: 'color-mix(in srgb, var(--color-muted) 10%, transparent)',
              color: 'var(--color-muted)',
            }}
          >
            lib/billing/stripe.ts
          </code>
        </p>
      </div>

      {/* Content */}
      {isLoading ? (
        <p
          className="text-sm font-[family-name:var(--font-sans)]"
          role="status"
          style={{ color: 'var(--color-muted)' }}
        >
          Chargement…
        </p>
      ) : isError ? (
        <p
          className="text-sm font-[family-name:var(--font-sans)]"
          role="alert"
          style={{ color: 'var(--color-red)' }}
        >
          {error instanceof Error ? error.message : 'Erreur lors du chargement des plans.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {(data?.plans ?? []).map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      )}
    </div>
  )
}
