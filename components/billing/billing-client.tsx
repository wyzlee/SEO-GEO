'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle2, AlertTriangle, Sparkles, CreditCard } from 'lucide-react'
import { PageHeader } from '@/components/layout/header'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import type { OrgResponse } from '@/lib/hooks/use-organization'

type PlanKey = 'discovery' | 'studio' | 'agency'

interface PlanConfig {
  key: PlanKey
  label: string
  price: string
  auditLimit: number | null
  features: string[]
}

const PLANS: PlanConfig[] = [
  {
    key: 'discovery',
    label: 'Découverte',
    price: 'Gratuit',
    auditLimit: 1,
    features: [
      '1 audit/mois',
      'Rapport HTML',
      'Watermark SEO-GEO',
    ],
  },
  {
    key: 'studio',
    label: 'Studio',
    price: '490 €/mois',
    auditLimit: 20,
    features: [
      '20 audits/mois',
      'Export PDF',
      'Rapport partageable 60j',
      'Synthèse IA',
    ],
  },
  {
    key: 'agency',
    label: 'Agency',
    price: '990 €/mois',
    auditLimit: null,
    features: [
      'Audits illimités',
      'White-label complet',
      'Accès API',
      'Support prioritaire',
    ],
  },
]

const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  active: 'Actif',
  trialing: 'Période d\'essai',
  past_due: 'Paiement en attente',
  canceled: 'Annulé',
  unpaid: 'Impayé',
}

function resolvePlan(raw: string): PlanKey {
  if (raw === 'studio' || raw === 'agency') return raw
  return 'discovery'
}

function auditLimitLabel(plan: PlanKey): string {
  const cfg = PLANS.find((p) => p.key === plan)
  if (!cfg) return '1'
  return cfg.auditLimit === null ? 'Illimité' : String(cfg.auditLimit)
}

interface BillingClientProps {
  org: OrgResponse
}

export function BillingClient({ org }: BillingClientProps) {
  const searchParams = useSearchParams()
  const successParam = searchParams.get('success')
  const canceledParam = searchParams.get('canceled')

  const currentPlan = resolvePlan(org.plan)
  const [checkoutLoading, setCheckoutLoading] = useState<PlanKey | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)

  const handleCheckout = async (targetPlan: PlanKey) => {
    setCheckoutLoading(targetPlan)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: targetPlan, organizationId: org.id }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? `Erreur ${res.status}`)
      }
      const data = (await res.json()) as { url?: string }
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('URL Stripe manquante dans la réponse')
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Erreur lors de la redirection vers le paiement',
      )
      setCheckoutLoading(null)
    }
  }

  const handlePortal = async () => {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: org.id }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? `Erreur ${res.status}`)
      }
      const data = (await res.json()) as { url?: string }
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('URL portail manquante dans la réponse')
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Erreur lors de l\'accès au portail de facturation',
      )
    } finally {
      setPortalLoading(false)
    }
  }

  const planLabel = PLANS.find((p) => p.key === currentPlan)?.label ?? currentPlan
  const auditLimit = auditLimitLabel(currentPlan)

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Paramètres', href: '/dashboard/settings' },
          { label: 'Facturation' },
        ]}
      />
      <PageHeader
        title="Facturation"
        description="Gérez votre plan et vos informations de paiement."
      />

      <section className="p-6 space-y-6 max-w-4xl">
        {/* Tabs settings */}
        <div
          className="flex flex-wrap gap-3 text-sm font-[family-name:var(--font-sans)]"
        >
          <Link
            href="/dashboard/settings"
            className="px-3 py-1.5 rounded"
            style={{ color: 'var(--color-muted)' }}
          >
            Branding
          </Link>
          <Link
            href="/dashboard/settings/webhooks"
            className="px-3 py-1.5 rounded"
            style={{ color: 'var(--color-muted)' }}
          >
            Webhooks
          </Link>
          <Link
            href="/dashboard/settings/billing"
            aria-current="page"
            className="px-3 py-1.5 rounded"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
            }}
          >
            Facturation
          </Link>
        </div>

        {/* Bannière succès/annulation */}
        {successParam === '1' && (
          <div
            className="flex items-start gap-3 p-4 rounded-lg"
            role="status"
            style={{
              background: 'color-mix(in srgb, var(--color-green) 10%, transparent)',
              border: '1px solid color-mix(in srgb, var(--color-green) 30%, transparent)',
            }}
          >
            <CheckCircle2
              className="h-5 w-5 shrink-0 mt-0.5"
              aria-hidden="true"
              style={{ color: 'var(--color-green)' }}
            />
            <p
              className="text-sm font-[family-name:var(--font-sans)]"
              style={{ color: 'var(--color-text)' }}
            >
              Votre abonnement est actif. Bienvenue sur le plan{' '}
              <strong className="font-[family-name:var(--font-display)]">
                {planLabel}
              </strong>{' '}
              !
            </p>
          </div>
        )}

        {canceledParam === '1' && (
          <div
            className="p-4 rounded-lg"
            role="status"
            style={{
              background: 'color-mix(in srgb, var(--color-muted) 8%, transparent)',
              border: '1px solid var(--color-border)',
            }}
          >
            <p
              className="text-sm font-[family-name:var(--font-sans)]"
              style={{ color: 'var(--color-muted)' }}
            >
              Paiement annulé. Votre plan actuel est conservé.
            </p>
          </div>
        )}

        {/* Bannière past_due */}
        {org.subscriptionStatus === 'past_due' && (
          <div
            className="flex items-start gap-3 p-4 rounded-lg"
            role="alert"
            style={{
              background: 'color-mix(in srgb, var(--color-red) 10%, transparent)',
              border: '1px solid color-mix(in srgb, var(--color-red) 30%, transparent)',
            }}
          >
            <AlertTriangle
              className="h-5 w-5 shrink-0 mt-0.5"
              aria-hidden="true"
              style={{ color: 'var(--color-red)' }}
            />
            <div>
              <p
                className="text-sm font-[family-name:var(--font-display)] font-semibold"
                style={{ color: 'var(--color-red)' }}
              >
                Problème de paiement
              </p>
              <p
                className="mt-0.5 text-sm font-[family-name:var(--font-sans)]"
                style={{ color: 'var(--color-text)' }}
              >
                Mettez à jour votre moyen de paiement pour maintenir votre accès.
              </p>
            </div>
          </div>
        )}

        {/* Section 1 — Plan actuel */}
        <div className="card-premium">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h2
                className="text-lg font-[family-name:var(--font-display)] font-semibold"
                style={{ color: 'var(--color-text)' }}
              >
                Plan actuel
              </h2>
              <div className="mt-3 flex items-center gap-3 flex-wrap">
                <PlanBadge plan={currentPlan} />
                {org.subscriptionStatus && (
                  <span
                    className="text-xs font-[family-name:var(--font-sans)] px-2 py-0.5 rounded-full"
                    style={{
                      background: 'color-mix(in srgb, var(--color-muted) 12%, transparent)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-muted)',
                    }}
                  >
                    {SUBSCRIPTION_STATUS_LABELS[org.subscriptionStatus] ?? org.subscriptionStatus}
                  </span>
                )}
              </div>
            </div>
            <div
              className="text-right"
              style={{ color: 'var(--color-muted)' }}
            >
              <p className="text-xs font-[family-name:var(--font-sans)] uppercase tracking-wider">
                Audits ce mois
              </p>
              <p
                className="mt-1 text-2xl font-[family-name:var(--font-display)] font-bold"
                style={{ color: 'var(--color-text)' }}
              >
                {org.auditUsage}
                <span
                  className="text-sm font-normal ml-1"
                  style={{ color: 'var(--color-muted)' }}
                >
                  / {auditLimit}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Section 2 — Grille des plans */}
        <div>
          <h2
            className="text-sm uppercase tracking-wider font-[family-name:var(--font-display)] mb-4"
            style={{ color: 'var(--color-muted)' }}
          >
            Comparer les plans
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {PLANS.map((plan) => (
              <PlanCard
                key={plan.key}
                plan={plan}
                isCurrent={plan.key === currentPlan}
                currentPlan={currentPlan}
                isLoading={checkoutLoading === plan.key}
                onCheckout={() => handleCheckout(plan.key)}
              />
            ))}
          </div>
        </div>

        {/* Section 3 — Portail Stripe */}
        {org.stripeCustomerId && (
          <div className="card-premium">
            <div className="flex items-start gap-4 flex-wrap">
              <CreditCard
                className="h-5 w-5 shrink-0 mt-0.5"
                aria-hidden="true"
                style={{ color: 'var(--color-accent)' }}
              />
              <div className="flex-1 min-w-0">
                <h2
                  className="font-[family-name:var(--font-display)] font-semibold"
                  style={{ color: 'var(--color-text)' }}
                >
                  Gérer mon abonnement
                </h2>
                <p
                  className="mt-1 text-sm font-[family-name:var(--font-sans)]"
                  style={{ color: 'var(--color-muted)' }}
                >
                  Factures, changement de carte, résiliation — géré par Stripe.
                </p>
              </div>
              <button
                type="button"
                onClick={handlePortal}
                disabled={portalLoading}
                className="btn-secondary shrink-0"
                style={{ opacity: portalLoading ? 0.6 : 1, minHeight: 44 }}
                aria-label="Accéder au portail de facturation Stripe"
              >
                {portalLoading ? 'Redirection…' : 'Accéder au portail'}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function PlanBadge({ plan }: { plan: PlanKey }) {
  const styles: Record<PlanKey, { background: string; color: string; border: string }> = {
    discovery: {
      background: 'color-mix(in srgb, var(--color-muted) 12%, transparent)',
      color: 'var(--color-muted)',
      border: '1px solid var(--color-border)',
    },
    studio: {
      background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
      color: 'var(--color-accent)',
      border: '1px solid color-mix(in srgb, var(--color-accent) 30%, transparent)',
    },
    agency: {
      background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
      color: 'var(--color-accent)',
      border: '1px solid color-mix(in srgb, var(--color-accent) 30%, transparent)',
    },
  }

  const label: Record<PlanKey, string> = {
    discovery: 'Découverte',
    studio: 'Studio',
    agency: 'Agency',
  }

  return (
    <span
      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-[family-name:var(--font-display)] font-semibold"
      style={styles[plan]}
    >
      {label[plan]}
    </span>
  )
}

function PlanCard({
  plan,
  isCurrent,
  currentPlan,
  isLoading,
  onCheckout,
}: {
  plan: PlanConfig
  isCurrent: boolean
  currentPlan: PlanKey
  isLoading: boolean
  onCheckout: () => void
}) {
  const isAgency = plan.key === 'agency'
  const isUpgrade = planRank(plan.key) > planRank(currentPlan)
  const isDowngrade = planRank(plan.key) < planRank(currentPlan)

  return (
    <div
      className="flex flex-col rounded-xl p-5 transition-all duration-200"
      style={{
        background: isCurrent
          ? 'color-mix(in srgb, var(--color-accent) 6%, var(--color-surface))'
          : 'var(--color-surface)',
        border: isCurrent
          ? `2px solid ${isAgency ? 'var(--color-accent)' : 'var(--color-accent)'}`
          : '1px solid var(--color-border)',
      }}
    >
      {/* Header plan */}
      <div className="flex items-start justify-between gap-2">
        <h3
          className="font-[family-name:var(--font-display)] font-semibold text-base"
          style={{ color: 'var(--color-text)' }}
        >
          {plan.label}
        </h3>
        <div className="flex flex-col items-end gap-1">
          {isCurrent && (
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-[family-name:var(--font-display)] font-semibold uppercase tracking-wide"
              style={{
                background: isAgency
                  ? 'color-mix(in srgb, var(--color-accent) 15%, transparent)'
                  : 'color-mix(in srgb, var(--color-accent) 15%, transparent)',
                color: isAgency ? 'var(--color-accent)' : 'var(--color-accent)',
              }}
            >
              Plan actuel
            </span>
          )}
          {isAgency && (
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-[family-name:var(--font-display)] font-semibold uppercase tracking-wide"
              style={{
                background: 'color-mix(in srgb, var(--color-accent) 15%, transparent)',
                color: 'var(--color-accent)',
                border: '1px solid color-mix(in srgb, var(--color-accent) 30%, transparent)',
              }}
            >
              Ultra-Premium
            </span>
          )}
        </div>
      </div>

      {/* Prix */}
      <p
        className="mt-3 font-[family-name:var(--font-display)] font-bold text-xl"
        style={{ color: 'var(--color-text)' }}
      >
        {plan.price}
      </p>

      {/* Features */}
      <ul className="mt-4 flex-1 space-y-2">
        {plan.features.map((feature) => (
          <li
            key={feature}
            className="flex items-start gap-2 text-sm font-[family-name:var(--font-sans)]"
            style={{ color: 'var(--color-text)' }}
          >
            <CheckCircle2
              className="h-4 w-4 shrink-0 mt-0.5"
              aria-hidden="true"
              style={{ color: 'var(--color-green)' }}
            />
            {feature}
          </li>
        ))}
      </ul>

      {/* CTA */}
      <div className="mt-5">
        {isCurrent ? (
          <div
            className="text-center text-xs py-2 font-[family-name:var(--font-sans)]"
            style={{ color: 'var(--color-muted)' }}
          >
            Votre plan actuel
          </div>
        ) : isUpgrade ? (
          <button
            type="button"
            onClick={onCheckout}
            disabled={isLoading}
            className="btn-primary w-full"
            style={{
              minHeight: 44,
              opacity: isLoading ? 0.6 : 1,
              ...(isAgency ? { background: 'var(--color-accent)' } : {}),
            }}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Sparkles className="h-4 w-4 animate-pulse" aria-hidden="true" />
                Redirection…
              </span>
            ) : (
              `Passer au plan ${plan.label}`
            )}
          </button>
        ) : isDowngrade ? (
          <div
            className="text-center text-xs py-2 font-[family-name:var(--font-sans)]"
            style={{ color: 'var(--color-muted)' }}
          >
            Gérer via le portail
          </div>
        ) : null}
      </div>
    </div>
  )
}

function planRank(plan: PlanKey): number {
  const ranks: Record<PlanKey, number> = { discovery: 0, studio: 1, agency: 2 }
  return ranks[plan]
}
