'use client'

import { FormEvent, useRef, useState, DragEvent } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Upload, Globe, Github } from 'lucide-react'
import { PageHeader } from '@/components/layout/header'
import { useCreateAudit, useUploadCode } from '@/lib/hooks/use-audits'
import { useOrganization } from '@/lib/hooks/use-organization'

type InputMode = 'url' | 'zip' | 'github'
type AuditMode = 'full' | 'standard'

const MODE_INFO: Record<AuditMode, { label: string; description: string; phases: string; subpages: string }> = {
  full: {
    label: 'Analyse complète',
    description: '11 phases · jusqu\'à 20 sous-pages',
    phases: '11 phases',
    subpages: '20 sous-pages',
  },
  standard: {
    label: 'Analyse standard',
    description: '7 phases · jusqu\'à 3 sous-pages',
    phases: '7 phases',
    subpages: '3 sous-pages',
  },
}

function isPro(plan: string) {
  return plan === 'pro' || plan === 'agency'
}

export default function NewAuditPage() {
  const router = useRouter()
  const createAudit = useCreateAudit()
  const uploadCode = useUploadCode()
  const { data: org } = useOrganization()

  const [inputMode, setInputMode] = useState<InputMode>('url')
  const [auditMode, setAuditMode] = useState<AuditMode>('full')
  const [url, setUrl] = useState('')
  const [githubRepo, setGithubRepo] = useState('')
  const [clientName, setClientName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const plan = org?.plan ?? 'free'
  const canChooseMode = isPro(plan)
  // Free plan is always forced to standard server-side; reflect that in UI
  const effectiveMode: AuditMode = canChooseMode ? auditMode : 'standard'

  const handleDrag = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
    if (e.type === 'dragleave') setDragActive(false)
  }

  const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const f = e.dataTransfer.files?.[0]
    if (f) setFile(f)
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    try {
      let uploadPath: string | undefined
      if (inputMode === 'zip') {
        if (!file) {
          toast.error('Sélectionner un fichier .zip')
          return
        }
        const upload = await uploadCode.mutateAsync(file)
        uploadPath = upload.uploadPath
        toast.success(
          `Archive extraite (${upload.fileCount} fichier${upload.fileCount > 1 ? 's' : ''})`,
        )
      }

      const base = { clientName: clientName || undefined, mode: effectiveMode }
      const payload =
        inputMode === 'url'
          ? { targetUrl: url, ...base }
          : inputMode === 'github'
            ? { githubRepo, ...base }
            : { uploadPath, ...base }

      const { id } = await createAudit.mutateAsync(payload)
      toast.success('Audit lancé')
      router.push(`/dashboard/audits/${id}`)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Impossible de lancer l\'audit',
      )
    }
  }

  const isSubmitting = createAudit.isPending || uploadCode.isPending

  return (
    <div>
      <PageHeader
        title="Nouvel audit"
        description="URL, archive .zip de code source, ou dépôt GitHub public."
      />

      <section className="p-6 max-w-2xl">
        {/* Input mode tabs */}
        <div
          className="flex gap-2 mb-5 p-1 rounded-lg"
          style={{
            background: 'var(--color-bgAlt)',
            border: '1px solid var(--color-border)',
          }}
        >
          {([
            { key: 'url' as InputMode, label: 'URL', icon: Globe },
            { key: 'zip' as InputMode, label: 'Upload code', icon: Upload },
            { key: 'github' as InputMode, label: 'GitHub', icon: Github },
          ]).map((tab) => {
            const Icon = tab.icon
            const active = inputMode === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setInputMode(tab.key)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-[family-name:var(--font-display)] transition-colors"
                style={{
                  background: active ? 'var(--color-surface)' : 'transparent',
                  color: active ? 'var(--color-text)' : 'var(--color-muted)',
                  boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            )
          })}
        </div>

        <form onSubmit={onSubmit} className="card-premium space-y-5">
          {/* URL input */}
          {inputMode === 'url' && (
            <div>
              <label
                htmlFor="target-url"
                className="block text-xs font-medium mb-1 font-[family-name:var(--font-display)]"
              >
                URL à auditer
              </label>
              <input
                id="target-url"
                type="url"
                required
                placeholder="https://"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="input-modern"
              />
              <p
                className="mt-1 text-xs font-[family-name:var(--font-sans)]"
                style={{ color: 'var(--color-muted)' }}
              >
                Crawl live du site, phases selon le mode sélectionné.
              </p>
            </div>
          )}

          {/* ZIP input */}
          {inputMode === 'zip' && (
            <div>
              <label
                htmlFor="zip-file"
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 cursor-pointer transition-colors"
                style={{
                  borderColor: dragActive
                    ? 'var(--color-accent)'
                    : 'var(--color-border)',
                  background: dragActive
                    ? 'rgba(79, 70, 229, 0.05)'
                    : 'transparent',
                }}
              >
                <Upload size={32} style={{ color: 'var(--color-muted)' }} />
                <div className="text-center">
                  <div className="font-[family-name:var(--font-display)] font-semibold text-[14px]">
                    {file ? file.name : 'Déposer une archive .zip ici'}
                  </div>
                  <p
                    className="text-[12px] mt-1 font-[family-name:var(--font-sans)]"
                    style={{ color: 'var(--color-muted)' }}
                  >
                    {file
                      ? `${Math.round(file.size / 1024)} Ko`
                      : 'ou cliquer pour parcourir · max 50 Mo'}
                  </p>
                </div>
                <input
                  id="zip-file"
                  ref={inputRef}
                  type="file"
                  accept=".zip,application/zip,application/x-zip-compressed"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="hidden"
                />
              </label>
              <p
                className="mt-2 text-xs font-[family-name:var(--font-sans)]"
                style={{ color: 'var(--color-muted)' }}
              >
                Framework détecté automatiquement. Phases disponibles en mode code V1 :
                Technique, Données structurées, GEO.
              </p>
            </div>
          )}

          {/* GitHub input */}
          {inputMode === 'github' && (
            <div>
              <label
                htmlFor="github-repo"
                className="block text-xs font-medium mb-1 font-[family-name:var(--font-display)]"
              >
                Dépôt GitHub public
              </label>
              <input
                id="github-repo"
                type="text"
                required
                placeholder="owner/repo ou owner/repo@branche"
                value={githubRepo}
                onChange={(e) => setGithubRepo(e.target.value)}
                className="input-modern"
              />
              <p
                className="mt-1 text-xs font-[family-name:var(--font-sans)]"
                style={{ color: 'var(--color-muted)' }}
              >
                Clone shallow (--depth 1). V1 : dépôts publics uniquement.
              </p>
            </div>
          )}

          {/* Audit mode selector */}
          <div>
            <div className="text-xs font-medium mb-2 font-[family-name:var(--font-display)]">
              Mode d&apos;analyse
            </div>
            {canChooseMode ? (
              <div className="grid grid-cols-2 gap-2">
                {(['full', 'standard'] as AuditMode[]).map((m) => {
                  const info = MODE_INFO[m]
                  const selected = auditMode === m
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setAuditMode(m)}
                      className="rounded-xl p-4 text-left transition-colors"
                      style={{
                        background: selected
                          ? 'color-mix(in srgb, var(--color-accent) 8%, var(--color-surface))'
                          : 'var(--color-bg)',
                        border: `1px solid ${selected ? 'var(--color-accent)' : 'var(--color-border)'}`,
                      }}
                    >
                      <div className="font-[family-name:var(--font-display)] font-semibold text-[13px]">
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
            ) : (
              <div
                className="rounded-xl p-4 flex items-start gap-3"
                style={{
                  background: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div className="flex-1">
                  <div className="font-[family-name:var(--font-display)] font-semibold text-[13px]">
                    {MODE_INFO.standard.label}
                  </div>
                  <div
                    className="mt-1 text-[11px] font-[family-name:var(--font-sans)]"
                    style={{ color: 'var(--color-muted)' }}
                  >
                    {MODE_INFO.standard.description}
                  </div>
                </div>
                <span
                  className="text-[10px] font-[family-name:var(--font-display)] font-semibold px-2 py-1 rounded-full shrink-0"
                  style={{
                    background: 'color-mix(in srgb, var(--color-muted) 15%, transparent)',
                    color: 'var(--color-muted)',
                  }}
                >
                  Plan Free
                </span>
              </div>
            )}
            {!canChooseMode && (
              <p
                className="mt-2 text-[11px] font-[family-name:var(--font-sans)]"
                style={{ color: 'var(--color-muted)' }}
              >
                L&apos;analyse complète (11 phases) est disponible avec le plan Pro.{' '}
                <a
                  href="mailto:contact@wyzlee.com?subject=Upgrade%20Pro%20SEO-GEO"
                  style={{ color: 'var(--color-accent)' }}
                >
                  Contacter l&apos;équipe
                </a>
              </p>
            )}
          </div>

          {/* Client name */}
          <div>
            <label
              htmlFor="client-name"
              className="block text-xs font-medium mb-1 font-[family-name:var(--font-display)]"
            >
              Nom du client (optionnel)
            </label>
            <input
              id="client-name"
              type="text"
              placeholder="ex : Acme SA"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="input-modern"
            />
          </div>

          <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
            {isSubmitting
              ? 'Envoi…'
              : `Lancer l'audit ${effectiveMode === 'full' ? 'complet' : 'standard'}`}
          </button>
        </form>
      </section>
    </div>
  )
}
