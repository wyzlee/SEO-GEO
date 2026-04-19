'use client'

import { useAdminUsers } from '@/lib/hooks/use-admin'
import { ShieldCheck, User } from 'lucide-react'

export default function AdminUsersPage() {
  const { data, isLoading } = useAdminUsers()

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1
          className="text-2xl font-[family-name:var(--font-display)] font-bold"
          style={{ color: 'var(--color-text)' }}
        >
          Utilisateurs
        </h1>
        <p className="text-sm mt-1 font-[family-name:var(--font-sans)]" style={{ color: 'var(--color-muted)' }}>
          {data?.users.length ?? '—'} utilisateur{(data?.users.length ?? 0) !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="card-premium overflow-hidden p-0">
        {isLoading ? (
          <div className="p-6 text-sm" role="status" style={{ color: 'var(--color-muted)' }}>Chargement…</div>
        ) : !data?.users.length ? (
          <div className="p-6 text-sm" style={{ color: 'var(--color-muted)' }}>Aucun utilisateur.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                {['Utilisateur', 'Organisations', 'Inscrit le'].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="text-left px-4 py-3 text-[11px] font-[family-name:var(--font-display)] uppercase tracking-wider"
                    style={{ color: 'var(--color-muted)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.users.map((user) => (
                <tr
                  key={user.id}
                  style={{ borderBottom: '1px solid var(--color-border)' }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="flex items-center justify-center rounded-full shrink-0"
                        style={{
                          width: 28,
                          height: 28,
                          background: user.isSuperAdmin
                            ? 'color-mix(in srgb, var(--color-red) 12%, transparent)'
                            : 'color-mix(in srgb, var(--color-muted) 12%, transparent)',
                        }}
                        aria-hidden="true"
                      >
                        {user.isSuperAdmin
                          ? <ShieldCheck size={14} style={{ color: 'var(--color-red)' }} />
                          : <User size={14} style={{ color: 'var(--color-muted)' }} />
                        }
                      </div>
                      <div>
                        <div className="text-sm font-[family-name:var(--font-display)] font-semibold" style={{ color: 'var(--color-text)' }}>
                          {user.displayName || user.email}
                        </div>
                        <div className="text-[11px] font-[family-name:var(--font-sans)]" style={{ color: 'var(--color-muted)' }}>
                          {user.displayName ? user.email : null}
                          {user.isSuperAdmin && (
                            <span className="ml-1" style={{ color: 'var(--color-red)' }}>super-admin</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {user.memberships.length === 0 ? (
                        <span className="text-xs" style={{ color: 'var(--color-muted)' }}>—</span>
                      ) : user.memberships.map((m) => (
                        <div key={m.organizationId} className="flex items-center gap-1.5">
                          <span className="text-xs font-[family-name:var(--font-sans)]" style={{ color: 'var(--color-text)' }}>
                            {m.organizationName}
                          </span>
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded font-[family-name:var(--font-sans)]"
                            style={{
                              background: 'color-mix(in srgb, var(--color-muted) 10%, transparent)',
                              color: 'var(--color-muted)',
                            }}
                          >
                            {m.role}
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs font-[family-name:var(--font-sans)]" style={{ color: 'var(--color-muted)' }}>
                    {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
