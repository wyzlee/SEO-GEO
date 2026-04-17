'use client'

import Link from 'next/link'
import { PageHeader } from '@/components/layout/header'
import { useAudits } from '@/lib/hooks/use-audits'
import { useMe } from '@/lib/hooks/use-me'

export default function DashboardPage() {
  const { data, isLoading } = useAudits()
  const { data: me } = useMe()
  const audits = (data?.audits ?? []).slice(0, 5)
  const orgName = me?.memberships[0]?.organizationName
  const description = orgName
    ? `Bienvenue, ${orgName}. Suivez vos audits SEO & GEO en cours et récemment terminés.`
    : 'Suivez vos audits SEO & GEO en cours et récemment terminés.'

  return (
    <div>
      <PageHeader
        title="Vue d'ensemble"
        description={description}
        actions={
          <Link href="/dashboard/audits/new" className="btn-primary">
            Nouvel audit
          </Link>
        }
      />

      <section className="p-6">
        {isLoading ? (
          <div className="card-premium text-sm py-6 text-center" style={{ color: 'var(--color-muted)' }}>
            Chargement…
          </div>
        ) : audits.length === 0 ? (
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
        ) : (
          <div className="space-y-3">
            <h2 className="text-sm font-[family-name:var(--font-display)] uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>
              Derniers audits
            </h2>
            {audits.map((audit) => (
              <Link
                key={audit.id}
                href={`/dashboard/audits/${audit.id}`}
                className="card-premium flex items-center gap-4 hover:border-[var(--color-accent)] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-[family-name:var(--font-display)] font-semibold truncate">
                    {audit.targetUrl ?? audit.id}
                  </div>
                  <div className="text-xs font-[family-name:var(--font-sans)]" style={{ color: 'var(--color-muted)' }}>
                    {audit.clientName ? `${audit.clientName} · ` : ''}
                    {audit.status} · {new Date(audit.createdAt).toLocaleString('fr-FR')}
                  </div>
                </div>
                <div
                  className="text-lg font-[family-name:var(--font-display)] font-bold"
                  style={{ color: 'var(--color-accent)' }}
                >
                  {audit.scoreTotal !== null ? `${audit.scoreTotal}/100` : '—'}
                </div>
              </Link>
            ))}
            <Link href="/dashboard/audits" className="btn-secondary inline-flex mt-2">
              Voir tous les audits
            </Link>
          </div>
        )}
      </section>
    </div>
  )
}
