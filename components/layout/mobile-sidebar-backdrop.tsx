'use client'

import { useUIStore } from '@/lib/stores/ui-store'

export function MobileSidebarBackdrop() {
  const mobileSidebarOpen = useUIStore((s) => s.mobileSidebarOpen)
  const closeMobileSidebar = useUIStore((s) => s.closeMobileSidebar)

  return (
    <div
      aria-hidden="true"
      onClick={closeMobileSidebar}
      className="md:hidden fixed inset-0 z-40 transition-opacity duration-200"
      style={{
        background: 'rgba(0, 0, 0, 0.5)',
        opacity: mobileSidebarOpen ? 1 : 0,
        pointerEvents: mobileSidebarOpen ? 'auto' : 'none',
      }}
    />
  )
}
