'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  FileSearch,
  PlusCircle,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
}

const nav: NavItem[] = [
  { href: '/dashboard', label: 'Vue d\'ensemble', icon: LayoutDashboard },
  { href: '/dashboard/audits', label: 'Audits', icon: FileSearch },
  { href: '/dashboard/audits/new', label: 'Nouvel audit', icon: PlusCircle },
  { href: '/dashboard/settings', label: 'Paramètres', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const width = collapsed ? 64 : 220

  return (
    <aside
      className="shrink-0 flex flex-col border-r transition-[width] duration-200"
      style={{
        width,
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div
        className="h-16 flex items-center px-4 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        {!collapsed && (
          <span className="font-bold font-[family-name:var(--font-display)] text-lg">
            SEO-GEO
          </span>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? 'Déplier la navigation' : 'Replier la navigation'}
          className={cn('ml-auto p-1 rounded-md', 'hover:bg-[var(--color-bgAlt)]')}
          style={{ color: 'var(--color-muted)' }}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="flex-1 py-4 space-y-1">
        {nav.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname?.startsWith(item.href))
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 mx-2 px-3 py-2 rounded-md transition-colors',
                'font-[family-name:var(--font-sans)] text-[13px]',
              )}
              style={{
                background: active ? 'var(--color-bgAlt)' : 'transparent',
                color: active ? 'var(--color-text)' : 'var(--color-muted)',
                borderLeft: active
                  ? '3px solid var(--color-accent)'
                  : '3px solid transparent',
              }}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      <div
        className="border-t p-2"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <Link
          href="/auth/logout"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-[family-name:var(--font-sans)]"
          style={{ color: 'var(--color-muted)' }}
        >
          <LogOut size={18} />
          {!collapsed && 'Se déconnecter'}
        </Link>
      </div>
    </aside>
  )
}
