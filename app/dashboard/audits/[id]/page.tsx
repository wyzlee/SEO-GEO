import { PageHeader } from '@/components/layout/header'

export default async function AuditDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div>
      <PageHeader
        title="Détail de l'audit"
        description={`Audit ${id}`}
      />

      <section className="p-6 space-y-4">
        <div className="card-premium">
          <p
            className="text-sm font-[family-name:var(--font-sans)]"
            style={{ color: 'var(--color-muted)' }}
          >
            Détail de l&apos;audit à brancher (phases, findings, score
            breakdown) en Sprint 03/04.
          </p>
        </div>
      </section>
    </div>
  )
}
