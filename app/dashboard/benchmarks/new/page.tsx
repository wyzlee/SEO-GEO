'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Trash2, Star } from 'lucide-react'
import { PageHeader } from '@/components/layout/header'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { authFetch } from '@/lib/api/fetch'

type BenchmarkMode = 'flash' | 'full'

interface UrlEntry {
  id: number
  url: string
  label: string
  isReference: boolean
}

const MODE_INFO: Record<BenchmarkMode, { label: string; description: string }> = {
  flash: {
    label: 'Flash',
    description: 'Analyse rapide · ~2 min par URL',
  },
  full: {
    label: 'Complet',
    description: 'Analyse détaillée · ~10 min par URL',
  },
}

let nextId = 1

function makeUrl(isReference = false): UrlEntry {
  return { id: nextId++, url: '', label: '', isReference }
}

export default function NewBenchmarkPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [mode, setMode] = useState<BenchmarkMode>('flash')
  // Initialize with 2 entries, first one is reference
  const [urls, setUrls] = useState<UrlEntry[]>([makeUrl(true), makeUrl(false)])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const canAdd = urls.length < 5
  const canRemove = urls.length > 2

  const addUrl = () => {
    if (!canAdd) return
    setUrls((prev) => [...prev, makeUrl(false)])
  }

  const removeUrl = (id: number) => {
    if (!canRemove) return
    setUrls((prev) => {
      const filtered = prev.filter((u) => u.id !== id)
      // If we removed the reference, assign it to the first entry
      if (!filtered.some((u) => u.isReference)) {
        return filtered.map((u, i) => (i === 0 ? { ...u, isReference: true } : u))
      }
      return filtered
    })
  }

  const updateUrl = (id: number, patch: Partial<Omit<UrlEntry, 'id'>>) => {
    setUrls((prev) =>
      prev.map((u) => {
        if (u.id !== id) return u
        return { ...u, ...patch }
      }),
    )
  }

  // Mutually exclusive reference toggle: set one, unset all others
  const setReference = (id: number) => {
    setUrls((prev) =>
      prev.map((u) => ({ ...u, isReference: u.id === id })),
    )
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()

    // Client-side validation
    if (!name.trim()) {
      toast.error('Le nom du benchmark est requis')
      return
    }
    if (urls.length < 2) {
      toast.error('Au minimum 2 URLs sont requises')
      return
    }
    const emptyUrl = urls.find((u) => !u.url.trim() || !u.label.trim())
    if (emptyUrl) {
      toast.error('Chaque URL doit avoir une adresse et un label')
      return
    }
    const refCount = urls.filter((u) => u.isReference).length
    if (refCount !== 1) {
      toast.error('Exactement 1 URL doit être marquée comme référence')
      return
    }
    const labels = urls.map((u) => u.label.trim())
    if (new Set(labels).size !== labels.length) {
      toast.error('Les labels des URLs doivent être uniques')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        name: name.trim(),
        mode,
        urls: urls.map((u) => ({
          url: u.url.trim(),
          label: u.label.trim(),
          isReference: u.isReference,
        })),
      }

      const res = await authFetch('/api/benchmarks', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Erreur serveur' }))
        toast.error(body.error ?? 'Impossible de créer le benchmark')
        return
      }

      const { benchmarkId } = await res.json()
      toast.success('Benchmark lancé')
      router.push(`/dashboard/benchmarks/${benchmarkId}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur réseau')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Benchmarks', href: '/dashboard/benchmarks' },
          { label: 'Nouveau' },
        ]}
      />
      <PageHeader
        title="Nouveau benchmark"
        description="Comparez plusieurs sites sur les mêmes phases d'audit."
      />

      <section className="p-4 md:p-6 max-w-2xl">
        <form onSubmit={onSubmit} className="card-premium space-y-6">
          {/* Nom du benchmark */}
          <div>
            <label
              htmlFor="benchmark-name"
              className="block text-xs font-medium mb-1 font-[family-name:var(--font-display)]"
              style={{ color: 'var(--color-text)' }}
            >
              Nom du benchmark
            </label>
            <input
              id="benchmark-name"
              type="text"
              required
              placeholder="ex : Comparatif concurrents Q2 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-modern"
            />
          </div>

          {/* Mode */}
          <div>
            <div
              className="text-xs font-medium mb-2 font-[family-name:var(--font-display)]"
              style={{ color: 'var(--color-text)' }}
            >
              Mode d&apos;analyse
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(['flash', 'full'] as BenchmarkMode[]).map((m) => {
                const info = MODE_INFO[m]
                const selected = mode === m
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className="rounded-xl p-4 text-left transition-colors"
                    style={{
                      background: selected
                        ? 'color-mix(in srgb, var(--color-accent) 8%, var(--color-surface))'
                        : 'var(--color-bg)',
                      border: `1px solid ${selected ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    }}
                  >
                    <div
                      className="font-[family-name:var(--font-display)] font-semibold text-[13px]"
                      style={{ color: 'var(--color-text)' }}
                    >
                      {info.label}
                    </div>
                    <div
                      className="mt-1 text-[11px] font-[family-name:var(--font-sans)]"
                      style={{ color: 'var(--color-muted)' }}
                    >
                      {info.description}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* URLs */}
          <div>
            <div
              className="text-xs font-medium mb-2 font-[family-name:var(--font-display)]"
              style={{ color: 'var(--color-text)' }}
            >
              URLs à comparer
              <span
                className="ml-2 font-normal"
                style={{ color: 'var(--color-muted)' }}
              >
                (min. 2, max. 5)
              </span>
            </div>

            <div className="space-y-3">
              {urls.map((entry, index) => (
                <div
                  key={entry.id}
                  className="rounded-lg p-4 space-y-3"
                  style={{
                    background: entry.isReference
                      ? 'color-mix(in srgb, var(--color-accent) 5%, var(--color-bg))'
                      : 'var(--color-bg)',
                    border: `1px solid ${entry.isReference ? 'color-mix(in srgb, var(--color-accent) 30%, transparent)' : 'var(--color-border)'}`,
                  }}
                >
                  {/* Header de la ligne */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="text-[11px] font-[family-name:var(--font-display)] font-semibold uppercase tracking-wider"
                      style={{ color: entry.isReference ? 'var(--color-accent)' : 'var(--color-muted)' }}
                    >
                      {entry.isReference ? 'Site de référence' : `URL ${index + 1}`}
                    </span>
                    <div className="flex items-center gap-2">
                      {/* Toggle référence */}
                      <button
                        type="button"
                        onClick={() => setReference(entry.id)}
                        aria-label={
                          entry.isReference
                            ? 'Site de référence (actif)'
                            : `Définir comme site de référence`
                        }
                        className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded transition-colors"
                        style={{
                          color: entry.isReference ? 'var(--color-accent)' : 'var(--color-muted)',
                          background: entry.isReference
                            ? 'color-mix(in srgb, var(--color-accent) 12%, transparent)'
                            : 'transparent',
                          border: `1px solid ${entry.isReference ? 'color-mix(in srgb, var(--color-accent) 30%, transparent)' : 'var(--color-border)'}`,
                        }}
                      >
                        <Star
                          size={11}
                          fill={entry.isReference ? 'currentColor' : 'none'}
                          aria-hidden="true"
                        />
                        Référence
                      </button>

                      {/* Supprimer */}
                      {canRemove && (
                        <button
                          type="button"
                          onClick={() => removeUrl(entry.id)}
                          aria-label={`Supprimer l'URL ${index + 1}`}
                          className="inline-flex items-center justify-center rounded p-1 transition-colors"
                          style={{
                            color: 'var(--color-muted)',
                            minWidth: 28,
                            minHeight: 28,
                          }}
                        >
                          <Trash2 size={13} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* URL + Label */}
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
                    <div>
                      <label
                        htmlFor={`url-${entry.id}`}
                        className="block text-[11px] mb-1 font-[family-name:var(--font-display)]"
                        style={{ color: 'var(--color-muted)' }}
                      >
                        URL
                      </label>
                      <input
                        id={`url-${entry.id}`}
                        type="url"
                        required
                        placeholder="https://exemple.com"
                        value={entry.url}
                        onChange={(e) => updateUrl(entry.id, { url: e.target.value })}
                        className="input-modern"
                      />
                    </div>
                    <div className="sm:w-44">
                      <label
                        htmlFor={`label-${entry.id}`}
                        className="block text-[11px] mb-1 font-[family-name:var(--font-display)]"
                        style={{ color: 'var(--color-muted)' }}
                      >
                        Label
                      </label>
                      <input
                        id={`label-${entry.id}`}
                        type="text"
                        required
                        placeholder="Mon site"
                        value={entry.label}
                        onChange={(e) => updateUrl(entry.id, { label: e.target.value })}
                        className="input-modern"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Ajouter une URL */}
            {canAdd && (
              <button
                type="button"
                onClick={addUrl}
                className="mt-3 inline-flex items-center gap-2 text-sm transition-colors font-[family-name:var(--font-sans)]"
                style={{ color: 'var(--color-accent)' }}
              >
                <Plus size={14} aria-hidden="true" />
                Ajouter une URL
              </button>
            )}
            {!canAdd && (
              <p
                className="mt-2 text-[11px] font-[family-name:var(--font-sans)]"
                style={{ color: 'var(--color-muted)' }}
              >
                Maximum 5 URLs atteint.
              </p>
            )}
          </div>

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Lancement…' : 'Lancer le benchmark'}
          </button>
        </form>
      </section>
    </div>
  )
}
