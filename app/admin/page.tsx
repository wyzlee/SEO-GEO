'use client'

import { useAdminStats, useOrgMembers } from '@/lib/hooks/use-admin'
import { useAdminContext } from '@/app/admin/layout'
import { Building2, Users, FileSearch } from 'lucide-react'

// ─── Super-admin global stats ─────────────────────────────────────────────────

function SuperAdminDashboard() {
  const { data, isLoading } = useAdminStats()

  const stats = [
    { label: 'Organisations', value: data?.organizations, icon: Building2 },
    { label: 'Utilisateurs', value: data?.users, icon: Users },
    { label: 'Audits', value: data?.audits, icon: FileSearch },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl font-[family-name:var(--font-display)] font-bold"
          style={{ color: 'var(--color-text)' }}
        >
          Tableau de bord
        </h1>
        <p
          className="text-sm mt-1 font-[family-name:var(--font-sans)]"
          style={{ color: 'var(--color-muted)' }}
        >
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

// ─── Org-admin scoped dashboard ───────────────────────────────────────────────

function OrgAdminDashboard({ orgId, orgName }: { orgId: string; orgName: string | null }) {
  // Uses /api/admin/org/members which is accessible to org-admins
  const { data: members, isLoading } = useOrgMembers(orgId)

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl font-[family-name:var(--font-display)] font-bold"
          style={{ color: 'var(--color-text)' }}
        >
          Tableau de bord
        </h1>
        <p
          className="text-sm mt-1 font-[family-name:var(--font-sans)]"
          style={{ color: 'var(--color-muted)' }}
        >
          {orgName ?? 'Mon organisation'}
        </p>
      </div>

      {/* Org stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          {
            label: 'Membres',
            value: isLoading ? null : (members?.length ?? 0),
            icon: Users,
          },
        ].map(({ label, value, icon: Icon }) => (
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
                {value === null ? '—' : value}
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

      {/* Quick actions */}
      <div className="card-premium">
        <h2
          className="text-xs uppercase tracking-wider font-[family-name:var(--font-display)] mb-3"
          style={{ color: 'var(--color-muted)' }}
        >
          Actions rapides
        </h2>
        <div className="flex flex-wrap gap-3">
          <a href="/admin/members" className="btn-secondary">
            Gérer les membres
          </a>
          <a href="/admin/org-audits" className="btn-secondary">
            Voir les audits
          </a>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { isSuperAdmin, orgId, orgName } = useAdminContext()

  if (isSuperAdmin) {
    return <SuperAdminDashboard />
  }

  if (orgId) {
    return <OrgAdminDashboard orgId={orgId} orgName={orgName} />
  }

  // Should not happen — layout redirects if no orgId and not super-admin
  return (
    <div
      className="text-sm font-[family-name:var(--font-sans)]"
      style={{ color: 'var(--color-muted)' }}
    >
      Accès non autorisé.
    </div>
  )
}
