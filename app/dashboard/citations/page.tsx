'use client'

import { FormEvent, useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/header'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { authFetch, apiJson } from '@/lib/api/fetch'

// ---------------------------------------------------------------------------
// Types (mirrors schema citationChecks)
// ---------------------------------------------------------------------------

type CitationTool = 'perplexity' | 'openai'

interface CitationCheck {
  id: string
  domain: string
  query: string
  tool: CitationTool
  isCited: boolean
  competitorDomainsCited: string[]
  checkedAt: string
}

interface CitationsResponse {
  checks: CitationCheck[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TOOL_LABELS: Record<CitationTool, string> = {
  perplexity: 'Perplexity',
  openai: 'OpenAI',
}

const ALL_TOOLS: CitationTool[] = ['perplexity', 'openai']

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CitationsPage() {
  const [domain, setDomain] = useState('')
  const [queriesRaw, setQueriesRaw] = useState('')
  const [selectedTools, setSelectedTools] = useState<CitationTool[]>(['perplexity'])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [checks, setChecks] = useState<CitationCheck[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [historyError, setHistoryError] = useState<string | null>(null)

  // Load history on mount
  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    apiJson<CitationsResponse>('/api/citations')
      .then((res) => {
        if (!cancelled) {
          setChecks(res.checks ?? [])
          setHistoryError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setHistoryError(err instanceof Error ? err.message : 'Erreur de chargement')
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const toggleTool = (tool: CitationTool) => {
    setSelectedTools((prev) =>
      prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool],
    )
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()

    const trimmedDomain = domain.trim()
    if (!trimmedDomain) {
      toast.error('Le domaine est requis')
      return
    }

    const queries = queriesRaw
      .split('\n')
      .map((q) => q.trim())
      .filter(Boolean)

    if (queries.length === 0) {
      toast.error('Saisissez au moins une requête')
      return
    }
    if (queries.length > 5) {
      toast.error('Maximum 5 requêtes par vérification')
      return
    }
    if (selectedTools.length === 0) {
      toast.error('Sélectionnez au moins un outil')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await authFetch('/api/citations', {
        method: 'POST',
        body: JSON.stringify({
          domain: trimmedDomain,
          queries,
          tools: selectedTools,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Erreur serveur' }))
        toast.error(body.error ?? 'Impossible de lancer la vérification')
        return
      }

      const result = await res.json().catch(() => null)
      const newChecks: CitationCheck[] = result?.checks ?? []

      toast.success('Vérification effectuée')
      setChecks((prev) => [...newChecks, ...prev])
      setDomain('')
      setQueriesRaw('')
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
          { label: 'Citations IA' },
        ]}
      />
      <PageHeader
        title="Citations IA"
        description="Vérifiez si votre domaine est cité par les moteurs génératifs (Perplexity, OpenAI)."
      />

      <section className="p-4 md:p-6 space-y-8 max-w-3xl">
        {/* ---------------------------------------------------------------- */}
        {/* Formulaire de vérification                                       */}
        {/* ---------------------------------------------------------------- */}
        <div className="card-premium space-y-5">
          <h2
            className="text-sm uppercase tracking-wider font-[family-name:var(--font-display)]"
            style={{ color: 'var(--color-muted)' }}
          >
            Lancer une vérification
          </h2>

          <form onSubmit={onSubmit} className="space-y-4">
            {/* Domaine */}
            <div>
              <label
                htmlFor="citation-domain"
                className="block text-xs font-medium mb-1 font-[family-name:var(--font-display)]"
                style={{ color: 'var(--color-text)' }}
              >
                Domaine à monitorer
              </label>
              <input
                id="citation-domain"
                type="text"
                required
                placeholder="wyzlee.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="input-modern"
              />
              <p
                className="mt-1 text-[11px] font-[family-name:var(--font-sans)]"
                style={{ color: 'var(--color-muted)' }}
              >
                Sans le préfixe https://
              </p>
            </div>

            {/* Requêtes */}
            <div>
              <label
                htmlFor="citation-queries"
                className="block text-xs font-medium mb-1 font-[family-name:var(--font-display)]"
                style={{ color: 'var(--color-text)' }}
              >
                Requêtes à tester
                <span
                  className="ml-2 font-normal"
                  style={{ color: 'var(--color-muted)' }}
                >
                  (une par ligne, max. 5)
                </span>
              </label>
              <textarea
                id="citation-queries"
                required
                rows={4}
                placeholder={'meilleur outil SEO pour agences\ncomment auditer son site SEO\nGEO optimization 2026'}
                value={queriesRaw}
                onChange={(e) => setQueriesRaw(e.target.value)}
                className="input-modern resize-none"
              />
            </div>

            {/* Outils */}
            <div>
              <div
                className="text-xs font-medium mb-2 font-[family-name:var(--font-display)]"
                style={{ color: 'var(--color-text)' }}
              >
                Outils
              </div>
              <div className="flex gap-3">
                {ALL_TOOLS.map((tool) => {
                  const checked = selectedTools.includes(tool)
                  return (
                    <label
                      key={tool}
                      className="flex items-center gap-2 cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleTool(tool)}
                        className="rounded"
                        style={{ accentColor: 'var(--color-accent)' }}
                      />
                      <span
                        className="text-sm font-[family-name:var(--font-sans)]"
                        style={{ color: 'var(--color-text)' }}
                      >
                        {TOOL_LABELS[tool]}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Vérification…' : 'Vérifier'}
            </button>
          </form>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Historique                                                        */}
        {/* ---------------------------------------------------------------- */}
        <div>
          <h2
            className="text-sm uppercase tracking-wider font-[family-name:var(--font-display)] mb-4"
            style={{ color: 'var(--color-muted)' }}
          >
            Historique
          </h2>

          <div className="card-premium">
            {isLoading ? (
              <div className="space-y-3 py-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-10 rounded-md animate-pulse"
                    style={{ background: 'var(--color-bgAlt)' }}
                  />
                ))}
              </div>
            ) : historyError ? (
              <p
                className="text-sm py-6 text-center font-[family-name:var(--font-sans)]"
                style={{ color: 'var(--color-red)' }}
              >
                {historyError}
              </p>
            ) : checks.length === 0 ? (
              <div className="text-center py-12">
                <Sparkles
                  size={36}
                  className="mx-auto mb-3"
                  style={{ color: 'var(--color-muted)' }}
                  aria-hidden="true"
                />
                <p
                  className="text-sm font-[family-name:var(--font-sans)]"
                  style={{ color: 'var(--color-muted)' }}
                >
                  Vérifiez si votre site est cité par les IA génératives.
                  <br />
                  Les résultats s&apos;afficheront ici après chaque vérification.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
                <table className="w-full min-w-[640px] text-sm font-[family-name:var(--font-sans)]">
                  <thead>
                    <tr
                      className="text-left border-b"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <th className="pb-3 font-medium font-[family-name:var(--font-display)]">
                        Date
                      </th>
                      <th className="pb-3 font-medium font-[family-name:var(--font-display)]">
                        Domaine
                      </th>
                      <th className="pb-3 font-medium font-[family-name:var(--font-display)]">
                        Requête
                      </th>
                      <th className="pb-3 font-medium font-[family-name:var(--font-display)]">
                        Outil
                      </th>
                      <th className="pb-3 font-medium font-[family-name:var(--font-display)]">
                        Cité ?
                      </th>
                      <th className="pb-3 font-medium font-[family-name:var(--font-display)]">
                        Concurrents cités
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {checks.map((check) => (
                      <tr
                        key={check.id}
                        className="border-b"
                        style={{ borderColor: 'var(--color-border)' }}
                      >
                        <td
                          className="py-3 whitespace-nowrap"
                          style={{ color: 'var(--color-muted)' }}
                        >
                          {new Date(check.checkedAt).toLocaleString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td
                          className="py-3 font-medium"
                          style={{ color: 'var(--color-text)' }}
                        >
                          {check.domain}
                        </td>
                        <td
                          className="py-3 max-w-[200px] truncate"
                          style={{ color: 'var(--color-text)' }}
                          title={check.query}
                        >
                          {check.query}
                        </td>
                        <td className="py-3" style={{ color: 'var(--color-muted)' }}>
                          {TOOL_LABELS[check.tool]}
                        </td>
                        <td className="py-3">
                          <span
                            className="inline-flex items-center gap-1.5 text-xs font-[family-name:var(--font-display)]"
                            style={{
                              color: check.isCited
                                ? 'var(--color-green)'
                                : 'var(--color-red)',
                            }}
                          >
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{
                                background: check.isCited
                                  ? 'var(--color-green)'
                                  : 'var(--color-red)',
                              }}
                              aria-hidden="true"
                            />
                            {check.isCited ? 'Oui' : 'Non'}
                          </span>
                        </td>
                        <td
                          className="py-3 max-w-[200px]"
                          style={{ color: 'var(--color-muted)' }}
                        >
                          {check.competitorDomainsCited.length > 0
                            ? check.competitorDomainsCited.join(', ')
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
