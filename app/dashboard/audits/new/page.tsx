'use client'

import { FormEvent, useRef, useState, DragEvent } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Upload, Globe, Github } from 'lucide-react'
import { PageHeader } from '@/components/layout/header'
import { useCreateAudit, useUploadCode } from '@/lib/hooks/use-audits'

type Mode = 'url' | 'zip' | 'github'

export default function NewAuditPage() {
  const router = useRouter()
  const createAudit = useCreateAudit()
  const uploadCode = useUploadCode()

  const [mode, setMode] = useState<Mode>('url')
  const [url, setUrl] = useState('')
  const [githubRepo, setGithubRepo] = useState('')
  const [clientName, setClientName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

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
      if (mode === 'zip') {
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

      const payload =
        mode === 'url'
          ? { targetUrl: url, clientName: clientName || undefined }
          : mode === 'github'
            ? { githubRepo, clientName: clientName || undefined }
            : { uploadPath, clientName: clientName || undefined }

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
        <div
          className="flex gap-2 mb-5 p-1 rounded-lg"
          style={{
            background: 'var(--color-bgAlt)',
            border: '1px solid var(--color-border)',
          }}
        >
          {([
            { key: 'url' as Mode, label: 'URL', icon: Globe },
            { key: 'zip' as Mode, label: 'Upload code', icon: Upload },
            { key: 'github' as Mode, label: 'GitHub', icon: Github },
          ]).map((tab) => {
            const Icon = tab.icon
            const active = mode === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setMode(tab.key)}
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
          {mode === 'url' && (
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
                Crawl live du site, 11 phases d&apos;analyse.
              </p>
            </div>
          )}

          {mode === 'zip' && (
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
                Framework détecté automatiquement (Next.js, Nuxt, Remix, Astro,
                React SPA, HTML statique). Phases disponibles en mode code V1 :
                Technique, Données structurées, GEO.
              </p>
            </div>
          )}

          {mode === 'github' && (
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

          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Envoi…' : 'Lancer l\'audit'}
          </button>
        </form>
      </section>
    </div>
  )
}
