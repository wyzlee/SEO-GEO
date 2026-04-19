'use client'

import { useAdminStats } from '@/lib/hooks/use-admin'
import { Building2, Users, FileSearch } from 'lucide-react'

export default function AdminPage() {
  const { data, isLoading } = useAdminStats()

  const stats = [
    { label: 'Organisations', value: data?.organizations, icon: Building2 },
    { label: 'Utilisateurs', value: data?.users, icon: Users },
    { label: 'Audits', value: data?.audits, icon: FileSearch },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1
          className="text-2xl font-[family-name:var(--font-display)] font-bold"
          style={{ color: 'var(--color-text)' }}
        >
          Tableau de bord admin
        </h1>
        <p className="text-sm mt-1 font-[family-name:var(--font-sans)]" style={{ color: 'var(--color-muted)' }}>
          Vue globale de la plateforme
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="card-premium flex items-center gap-4">
            <div
              className="flex items-center justify-center rounded-lg shrink-0"
              style={{
                width: 44,
                height: 44,
                background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
              }}
            >
              <Icon size={20} style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
            </div>
            <div>
              <div
                className="text-2xl font-[family-name:var(--font-display)] font-bold"
                style={{ color: 'var(--color-text)' }}
              >
                {isLoading ? '—' : (value ?? 0)}
              </div>
              <div
                className="text-xs font-[family-name:var(--font-sans)] uppercase tracking-wider"
                style={{ color: 'var(--color-muted)' }}
              >
                {label}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card-premium">
        <h2
          className="text-xs uppercase tracking-wider font-[family-name:var(--font-display)] mb-3"
          style={{ color: 'var(--color-muted)' }}
        >
          Actions rapides
        </h2>
        <div className="flex flex-wrap gap-3">
          <a href="/admin/organizations" className="btn-secondary">
            Gérer les organisations
          </a>
          <a href="/admin/users" className="btn-secondary">
            Voir les utilisateurs
          </a>
        </div>
      </div>
    </div>
  )
}
