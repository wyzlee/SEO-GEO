import Link from 'next/link'
import { PageHeader } from '@/components/layout/header'

export default function AuditsListPage() {
  return (
    <div>
      <PageHeader
        title="Audits"
        description="Historique complet des audits de votre organisation."
        actions={
          <Link href="/dashboard/audits/new" className="btn-primary">
            Nouvel audit
          </Link>
        }
      />

      <section className="p-6">
        <div className="card-premium">
          <table className="w-full text-sm font-[family-name:var(--font-sans)]">
            <thead>
              <tr
                className="text-left border-b"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <th className="pb-3 font-medium">Cible</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Score</th>
                <th className="pb-3 font-medium">Créé le</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td
                  colSpan={4}
                  className="py-10 text-center"
                  style={{ color: 'var(--color-muted)' }}
                >
                  Pas encore d&apos;audit. Lancez-en un pour remplir cette vue.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
