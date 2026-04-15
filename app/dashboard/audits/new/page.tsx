'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/header'
import { useCreateAudit } from '@/lib/hooks/use-audits'

export default function NewAuditPage() {
  const router = useRouter()
  const createAudit = useCreateAudit()
  const [url, setUrl] = useState('')
  const [clientName, setClientName] = useState('')

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    try {
      const { id } = await createAudit.mutateAsync({
        targetUrl: url,
        clientName: clientName || undefined,
      })
      toast.success('Audit lancé')
      router.push(`/dashboard/audits/${id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Impossible de lancer l\'audit')
    }
  }

  return (
    <div>
      <PageHeader
        title="Nouvel audit"
        description="Renseignez l'URL à auditer. L'analyse démarre immédiatement."
      />

      <section className="p-6 max-w-xl">
        <form onSubmit={onSubmit} className="card-premium space-y-5">
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
              Format attendu : https://exemple.com
            </p>
          </div>

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
              placeholder="ex: Acme SA"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="input-modern"
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={createAudit.isPending}
          >
            {createAudit.isPending ? 'Envoi…' : 'Lancer l\'audit'}
          </button>
        </form>
      </section>
    </div>
  )
}
