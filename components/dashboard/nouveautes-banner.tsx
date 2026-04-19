'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X, BarChart3, Brain, BookOpen } from 'lucide-react'

const STORAGE_KEY = 'seogeo_nouveautes_2026_dismissed'

const features = [
  {
    Icon: BarChart3,
    title: 'Benchmark concurrent',
    desc: 'Comparez jusqu\'à 5 sites, scores par phase.',
    href: '/guide',
  },
  {
    Icon: Brain,
    title: 'AI Citation Monitoring',
    desc: 'Votre domaine cité par Perplexity et ChatGPT ?',
    href: '/guide',
  },
  {
    Icon: BookOpen,
    title: 'Content Briefs IA',
    desc: 'Briefs de contenu générés post-audit par Claude.',
    href: '/guide',
  },
]

export function NouveautesBanner() {
  // Start hidden to avoid flash; reveal after localStorage check
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY)
    if (!dismissed) setVisible(true)
  }, [])

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      className="mx-4 md:mx-6 mt-4 rounded-lg overflow-hidden"
      style={{
        background: 'color-mix(in srgb, var(--color-accent) 6%, var(--color-surface))',
        border: '1px solid color-mix(in srgb, var(--color-accent) 25%, transparent)',
      }}
      role="region"
      aria-label="Nouvelles fonctionnalités"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'color-mix(in srgb, var(--color-accent) 20%, transparent)' }}
      >
        <div className="flex items-center gap-2">
          <span
            className="text-xs uppercase tracking-wider font-[family-name:var(--font-display)] font-semibold px-2 py-0.5 rounded"
            style={{
              background: 'color-mix(in srgb, var(--color-accent) 15%, transparent)',
              color: 'var(--color-accent)',
            }}
          >
            Nouveautés 2026
          </span>
          <span
            className="text-xs font-[family-name:var(--font-sans)]"
            style={{ color: 'var(--color-muted)' }}
          >
            3 nouvelles fonctionnalités disponibles
          </span>
        </div>
        <button
          onClick={dismiss}
          aria-label="Fermer les nouveautés"
          className="flex items-center justify-center rounded"
          style={{
            width: 28,
            height: 28,
            color: 'var(--color-muted)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <X size={14} strokeWidth={2} aria-hidden />
        </button>
      </div>

      {/* Feature list */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-px"
        style={{ background: 'color-mix(in srgb, var(--color-accent) 20%, transparent)' }}
      >
        {features.map(({ Icon, title, desc, href }) => (
          <Link
            key={title}
            href={href}
            className="flex items-start gap-3 px-4 py-3 transition-colors"
            style={{
              background: 'color-mix(in srgb, var(--color-accent) 4%, var(--color-surface))',
              textDecoration: 'none',
            }}
          >
            <span
              className="mt-0.5 flex-shrink-0 flex items-center justify-center rounded"
              style={{
                width: 28,
                height: 28,
                background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
                color: 'var(--color-accent)',
              }}
            >
              <Icon size={14} strokeWidth={2} aria-hidden />
            </span>
            <div className="min-w-0">
              <div
                className="text-sm font-[family-name:var(--font-display)] font-semibold"
                style={{ color: 'var(--color-text)' }}
              >
                {title}
              </div>
              <div
                className="text-xs font-[family-name:var(--font-sans)] leading-snug mt-0.5"
                style={{ color: 'var(--color-muted)' }}
              >
                {desc}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
