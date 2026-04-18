import { Sidebar } from './sidebar'
import { MobileTopBar } from './mobile-topbar'
import { MobileSidebarBackdrop } from './mobile-sidebar-backdrop'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex flex-col md:flex-row"
      style={{ background: 'var(--color-bg)' }}
    >
      <MobileTopBar />
      <MobileSidebarBackdrop />
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <main id="main-content" className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
