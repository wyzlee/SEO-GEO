'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  SearchCode,
  Building2,
  UsersRound,
  ClipboardList,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiJson } from '@/lib/api/fetch'

// ─── AdminContext ─────────────────────────────────────────────────────────────

export interface AdminContextType {
  isSuperAdmin: boolean
  userId: string
  email: string
  orgId: string | null
  orgRole: string | null
  orgName: string | null
}

const AdminContext = createContext<AdminContextType>({
  isSuperAdmin: false,
  userId: '',
  email: '',
  orgId: null,
  orgRole: null,
  orgName: null,
})

export const useAdminContext = () => useContext(AdminContext)

// ─── Org cookie helpers ───────────────────────────────────────────────────────

const ORG_COOKIE = 'seogeo-admin-org-id'
const COLLAPSED_KEY = 'seogeo-admin-sidebar-collapsed'

function getOrgCookie(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${ORG_COOKIE}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function setOrgCookie(orgId: string) {
  document.cookie = `${ORG_COOKIE}=${encodeURIComponent(orgId)};path=/;SameSite=Lax;max-age=2592000`
}

function getSidebarCollapsed(): boolean {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem(COLLAPSED_KEY) === '1'
}

function setSidebarCollapsed(v: boolean) {
  localStorage.setItem(COLLAPSED_KEY, v ? '1' : '0')
}

// ─── Nav config ───────────────────────────────────────────────────────────────

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ size?: number; 'aria-hidden'?: boolean | 'true' | 'false' }>
}

interface NavGroup {
  label: string
  items: NavItem[]
  superAdminOnly?: boolean
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Mon organisation',
    items: [
      { href: '/admin', label: 'Tableau de bord', icon: LayoutDashboard },
      { href: '/admin/members', label: 'Membres', icon: Users },
      { href: '/admin/org-audits', label: 'Audits org', icon: SearchCode },
    ],
  },
  {
    label: 'Plateforme',
    superAdminOnly: true,
    items: [
      { href: '/admin/organizations', label: 'Organisations', icon: Building2 },
      { href: '/admin/users', label: 'Utilisateurs', icon: UsersRound },
      { href: '/admin/audits', label: 'Tous les audits', icon: ClipboardList },
      { href: '/admin/plans', label: 'Plans tarifaires', icon: CreditCard },
    ],
  },
]

// ─── Sidebar nav item ─────────────────────────────────────────────────────────

function NavItemLink({
  item,
  pathname,
  allHrefs,
  collapsed,
}: {
  item: NavItem
  pathname: string
  allHrefs: string[]
  collapsed: boolean
}) {
  const isActive = (() => {
    const matches = pathname === item.href || pathname.startsWith(item.href + '/')
    if (!matches) return false
    const hasMoreSpecific = allHrefs.some(
      (other) =>
        other !== item.href &&
        other.startsWith(item.href + '/') &&
        (pathname === other || pathname.startsWith(other + '/')),
    )
    return !hasMoreSpecific
  })()

  const Icon = item.icon

  return (
    <Link
      href={item.href}
      aria-current={isActive ? 'page' : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        'flex items-center gap-2.5 text-[13px] border-l-2 transition-colors duration-150',
        collapsed ? 'justify-center px-0 py-2.5' : 'px-5 py-[7px]',
      )}
      style={{
        borderLeftColor: isActive ? 'var(--color-accent)' : 'transparent',
        background: isActive
          ? 'color-mix(in srgb, var(--color-accent) 8%, transparent)'
          : 'transparent',
        color: isActive ? 'var(--color-accent)' : 'var(--color-muted)',
        fontWeight: isActive ? 600 : 400,
        fontFamily: 'var(--font-sans)',
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          ;(e.currentTarget as HTMLElement).style.color = 'var(--color-text)'
          ;(e.currentTarget as HTMLElement).style.background =
            'color-mix(in srgb, var(--color-accent) 4%, transparent)'
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          ;(e.currentTarget as HTMLElement).style.color = 'var(--color-muted)'
          ;(e.currentTarget as HTMLElement).style.background = 'transparent'
        }
      }}
    >
      <Icon size={15} aria-hidden="true" />
      {!collapsed && (
        <span className="font-[family-name:var(--font-sans)]">{item.label}</span>
      )}
    </Link>
  )
}

// ─── OrgSwitcher (super-admin only) ───────────────────────────────────────────

interface OrgOption {
  id: string
  name: string
}

function OrgSwitcher({
  selectedOrgId,
  onSelect,
  collapsed,
}: {
  selectedOrgId: string | null
  onSelect: (orgId: string, orgName: string) => void
  collapsed: boolean
}) {
  const [open, setOpen] = useState(false)
  const [orgs, setOrgs] = useState<OrgOption[]>([])
  const [loading, setLoading] = useState(true)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    apiJson<{ organizations: Array<{ id: string; name: string }> }>('/api/admin/organizations')
      .then((data) => {
        setOrgs(data.organizations.map((o) => ({ id: o.id, name: o.name })))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const selected = orgs.find((o) => o.id === selectedOrgId)
  const initial = selected?.name?.charAt(0)?.toUpperCase() ?? '?'

  if (collapsed) {
    return (
      <div className="px-2 pb-3 relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          title={selected?.name ?? 'Changer d\'organisation'}
          aria-label="Changer d'organisation"
          className="flex items-center justify-center w-full rounded-md transition-colors"
          style={{
            height: 32,
            background: 'var(--color-bgAlt)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-accent)',
            fontSize: 12,
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
          }}
          disabled={loading}
        >
          {initial}
        </button>
        {open && (
          <div
            role="listbox"
            className="absolute left-full top-0 ml-2 z-50 rounded-md py-1 min-w-[180px]"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.16)',
            }}
          >
            {orgs.map((org) => (
              <button
                key={org.id}
                type="button"
                role="option"
                aria-selected={org.id === selectedOrgId}
                onClick={() => { setOpen(false); onSelect(org.id, org.name); setOrgCookie(org.id) }}
                className="flex items-center gap-2 w-full px-3 py-2 text-left transition-colors text-[12px]"
                style={{
                  background: org.id === selectedOrgId ? 'color-mix(in srgb, var(--color-accent) 8%, transparent)' : 'transparent',
                  color: org.id === selectedOrgId ? 'var(--color-accent)' : 'var(--color-text)',
                  fontFamily: 'var(--font-display)',
                  fontWeight: org.id === selectedOrgId ? 600 : 400,
                }}
              >
                {org.name}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="px-3 pb-3" ref={dropdownRef}>
      <div
        className="text-[10px] uppercase tracking-[0.18em] mb-1.5 px-2 font-[family-name:var(--font-display)]"
        style={{ color: 'var(--color-muted)', fontWeight: 700 }}
      >
        Organisation courante
      </div>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label="Changer d'organisation"
          className="flex items-center gap-1.5 w-full rounded-md px-2 py-1.5 transition-colors"
          style={{
            background: 'var(--color-bgAlt)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)',
          }}
          disabled={loading}
        >
          <span
            className="flex-1 text-left text-[12px] font-[family-name:var(--font-display)] font-semibold truncate"
            style={{ color: 'var(--color-text)' }}
          >
            {loading ? 'Chargement…' : (selected?.name ?? 'Toutes les orgs')}
          </span>
          <ChevronDown
            size={12}
            aria-hidden="true"
            style={{
              color: 'var(--color-muted)',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 150ms cubic-bezier(0.4,0,0.2,1)',
              flexShrink: 0,
            }}
          />
        </button>

        {open && (
          <div
            role="listbox"
            aria-label="Sélectionner une organisation"
            className="absolute top-full left-0 right-0 mt-1 z-50 rounded-md py-1"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            }}
          >
            {orgs.map((org) => (
              <button
                key={org.id}
                type="button"
                role="option"
                aria-selected={org.id === selectedOrgId}
                onClick={() => { setOpen(false); onSelect(org.id, org.name); setOrgCookie(org.id) }}
                className="flex items-center gap-2 w-full px-3 py-2 text-left transition-colors"
                style={{
                  background: org.id === selectedOrgId ? 'color-mix(in srgb, var(--color-accent) 8%, transparent)' : 'transparent',
                  color: org.id === selectedOrgId ? 'var(--color-accent)' : 'var(--color-text)',
                  fontSize: '12px',
                  fontFamily: 'var(--font-display)',
                  fontWeight: org.id === selectedOrgId ? 600 : 400,
                }}
              >
                <span
                  className="flex items-center justify-center rounded shrink-0 text-[10px] font-black"
                  style={{
                    width: 18, height: 18,
                    background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
                    color: 'var(--color-accent)',
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  {org.name.charAt(0).toUpperCase()}
                </span>
                <span className="truncate">{org.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── AdminSidebar ─────────────────────────────────────────────────────────────

function AdminSidebar({
  ctx,
  selectedOrgId,
  onOrgSelect,
  mobileOpen,
  onMobileClose,
  collapsed,
  onToggleCollapse,
}: {
  ctx: AdminContextType
  selectedOrgId: string | null
  onOrgSelect: (orgId: string, orgName: string) => void
  mobileOpen: boolean
  onMobileClose: () => void
  collapsed: boolean
  onToggleCollapse: () => void
}) {
  const pathname = usePathname() ?? ''
  const allHrefs = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href))
  const sidebarW = collapsed ? 56 : 220

  useEffect(() => { onMobileClose() }, [pathname, onMobileClose])

  useEffect(() => {
    if (!mobileOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onMobileClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [mobileOpen, onMobileClose])

  useEffect(() => {
    if (!mobileOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [mobileOpen])

  const roleLabel = ctx.isSuperAdmin
    ? 'Super admin'
    : ctx.orgRole === 'owner' ? 'Owner'
    : ctx.orgRole === 'admin' ? 'Admin'
    : ctx.orgRole ?? 'Membre'

  return (
    <aside
      id="admin-sidebar"
      role="navigation"
      aria-label="Navigation admin"
      className={cn(
        'fixed inset-y-0 left-0 z-50 flex flex-col h-screen',
        'transition-all duration-300',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
        'lg:sticky lg:top-0 lg:translate-x-0 lg:z-auto lg:h-screen shrink-0',
      )}
      style={{
        width: sidebarW,
        background: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center border-b relative"
        style={{
          borderColor: 'var(--color-border)',
          padding: collapsed ? '20px 0 16px' : '20px 20px 16px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: collapsed ? 0 : 8,
        }}
      >
        {/* Mobile close */}
        <button
          type="button"
          onClick={onMobileClose}
          aria-label="Fermer la navigation"
          className="lg:hidden absolute top-3 right-1 flex items-center justify-center rounded-md transition-colors"
          style={{ width: 36, height: 36, color: 'var(--color-muted)' }}
        >
          <X size={16} aria-hidden="true" />
        </button>

        {collapsed ? (
          <Link
            href="/admin"
            aria-label="SEO-GEO Admin"
            className="font-[family-name:var(--font-display)] font-black text-[13px] tracking-tight"
            style={{ color: 'var(--color-accent)' }}
          >
            SG
          </Link>
        ) : (
          <Link
            href="/admin"
            className="flex items-center gap-2 min-w-0"
            aria-label="SEO-GEO Admin — tableau de bord"
          >
            <span
              className="font-[family-name:var(--font-display)] font-black text-lg tracking-tight shrink-0"
              style={{ color: 'var(--color-text)' }}
            >
              SEO-GEO
            </span>
            <span
              className="text-[9px] px-1.5 py-0.5 rounded font-[family-name:var(--font-sans)] tracking-wider shrink-0"
              style={{
                background: 'color-mix(in srgb, var(--color-red) 12%, transparent)',
                border: '1px solid color-mix(in srgb, var(--color-red) 25%, transparent)',
                color: 'var(--color-red)',
              }}
            >
              ADMIN
            </span>
          </Link>
        )}

        {/* Collapse toggle — desktop only */}
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Déplier la sidebar' : 'Réduire la sidebar'}
          title={collapsed ? 'Déplier' : 'Réduire'}
          className="hidden lg:flex items-center justify-center rounded-md transition-colors"
          style={{
            width: 24,
            height: 24,
            marginLeft: collapsed ? 0 : 'auto',
            color: 'var(--color-muted)',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-muted)' }}
        >
          {collapsed ? <ChevronRight size={14} aria-hidden="true" /> : <ChevronLeft size={14} aria-hidden="true" />}
        </button>
      </div>

      {/* Org switcher — super-admin only */}
      {ctx.isSuperAdmin && (
        <div className="border-b pt-3" style={{ borderColor: 'var(--color-border)' }}>
          <OrgSwitcher selectedOrgId={selectedOrgId} onSelect={onOrgSelect} collapsed={collapsed} />
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3">
        {NAV_GROUPS.map((group) => {
          if (group.superAdminOnly && !ctx.isSuperAdmin) return null
          return (
            <div key={group.label} className="py-2">
              {!collapsed && (
                <div className="px-5 pb-1.5">
                  <span
                    className="text-[10px] font-[family-name:var(--font-display)] tracking-[0.18em] uppercase"
                    style={{ color: 'var(--color-muted)', fontWeight: 700 }}
                  >
                    {group.label}
                  </span>
                </div>
              )}
              {collapsed && <div style={{ height: 8 }} />}
              {group.items.map((item) => (
                <NavItemLink
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  allHrefs={allHrefs}
                  collapsed={collapsed}
                />
              ))}
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t mt-auto" style={{ borderColor: 'var(--color-border)' }}>
        {!collapsed && (
          <div className="px-3 pt-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-3 py-2 rounded-md text-[12px] transition-colors"
              style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-sans)' }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLElement).style.color = 'var(--color-text)'
                ;(e.currentTarget as HTMLElement).style.background = 'color-mix(in srgb, var(--color-accent) 4%, transparent)'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLElement).style.color = 'var(--color-muted)'
                ;(e.currentTarget as HTMLElement).style.background = 'transparent'
              }}
            >
              <ChevronLeft size={14} aria-hidden="true" />
              <span>Retour dashboard</span>
            </Link>
          </div>
        )}

        {collapsed ? (
          <div className="flex flex-col items-center gap-2 py-3">
            <Link
              href="/dashboard"
              title="Retour dashboard"
              className="flex items-center justify-center rounded-md transition-colors"
              style={{ width: 36, height: 36, color: 'var(--color-muted)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-muted)' }}
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </Link>
            <Link
              href="/auth/logout"
              title="Déconnexion"
              className="flex items-center justify-center rounded-md transition-colors"
              style={{ width: 36, height: 36, color: 'var(--color-muted)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-red)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-muted)' }}
            >
              <LogOut size={16} aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <>
            <div className="px-5 py-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <div
                className="text-[12px] font-[family-name:var(--font-display)] font-semibold truncate"
                style={{ color: 'var(--color-text)' }}
                title={ctx.email}
              >
                {ctx.email || '—'}
              </div>
              <div className="text-[10px] font-[family-name:var(--font-sans)] mt-0.5" style={{ color: 'var(--color-muted)' }}>
                {roleLabel}
              </div>
            </div>
            <div className="px-3 pb-3">
              <Link
                href="/auth/logout"
                className="flex items-center gap-2 px-3 py-2 rounded-md text-[12px] transition-colors min-h-[44px]"
                style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-sans)' }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLElement).style.color = 'var(--color-red)'
                  ;(e.currentTarget as HTMLElement).style.background = 'color-mix(in srgb, var(--color-red) 6%, transparent)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLElement).style.color = 'var(--color-muted)'
                  ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                }}
              >
                <LogOut size={14} aria-hidden="true" />
                <span>Déconnexion</span>
              </Link>
            </div>
          </>
        )}
      </div>
    </aside>
  )
}

// ─── Layout root ──────────────────────────────────────────────────────────────

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [ctx, setCtx] = useState<AdminContextType>({
    isSuperAdmin: false,
    userId: '',
    email: '',
    orgId: null,
    orgRole: null,
    orgName: null,
  })
  const [ready, setReady] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)

  const closeMobile = useCallback(() => setMobileOpen(false), [])

  // Read persisted collapse state after mount
  useEffect(() => {
    setCollapsed(getSidebarCollapsed())
  }, [])

  const handleToggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      setSidebarCollapsed(next)
      return next
    })
  }, [])

  useEffect(() => {
    const cookieOrg = getOrgCookie()

    apiJson<{
      isSuperAdmin: boolean
      userId?: string
      email?: string
      orgId?: string | null
      orgRole?: string | null
      orgName?: string | null
    }>('/api/admin/me')
      .then((data) => {
        if (!data.isSuperAdmin && !data.orgId) {
          router.replace('/dashboard')
          return
        }

        const resolvedOrgId = data.isSuperAdmin
          ? (cookieOrg ?? data.orgId ?? null)
          : data.orgId ?? null

        setCtx({
          isSuperAdmin: data.isSuperAdmin,
          userId: data.userId ?? '',
          email: data.email ?? '',
          orgId: resolvedOrgId,
          orgRole: data.orgRole ?? null,
          orgName: data.orgName ?? null,
        })

        if (data.isSuperAdmin) setSelectedOrgId(cookieOrg ?? null)

        setReady(true)
      })
      .catch(() => {
        router.replace('/dashboard')
      })
  }, [router])

  function handleOrgSelect(orgId: string, orgName: string) {
    setSelectedOrgId(orgId)
    setCtx((prev) => ({ ...prev, orgId, orgName }))
  }

  if (!ready) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--color-bg)' }}
        role="status"
      >
        <span className="text-sm font-[family-name:var(--font-sans)]" style={{ color: 'var(--color-muted)' }}>
          Chargement…
        </span>
      </div>
    )
  }

  return (
    <AdminContext.Provider value={ctx}>
      <div className="min-h-screen flex" style={{ background: 'var(--color-bg)' }}>
        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Ouvrir la navigation"
          aria-expanded={mobileOpen}
          aria-controls="admin-sidebar"
          className="lg:hidden fixed top-4 left-4 z-40 flex items-center justify-center rounded-md transition-colors"
          style={{
            width: 44, height: 44,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-muted)',
          }}
        >
          <Menu size={18} aria-hidden="true" />
        </button>

        {/* Mobile overlay */}
        {mobileOpen && (
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/40"
            aria-hidden="true"
            onClick={closeMobile}
            style={{ backdropFilter: 'blur(2px)' }}
          />
        )}

        {/* Sidebar */}
        <AdminSidebar
          ctx={ctx}
          selectedOrgId={selectedOrgId}
          onOrgSelect={handleOrgSelect}
          mobileOpen={mobileOpen}
          onMobileClose={closeMobile}
          collapsed={collapsed}
          onToggleCollapse={handleToggleCollapse}
        />

        {/* Main content — flex-1 adapts to sidebar width automatically on desktop */}
        <main id="main-content" className="flex-1 min-w-0 p-6">
          {/* Mobile top spacer so content doesn't sit under hamburger */}
          <div className="lg:hidden h-14" aria-hidden="true" />
          {children}
        </main>
      </div>
    </AdminContext.Provider>
  )
}
