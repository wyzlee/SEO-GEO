'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export interface BreadcrumbItem {
  label: string
  href?: string
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav
      aria-label="Fil d'Ariane"
      className="flex items-center gap-1.5 px-6 pt-4 text-xs font-[family-name:var(--font-sans)]"
      style={{ color: 'var(--color-muted)' }}
    >
      {items.map((item, idx) => (
        <span key={idx} className="flex items-center gap-1.5">
          {idx > 0 && <ChevronRight size={12} aria-hidden="true" />}
          {item.href && idx < items.length - 1 ? (
            <Link
              href={item.href}
              className="hover:underline"
              style={{ color: 'var(--color-muted)' }}
            >
              {item.label}
            </Link>
          ) : (
            <span style={{ color: 'var(--color-text)' }}>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
