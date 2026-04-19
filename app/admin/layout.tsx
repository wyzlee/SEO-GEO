import { redirect } from 'next/navigation'
import { cookies, headers } from 'next/headers'
import { requireSuperAdmin } from '@/lib/auth/super-admin'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const reqHeaders = await headers()

  const projectId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID
  const cookieToken =
    cookieStore.get(`stack-access-${projectId}`)?.value ||
    cookieStore.get('stack-access')?.value

  const syntheticHeaders: Record<string, string> = {}
  if (cookieToken) {
    syntheticHeaders['Authorization'] = `Bearer ${cookieToken}`
  } else {
    const cookieHeader = reqHeaders.get('cookie')
    if (cookieHeader) syntheticHeaders['cookie'] = cookieHeader
  }

  if (!cookieToken && !reqHeaders.get('cookie')) {
    redirect('/dashboard')
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || 'https://seo-geo-orcin.vercel.app'

  const syntheticRequest = new Request(`${baseUrl}/api/admin/me`, {
    headers: syntheticHeaders,
  })

  try {
    await requireSuperAdmin(syntheticRequest)
  } catch {
    redirect('/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <div
        style={{
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <span
          className="font-[family-name:var(--font-display)] font-black text-lg tracking-tight"
          style={{ color: 'var(--color-text)' }}
        >
          SEO-GEO
        </span>
        <span
          className="text-[10px] px-2 py-0.5 rounded font-[family-name:var(--font-sans)] tracking-wider"
          style={{
            background: 'color-mix(in srgb, var(--color-red) 12%, transparent)',
            border: '1px solid color-mix(in srgb, var(--color-red) 25%, transparent)',
            color: 'var(--color-red)',
          }}
        >
          SUPER ADMIN
        </span>
        <nav className="flex items-center gap-4 ml-4" aria-label="Navigation admin">
          {[
            { href: '/admin', label: 'Tableau de bord' },
            { href: '/admin/organizations', label: 'Organisations' },
            { href: '/admin/users', label: 'Utilisateurs' },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-[13px] font-[family-name:var(--font-display)]"
              style={{ color: 'var(--color-muted)' }}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto">
          <a
            href="/dashboard"
            className="btn-secondary text-[12px]"
          >
            ← Retour au dashboard
          </a>
        </div>
      </div>
      <main id="main-content">{children}</main>
    </div>
  )
}
