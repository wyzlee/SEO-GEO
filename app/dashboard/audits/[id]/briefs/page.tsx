'use client'

import { use, useState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, Copy, ChevronDown, ChevronRight, FileText } from 'lucide-react'
import { PageHeader } from '@/components/layout/header'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { authFetch, apiJson } from '@/lib/api/fetch'

// ---------------------------------------------------------------------------
// Types (mirrors schema contentBriefs)
// ---------------------------------------------------------------------------

type SearchIntent = 'informational' | 'commercial' | 'navigational'
type ContentType = 'pillar' | 'cluster' | 'update'

interface BriefOutline {
  h2: string[]
  h3_per_h2: string[][]
}

interface ContentBrief {
  id: string
  auditId: string
  title: string
  targetKeyword: string
  searchIntent: SearchIntent
  contentType: ContentType
  wordCountTarget: number
  outline: BriefOutline
  eeatAngle: string | null
  semanticKeywords: string[]
  briefMd: string
  createdAt: string
}

interface BriefsResponse {
  briefs: ContentBrief[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const INTENT_LABELS: Record<SearchIntent, string> = {
  informational: 'Informatif',
  commercial: 'Commercial',
  navigational: 'Navigationnel',
}

const INTENT_COLORS: Record<SearchIntent, string> = {
  informational: 'var(--color-blue)',
  commercial: 'var(--color-green)',
  navigational: 'var(--color-amber)',
}

const TYPE_LABELS: Record<ContentType, string> = {
  pillar: 'Pilier',
  cluster: 'Cluster',
  update: 'Mise à jour',
}

const TYPE_COLORS: Record<ContentType, string> = {
  pillar: 'var(--color-accent)',
  cluster: 'var(--color-blue)',
  update: 'var(--color-amber)',
}

async function copyToClipboard(text: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(text)
    return
  }
  // Fallback for environments without clipboard API
  const el = document.createElement('textarea')
  el.value = text
  el.style.position = 'fixed'
  el.style.opacity = '0'
  document.body.appendChild(el)
  el.focus()
  el.select()
  document.execCommand('copy')
  document.body.removeChild(el)
}

// ---------------------------------------------------------------------------
// BriefCard — expandable card per brief
// ---------------------------------------------------------------------------

function BriefCard({ brief }: { brief: ContentBrief }) {
  const [expanded, setExpanded] = useState(false)
  const [isCopying, setIsCopying] = useState(false)

  const onCopy = async () => {
    setIsCopying(true)
    try {
      await copyToClipboard(brief.briefMd)
      toast.success('Brief copié dans le presse-papiers')
    } catch {
      toast.error('Impossible de copier — copiez manuellement depuis la section dépliée')
    } finally {
      setIsCopying(false)
    }
  }

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-3 px-4 py-4">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-0.5 shrink-0"
          aria-expanded={expanded}
          aria-label={expanded ? 'Replier ce brief' : 'Déplier ce brief'}
          style={{ color: 'var(--color-muted)' }}
        >
          {expanded ? <ChevronDown size={18} aria-hidden="true" /> : <ChevronRight size={18} aria-hidden="true" />}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-start flex-wrap gap-2 mb-1">
            {/* Intent badge */}
            <span
              className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full font-[family-name:var(--font-display)] font-semibold"
              style={{
                background: `color-mix(in srgb, ${INTENT_COLORS[brief.searchIntent]} 12%, transparent)`,
                color: INTENT_COLORS[brief.searchIntent],
              }}
            >
              {INTENT_LABELS[brief.searchIntent]}
            </span>
            {/* Type badge */}
            <span
              className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full font-[family-name:var(--font-display)] font-semibold"
              style={{
                background: `color-mix(in srgb, ${TYPE_COLORS[brief.contentType]} 12%, transparent)`,
                color: TYPE_COLORS[brief.contentType],
              }}
            >
              {TYPE_LABELS[brief.contentType]}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-left w-full"
          >
            <span
              className="block font-[family-name:var(--font-display)] font-semibold text-[15px] leading-snug"
              style={{ color: 'var(--color-text)' }}
            >
              {brief.title}
            </span>
            <span
              className="block text-[12px] mt-0.5 font-[family-name:var(--font-sans)]"
              style={{ color: 'var(--color-muted)' }}
            >
              Mot-clé cible : <strong style={{ color: 'var(--color-text)' }}>{brief.targetKeyword}</strong>
              {' · '}
              {brief.wordCountTarget.toLocaleString('fr-FR')} mots cible
            </span>
          </button>
        </div>

        {/* Copy button */}
        <button
          type="button"
          onClick={onCopy}
          disabled={isCopying}
          aria-label="Copier le brief en Markdown"
          className="shrink-0 inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded transition-colors font-[family-name:var(--font-sans)]"
          style={{
            color: 'var(--color-accent)',
            border: '1px solid color-mix(in srgb, var(--color-accent) 30%, transparent)',
            background: 'color-mix(in srgb, var(--color-accent) 6%, transparent)',
            minHeight: 32,
          }}
        >
          <Copy size={12} aria-hidden="true" />
          {isCopying ? 'Copie…' : 'Copier'}
        </button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div
          className="px-5 pb-5 pt-2 space-y-4"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          {/* Plan H2/H3 */}
          {brief.outline.h2.length > 0 && (
            <div>
              <h3
                className="text-[11px] uppercase tracking-wider font-[family-name:var(--font-display)] mb-2"
                style={{ color: 'var(--color-muted)' }}
              >
                Plan éditorial
              </h3>
              <ol className="space-y-2">
                {brief.outline.h2.map((h2, i) => (
                  <li key={i}>
                    <div
                      className="font-[family-name:var(--font-display)] font-semibold text-[13px]"
                      style={{ color: 'var(--color-text)' }}
                    >
                      {i + 1}. {h2}
                    </div>
                    {brief.outline.h3_per_h2?.[i]?.length > 0 && (
                      <ul className="mt-1 ml-4 space-y-0.5">
                        {brief.outline.h3_per_h2[i].map((h3, j) => (
                          <li
                            key={j}
                            className="text-[12px] font-[family-name:var(--font-sans)]"
                            style={{ color: 'var(--color-muted)' }}
                          >
                            • {h3}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Mots-clés sémantiques */}
          {brief.semanticKeywords.length > 0 && (
            <div>
              <h3
                className="text-[11px] uppercase tracking-wider font-[family-name:var(--font-display)] mb-2"
                style={{ color: 'var(--color-muted)' }}
              >
                Mots-clés sémantiques
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {brief.semanticKeywords.map((kw, i) => (
                  <span
                    key={i}
                    className="text-[11px] px-2 py-0.5 rounded font-[family-name:var(--font-sans)]"
                    style={{
                      background: 'var(--color-bgAlt)',
                      color: 'var(--color-muted)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Angle E-E-A-T */}
          {brief.eeatAngle && (
            <div>
              <h3
                className="text-[11px] uppercase tracking-wider font-[family-name:var(--font-display)] mb-1"
                style={{ color: 'var(--color-muted)' }}
              >
                Angle E-E-A-T
              </h3>
              <p
                className="text-[13px] font-[family-name:var(--font-sans)]"
                style={{ color: 'var(--color-text)' }}
              >
                {brief.eeatAngle}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AuditBriefsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [briefs, setBriefs] = useState<ContentBrief[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadBriefs = async () => {
    try {
      const res = await apiJson<BriefsResponse>(`/api/audits/${id}/briefs`)
      setBriefs(res.briefs ?? [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    }
  }

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    apiJson<BriefsResponse>(`/api/audits/${id}/briefs`)
      .then((res) => {
        if (!cancelled) {
          setBriefs(res.briefs ?? [])
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
  }, [id])

  const onGenerate = async () => {
    setIsGenerating(true)
    try {
      const res = await authFetch(`/api/audits/${id}/briefs`, { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Erreur serveur' }))
        toast.error(body.error ?? 'Impossible de générer les briefs')
        return
      }
      toast.success('Briefs générés')
      await loadBriefs()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur réseau')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Audits', href: '/dashboard/audits' },
          { label: id.slice(0, 8), href: `/dashboard/audits/${id}` },
          { label: 'Briefs de contenu' },
        ]}
      />
      <PageHeader
        title="Briefs de contenu"
        description="Briefs éditoriaux générés depuis les constats de l'audit."
        actions={
          <Link
            href={`/dashboard/audits/${id}`}
            className="btn-secondary inline-flex items-center gap-2"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            Retour à l&apos;audit
          </Link>
        }
      />

      <section className="p-4 md:p-6 space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 rounded-lg animate-pulse"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
              />
            ))}
          </div>
        ) : error ? (
          <div className="card-premium">
            <p
              className="text-sm font-[family-name:var(--font-sans)]"
              style={{ color: 'var(--color-red)' }}
            >
              {error}
            </p>
          </div>
        ) : briefs.length === 0 ? (
          <div className="card-premium text-center py-16">
            <FileText
              size={40}
              className="mx-auto mb-4"
              style={{ color: 'var(--color-muted)' }}
              aria-hidden="true"
            />
            <h2
              className="text-xl font-semibold font-[family-name:var(--font-display)]"
              style={{ color: 'var(--color-text)' }}
            >
              Aucun brief généré
            </h2>
            <p
              className="mt-2 text-sm max-w-md mx-auto font-[family-name:var(--font-sans)]"
              style={{ color: 'var(--color-muted)' }}
            >
              Générez des briefs éditoriaux à partir des constats et des
              opportunités identifiées lors de l&apos;audit SEO/GEO.
            </p>
            <button
              type="button"
              onClick={onGenerate}
              disabled={isGenerating}
              className="btn-primary mt-6 inline-flex"
            >
              {isGenerating ? 'Génération en cours…' : 'Générer les briefs'}
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <p
                className="text-sm font-[family-name:var(--font-sans)]"
                style={{ color: 'var(--color-muted)' }}
              >
                {briefs.length} brief{briefs.length > 1 ? 's' : ''} généré{briefs.length > 1 ? 's' : ''}
              </p>
              <button
                type="button"
                onClick={onGenerate}
                disabled={isGenerating}
                className="btn-secondary text-sm"
              >
                {isGenerating ? 'Régénération…' : 'Régénérer les briefs'}
              </button>
            </div>
            <div className="space-y-3">
              {briefs.map((brief) => (
                <BriefCard key={brief.id} brief={brief} />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
