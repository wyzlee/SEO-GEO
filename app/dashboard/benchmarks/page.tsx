'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { GitCompare } from 'lucide-react'
import { PageHeader } from '@/components/layout/header'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { apiJson } from '@/lib/api/fetch'

interface BenchmarkRow {
  id: string
  name: string
  mode: 'flash' | 'full'
  status: 'queued' | 'running' | 'completed' | 'failed'
  createdAt: string
  finishedAt: string | null
}

interface BenchmarksResponse {
  benchmarks: BenchmarkRow[]
  pagination: { page: number; limit: number; total: number }
}

const STATUS_STYLES: Record<BenchmarkRow['status'], { label: string; color: string }> = {
  queued: { label: 'En file', color: 'var(--color-muted)' },
  running: { label: 'En cours', color: 'var(--color-blue)' },
  completed: { label: 'Terminé', color: 'var(--color-green)' },
  failed: { label: 'Échec', color: 'var(--color-red)' },
}

const MODE_LABELS: Record<BenchmarkRow['mode'], string> = {
  flash: 'Flash (~2 min)',
  full: 'Complet (~10 min)',
}

export default function BenchmarksListPage() {
  const [data, setData] = useState<BenchmarksResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    apiJson<BenchmarksResponse>('/api/benchmarks')
      .then((res) => {
        if (!cancelled) {
          setData(res)
          setError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erreur de chargement')
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const benchmarks = data?.benchmarks ?? []

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Benchmarks' },
        ]}
      />
      <PageHeader
        title="Benchmarks"
        description="Comparez plusieurs URLs sur les mêmes phases d'audit."
        actions={
          <Link href="/dashboard/benchmarks/new" className="btn-primary">
            Nouveau benchmark
          </Link>
        }
      />

      <section className="p-4 md:p-6">
        <div className="card-premium">
          {isLoading ? (
            // Skeleton loader
            <div className="space-y-3 py-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-12 rounded-md animate-pulse"
                  style={{ background: 'var(--color-bgAlt)' }}
                />
              ))}
            </div>
          ) : error ? (
            <p
              className="text-sm py-6 text-center font-[family-name:var(--font-sans)]"
              style={{ color: 'var(--color-red)' }}
            >
              {error}
            </p>
          ) : benchmarks.length === 0 ? (
            <div className="text-center py-16">
              <GitCompare
                size={40}
                className="mx-auto mb-4"
                style={{ color: 'var(--color-muted)' }}
                aria-hidden="true"
              />
              <h2
                className="text-xl font-semibold font-[family-name:var(--font-display)]"
                style={{ color: 'var(--color-text)' }}
              >
                Aucun benchmark pour l&apos;instant
              </h2>
              <p
                className="mt-2 text-sm max-w-md mx-auto font-[family-name:var(--font-sans)]"
                style={{ color: 'var(--color-muted)' }}
              >
                Créez votre premier benchmark pour comparer plusieurs sites côte à côte
                sur les 11 phases d&apos;audit SEO/GEO.
              </p>
              <Link
                href="/dashboard/benchmarks/new"
                className="btn-primary mt-6 inline-flex"
              >
                Nouveau benchmark
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
              <table className="w-full min-w-[600px] text-sm font-[family-name:var(--font-sans)]">
                <thead>
                  <tr
                    className="text-left border-b"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <th className="pb-3 font-medium font-[family-name:var(--font-display)]">
                      Nom
                    </th>
                    <th className="pb-3 font-medium font-[family-name:var(--font-display)]">
                      Mode
                    </th>
                    <th className="pb-3 font-medium font-[family-name:var(--font-display)]">
                      Statut
                    </th>
                    <th className="pb-3 font-medium font-[family-name:var(--font-display)]">
                      Créé le
                    </th>
                    <th className="pb-3" />
                  </tr>
                </thead>
                <tbody>
                  {benchmarks.map((b) => {
                    const style = STATUS_STYLES[b.status]
                    return (
                      <tr
                        key={b.id}
                        className="border-b"
                        style={{ borderColor: 'var(--color-border)' }}
                      >
                        <td className="py-3 font-medium" style={{ color: 'var(--color-text)' }}>
                          {b.name}
                        </td>
                        <td className="py-3" style={{ color: 'var(--color-muted)' }}>
                          {MODE_LABELS[b.mode]}
                        </td>
                        <td className="py-3">
                          <span
                            className="inline-flex items-center gap-1.5 text-xs font-[family-name:var(--font-display)]"
                            style={{ color: style.color }}
                          >
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ background: style.color }}
                              aria-hidden="true"
                            />
                            {style.label}
                          </span>
                        </td>
                        <td className="py-3" style={{ color: 'var(--color-muted)' }}>
                          {new Date(b.createdAt).toLocaleString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 text-right">
                          <Link
                            href={`/dashboard/benchmarks/${b.id}`}
                            className="text-xs font-[family-name:var(--font-sans)]"
                            style={{ color: 'var(--color-accent)' }}
                          >
                            Voir →
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
