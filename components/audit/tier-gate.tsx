import type { ReactNode } from 'react'
import Link from 'next/link'

interface TierGateProps {
  children: ReactNode
  /** Is this content locked for the current user? Caller determines this. */
  locked: boolean
  featureLabel: string
}

export function TierGate({ children, locked, featureLabel }: TierGateProps) {
  if (!locked) return <>{children}</>

  return (
    <div className="relative rounded-xl overflow-hidden">
      {/* Blurred content */}
      <div
        className="pointer-events-none select-none"
        style={{ filter: 'blur(5px)', opacity: 0.4 }}
        aria-hidden="true"
      >
        {children}
      </div>

      {/* Overlay */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-xl p-6 text-center"
        style={{
          background: 'color-mix(in srgb, var(--color-surface) 85%, transparent)',
          backdropFilter: 'blur(2px)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
          style={{
            background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
            color: 'var(--color-accent)',
          }}
          aria-hidden="true"
        >
          🔒
        </div>
        <div>
          <p className="font-[family-name:var(--font-display)] font-semibold text-sm">
            {featureLabel}
          </p>
          <p
            className="mt-1 text-xs font-[family-name:var(--font-sans)]"
            style={{ color: 'var(--color-muted)' }}
          >
            Disponible avec le plan Pro
          </p>
        </div>
        <Link
          href="mailto:contact@wyzlee.com?subject=Upgrade%20Pro%20SEO-GEO"
          className="btn-primary text-sm"
        >
          Passer à Pro
        </Link>
      </div>
    </div>
  )
}
