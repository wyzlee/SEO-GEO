'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import {
  LayoutDashboard,
  FileSearch,
  PlusCircle,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Principal',
    items: [
      { href: '/dashboard', label: 'Vue d\'ensemble', icon: LayoutDashboard },
      { href: '/dashboard/audits', label: 'Audits', icon: FileSearch },
      { href: '/dashboard/audits/new', label: 'Nouvel audit', icon: PlusCircle },
    ],
  },
  {
    label: 'Compte',
    items: [
      { href: '/dashboard/settings', label: 'Paramètres', icon: Settings },
    ],
  },
]

const ALL_HREFS = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href))

export function Sidebar() {
  const pathname = usePathname() ?? ''
  const { resolvedTheme, setTheme } = useTheme()
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Pour éviter le double-active : un item "parent" (ex: /dashboard/audits)
  // n'est pas actif si un autre item plus spécifique (/dashboard/audits/new)
  // matche déjà le pathname.
  const isActive = (href: string): boolean => {
    const matches = pathname === href || pathname.startsWith(href + '/')
    if (!matches) return false
    const hasMoreSpecific = ALL_HREFS.some(
      (other) =>
        other !== href &&
        other.startsWith(href + '/') &&
        (pathname === other || pathname.startsWith(other + '/')),
    )
    return !hasMoreSpecific
  }

  const isDark = mounted && resolvedTheme === 'dark'
  const themeLabel = isDark ? 'Mode clair' : 'Mode sombre'

  return (
    <aside
      className="shrink-0 flex flex-col h-screen sticky top-0 border-r transition-[width] duration-200"
      style={{
        width: collapsed ? 64 : 220,
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Header / brand */}
      <div
        className={cn(
          'border-b relative',
          collapsed ? 'px-2 pt-4 pb-3' : 'px-5 pt-6 pb-5',
        )}
        style={{ borderColor: 'var(--color-border)' }}
      >
        <Link href="/dashboard" className="block">
          {collapsed ? (
            <span
              className="flex items-center justify-center font-[family-name:var(--font-display)] font-black text-base tracking-tight"
              style={{ color: 'var(--color-text)' }}
            >
              S
            </span>
          ) : (
            <>
              <span
                className="font-[family-name:var(--font-display)] font-black text-xl tracking-tight"
                style={{ color: 'var(--color-text)' }}
              >
                SEO-GEO
              </span>
              <span
                className="block text-[10px] tracking-[0.15em] uppercase mt-0.5"
                style={{ color: 'var(--color-muted)' }}
              >
                Audit SEO &amp; GEO
              </span>
              <span
                className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded font-[family-name:var(--font-sans)] tracking-wider"
                style={{
                  background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--color-accent) 25%, transparent)',
                  color: 'var(--color-accent)',
                }}
              >
                v1.0 — 2026
              </span>
            </>
          )}
        </Link>

        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? 'Déplier la navigation' : 'Replier la navigation'}
          className="hidden md:flex items-center justify-center w-6 h-6 rounded-full absolute -right-3 top-7 z-10 transition-colors"
          style={{
            background: 'var(--color-bgAlt)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-muted)',
          }}
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto py-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="py-3">
            {!collapsed ? (
              <div className="px-5 pb-1.5">
                <span
                  className="text-[10px] font-[family-name:var(--font-display)] tracking-[0.18em] uppercase"
                  style={{ color: 'var(--color-muted)' }}
                >
                  {group.label}
                </span>
              </div>
            ) : (
              <div className="px-2 pb-1.5">
                <div
                  className="h-px mx-1"
                  style={{ background: 'var(--color-border)' }}
                />
              </div>
            )}
            {group.items.map((item) => {
              const active = isActive(item.href)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center transition-all duration-150',
                    collapsed
                      ? 'justify-center px-2 py-2 mx-1 rounded-md'
                      : 'gap-2 px-5 py-[7px] text-[13px] border-l-2',
                  )}
                  style={
                    collapsed
                      ? {
                          background: active
                            ? 'color-mix(in srgb, var(--color-accent) 8%, transparent)'
                            : 'transparent',
                          color: active ? 'var(--color-accent)' : 'var(--color-muted)',
                        }
                      : {
                          borderLeftColor: active
                            ? 'var(--color-accent)'
                            : 'transparent',
                          background: active
                            ? 'color-mix(in srgb, var(--color-accent) 8%, transparent)'
                            : 'transparent',
                          color: active ? 'var(--color-accent)' : 'var(--color-muted)',
                        }
                  }
                >
                  <Icon
                    className={cn('h-4 w-4 shrink-0', active ? 'opacity-100' : 'opacity-60')}
                  />
                  {!collapsed && (
                    <>
                      <span
                        className="w-[5px] h-[5px] rounded-full shrink-0"
                        style={{
                          background: 'currentColor',
                          opacity: active ? 1 : 0.4,
                        }}
                      />
                      <span className="tracking-[0.02em]">{item.label}</span>
                    </>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div
        className="border-t mt-auto"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div
          className={cn(
            'flex flex-col gap-1',
            collapsed ? 'px-2 py-2 items-center' : 'px-5 py-2',
          )}
        >
          <button
            type="button"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            title={collapsed ? themeLabel : undefined}
            aria-label={themeLabel}
            className={cn(
              'flex items-center transition-colors text-[11px] tracking-wider',
              collapsed
                ? 'justify-center p-2 rounded-md w-full'
                : 'gap-2 py-2',
            )}
            style={{ color: 'var(--color-muted)' }}
          >
            {mounted ? (
              isDark ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )
            ) : (
              <Moon className="h-4 w-4 opacity-0" />
            )}
            {!collapsed && <span>{themeLabel}</span>}
          </button>

          <Link
            href="/auth/logout"
            title={collapsed ? 'Se déconnecter' : undefined}
            aria-label="Se déconnecter"
            className={cn(
              'flex items-center transition-colors text-[11px] tracking-wider',
              collapsed
                ? 'justify-center p-2 rounded-md w-full'
                : 'gap-2 py-2',
            )}
            style={{ color: 'var(--color-muted)' }}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Se déconnecter</span>}
          </Link>
        </div>

        {!collapsed && (
          <div
            className="px-5 py-3 border-t text-[10px] leading-relaxed"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-muted)',
            }}
          >
            <span
              className="inline-block w-[6px] h-[6px] rounded-full mr-1.5 animate-pulse"
              style={{ background: 'var(--color-green)' }}
            />
            Service opérationnel
          </div>
        )}
      </div>
    </aside>
  )
}
