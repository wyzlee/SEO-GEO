'use client'

import Link from 'next/link'
import { Menu } from 'lucide-react'
import { useUIStore } from '@/lib/stores/ui-store'

export function MobileTopBar() {
  const mobileSidebarOpen = useUIStore((s) => s.mobileSidebarOpen)
  const openMobileSidebar = useUIStore((s) => s.openMobileSidebar)

  return (
    <header
      className="md:hidden sticky top-0 z-30 flex items-center gap-2 h-14 px-2 border-b"
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
      <button
        type="button"
        onClick={openMobileSidebar}
        aria-label="Ouvrir la navigation"
        aria-expanded={mobileSidebarOpen}
        aria-controls="app-sidebar"
        className="inline-flex items-center justify-center rounded-md transition-colors"
        style={{
          width: 44,
          height: 44,
          color: 'var(--color-text)',
        }}
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      <Link href="/dashboard" className="flex items-baseline gap-1.5 min-w-0">
        <span
          className="font-[family-name:var(--font-display)] font-black text-base tracking-tight"
          style={{ color: 'var(--color-text)' }}
        >
          SEO-GEO
        </span>
        <span
          className="text-[10px] tracking-[0.15em] uppercase truncate"
          style={{ color: 'var(--color-muted)' }}
        >
          Audit
        </span>
      </Link>
    </header>
  )
}
