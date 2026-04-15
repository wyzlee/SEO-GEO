'use client'

import { use } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/header'
import { ScoreBadge } from '@/components/audit/score-badge'
import { PhaseCard } from '@/components/audit/phase-card'
import { useAudit } from '@/lib/hooks/use-audits'

const STATUS_LABEL: Record<string, string> = {
  queued: 'En file d\'attente',
  running: 'Analyse en cours',
  completed: 'Terminé',
  failed: 'En échec',
}

export default function AuditDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { data, isLoading, error } = useAudit(id)

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Chargement de l'audit" />
        <section className="p-6">
          <div
            className="h-10 w-10 rounded-full border-[3px] animate-spin"
            style={{
              borderColor: 'var(--color-border)',
              borderTopColor: 'var(--color-accent)',
            }}
          />
        </section>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div>
        <PageHeader title="Audit introuvable" />
        <section className="p-6">
          <div className="card-premium">
            <p
              className="text-sm font-[family-name:var(--font-sans)]"
              style={{ color: 'var(--color-muted)' }}
            >
              Cet audit n&apos;existe pas ou n&apos;est pas accessible depuis votre
              organisation.
            </p>
            <Link href="/dashboard/audits" className="btn-secondary mt-4 inline-flex">
              Retour à la liste
            </Link>
          </div>
        </section>
      </div>
    )
  }

  const { audit, phases } = data
  const isRunning = audit.status === 'queued' || audit.status === 'running'
  const score = audit.scoreTotal ?? 0

  return (
    <div>
      <PageHeader
        title={audit.targetUrl ?? audit.id}
        description={`Audit ${audit.id} · ${STATUS_LABEL[audit.status] ?? audit.status}`}
        actions={
          <Link href="/dashboard/audits" className="btn-secondary">
            Liste
          </Link>
        }
      />

      <section className="p-6 space-y-6">
        <div className="card-premium flex items-center gap-6">
          <ScoreBadge score={score} size="lg" />
          <div className="min-w-0 flex-1">
            <div
              className="text-xs uppercase tracking-wider font-[family-name:var(--font-display)]"
              style={{ color: 'var(--color-muted)' }}
            >
              {STATUS_LABEL[audit.status] ?? audit.status}
            </div>
            <div className="font-[family-name:var(--font-display)] text-xl font-semibold">
              Score global
            </div>
            <p
              className="mt-1 text-sm font-[family-name:var(--font-sans)]"
              style={{ color: 'var(--color-muted)' }}
            >
              {isRunning
                ? 'Analyse en cours — les phases s\'affichent au fil de l\'eau.'
                : audit.status === 'failed'
                  ? audit.errorMessage || 'L\'audit a échoué. Contactez le support.'
                  : `Lancé le ${new Date(audit.createdAt).toLocaleString('fr-FR')}`}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {phases.map((phase) => (
            <PhaseCard key={phase.id} phase={phase} />
          ))}
          {phases.length === 0 && (
            <div className="card-premium text-sm" style={{ color: 'var(--color-muted)' }}>
              Aucune phase créée pour l&apos;instant — l&apos;audit démarre.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
