import Link from 'next/link'
import { PageHeader } from '@/components/layout/header'

export default function DashboardPage() {
  return (
    <div>
      <PageHeader
        title="Vue d'ensemble"
        description="Suivez vos audits SEO & GEO en cours et récemment terminés."
        actions={
          <Link href="/dashboard/audits/new" className="btn-primary">
            Nouvel audit
          </Link>
        }
      />

      <section className="p-6">
        <div className="card-premium text-center py-16">
          <h2 className="text-xl font-semibold font-[family-name:var(--font-display)]">
            Aucun audit pour l&apos;instant
          </h2>
          <p
            className="mt-2 text-sm"
            style={{ color: 'var(--color-muted)' }}
          >
            Lancez votre premier audit pour voir les constats et le scoring
            apparaître ici.
          </p>
          <Link
            href="/dashboard/audits/new"
            className="btn-primary mt-6 inline-flex"
          >
            Lancer un audit
          </Link>
        </div>
      </section>
    </div>
  )
}
