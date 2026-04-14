'use client'

import { FormEvent, useState } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/header'

export default function NewAuditPage() {
  const [url, setUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    toast.info(
      'Endpoint audit à brancher (Sprint 03). Pour l\'instant, simulation.',
    )
    await new Promise((r) => setTimeout(r, 500))
    setSubmitting(false)
  }

  return (
    <div>
      <PageHeader
        title="Nouvel audit"
        description="Renseignez l'URL du site à auditer."
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

          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Envoi…' : 'Lancer l\'audit'}
          </button>
        </form>
      </section>
    </div>
  )
}
