'use client'

import { use } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Globe, Github, FileArchive } from 'lucide-react'
import { PageHeader } from '@/components/layout/header'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { ScoreBadge } from '@/components/audit/score-badge'
import { ScoreBreakdownChart } from '@/components/audit/score-breakdown-chart'
import { CriticalFindings } from '@/components/audit/critical-findings'
import { PhaseCard } from '@/components/audit/phase-card'
import {
  useAudit,
  useAuditReports,
  useGenerateReport,
} from '@/lib/hooks/use-audits'

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
  const reportsQuery = useAuditReports(id)
  const generateReport = useGenerateReport(id)
  const lastReport = reportsQuery.data?.reports?.[0]

  const onGenerate = async () => {
    try {
      const report = await generateReport.mutateAsync()
      toast.success('Rapport généré')
      if (typeof window !== 'undefined') {
        window.open(report.shareUrl, '_blank', 'noopener,noreferrer')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Génération impossible')
    }
  }

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
  const isCompleted = audit.status === 'completed'
  const isFailed = audit.status === 'failed'
  const score = audit.scoreTotal ?? 0

  const target =
    audit.targetUrl ?? audit.githubRepo ?? 'Upload code'
  const InputIcon =
    audit.inputType === 'github'
      ? Github
      : audit.inputType === 'zip'
        ? FileArchive
        : Globe

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Audits', href: '/dashboard/audits' },
          { label: audit.id.slice(0, 8) },
        ]}
      />
      <PageHeader
        title={target}
        description={`${audit.inputType.toUpperCase()} · ${STATUS_LABEL[audit.status] ?? audit.status}`}
        actions={
          <div className="flex items-center gap-2">
            {isCompleted &&
              (lastReport?.shareSlug ? (
                <>
                  <a
                    href={`/r/${lastReport.shareSlug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary"
                  >
                    Voir le rapport
                  </a>
                  <a
                    href={`/api/audits/${id}/report/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary"
                  >
                    Télécharger PDF
                  </a>
                </>
              ) : (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={onGenerate}
                  disabled={generateReport.isPending}
                >
                  {generateReport.isPending
                    ? 'Génération…'
                    : 'Générer le rapport'}
                </button>
              ))}
            <Link href="/dashboard/audits" className="btn-secondary">
              Liste
            </Link>
          </div>
        }
      />

      <section className="p-6 space-y-6">
        <div className="card-premium flex flex-col md:flex-row items-start md:items-center gap-6">
          <ScoreBadge score={score} size="lg" />
          <div className="min-w-0 flex-1">
            <div
              className="flex items-center gap-2 text-xs uppercase tracking-wider font-[family-name:var(--font-display)]"
              style={{ color: 'var(--color-muted)' }}
            >
              <InputIcon size={12} />
              {STATUS_LABEL[audit.status] ?? audit.status}
            </div>
            <div className="font-[family-name:var(--font-display)] text-xl font-semibold mt-1">
              Score global
            </div>
            <p
              className="mt-1 text-sm font-[family-name:var(--font-sans)]"
              style={{ color: 'var(--color-muted)' }}
            >
              {isRunning
                ? 'Analyse en cours — les phases s\'affichent au fil de l\'eau.'
                : isFailed
                  ? audit.errorMessage || 'L\'audit a échoué.'
                  : `Lancé le ${new Date(audit.createdAt).toLocaleString('fr-FR')}`}
            </p>
          </div>
        </div>

        {isFailed && (
          <div
            className="rounded-lg p-5"
            style={{
              background: 'var(--color-card)',
              border: '1px solid var(--color-red)',
            }}
          >
            <h2
              className="font-[family-name:var(--font-display)] font-semibold"
              style={{ color: 'var(--color-red)' }}
            >
              Audit en échec
            </h2>
            <p
              className="mt-2 text-sm font-[family-name:var(--font-sans)]"
              style={{ color: 'var(--color-muted)' }}
            >
              {audit.errorMessage ||
                'Le pipeline a rencontré une erreur avant la fin. Vérifier que l\'URL est accessible ou que l\'archive est valide, puis relancer un nouvel audit.'}
            </p>
            <Link
              href="/dashboard/audits/new"
              className="btn-secondary mt-4 inline-flex"
            >
              Relancer un audit
            </Link>
          </div>
        )}

        {isCompleted && (
          <div className="card-premium">
            <h2 className="text-sm uppercase tracking-wider font-[family-name:var(--font-display)] mb-4"
              style={{ color: 'var(--color-muted)' }}>
              Répartition du score
            </h2>
            <ScoreBreakdownChart phases={phases} />
          </div>
        )}

        {isCompleted && <CriticalFindings phases={phases} />}

        <div className="space-y-3">
          <h2 className="text-sm uppercase tracking-wider font-[family-name:var(--font-display)] mt-2"
            style={{ color: 'var(--color-muted)' }}>
            Détail par phase
          </h2>
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
