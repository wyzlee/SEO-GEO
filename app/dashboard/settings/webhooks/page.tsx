'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Trash2, Copy } from 'lucide-react'
import { PageHeader } from '@/components/layout/header'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import {
  useCreateWebhook,
  useDeleteWebhook,
  useWebhooks,
  type WebhookRow,
} from '@/lib/hooks/use-webhooks'

export default function WebhooksPage() {
  const list = useWebhooks()
  const create = useCreateWebhook()
  const del = useDeleteWebhook()

  const [url, setUrl] = useState('')
  const [freshSecret, setFreshSecret] = useState<string | null>(null)

  const urlInvalid = url.trim().length > 0 && !/^https?:\/\//i.test(url)

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (urlInvalid || url.trim().length === 0) return
    create.mutate(
      { url: url.trim() },
      {
        onSuccess: (data) => {
          setFreshSecret(data.secret)
          setUrl('')
          toast.success('Webhook créé — copie le secret, il ne sera plus affiché.')
        },
        onError: (err) =>
          toast.error(
            err instanceof Error ? err.message : 'Échec de la création',
          ),
      },
    )
  }

  const onDelete = (id: string, urlLabel: string) => {
    if (!confirm(`Supprimer le webhook ${urlLabel} ?`)) return
    del.mutate(id, {
      onSuccess: () => toast.success('Webhook supprimé'),
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : 'Échec de la suppression'),
    })
  }

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success('Copié dans le presse-papiers')
    } catch {
      toast.error('Copie impossible — sélectionnez manuellement')
    }
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Paramètres', href: '/dashboard/settings' },
          { label: 'Webhooks' },
        ]}
      />
      <PageHeader
        title="Webhooks sortants"
        description="Branche un endpoint HTTPS qui recevra `audit.completed` à chaque audit terminé. Signature HMAC-SHA256 via en-tête X-SEOGEO-Signature."
      />

      <section className="p-6 space-y-6 max-w-3xl">
        {freshSecret ? (
          <div
            className="card-premium"
            style={{
              border: '1px solid var(--color-amber)',
              background: 'color-mix(in srgb, var(--color-amber) 8%, transparent)',
            }}
          >
            <h2
              className="font-[family-name:var(--font-display)] font-semibold"
              style={{ color: 'var(--color-amber)' }}
            >
              Secret HMAC — à copier maintenant
            </h2>
            <p
              className="mt-1 text-sm"
              style={{ color: 'var(--color-muted)' }}
            >
              Ce secret ne sera plus jamais affiché. Conserve-le dans ton CRM
              / n8n / Slack pour valider la signature à la réception.
            </p>
            <div className="mt-3 flex gap-2">
              <code
                className="flex-1 px-3 py-2 rounded text-xs break-all"
                style={{
                  background: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {freshSecret}
              </code>
              <button
                type="button"
                onClick={() => copy(freshSecret)}
                className="btn-secondary"
              >
                <Copy size={14} />
                Copier
              </button>
            </div>
            <button
              type="button"
              onClick={() => setFreshSecret(null)}
              className="mt-3 text-xs underline"
              style={{ color: 'var(--color-muted)' }}
            >
              J&apos;ai copié, fermer
            </button>
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="card-premium space-y-4">
          <h2 className="text-lg font-[family-name:var(--font-display)] font-semibold">
            Nouveau webhook
          </h2>
          <label className="block">
            <div className="text-sm font-[family-name:var(--font-display)] mb-1">
              URL HTTPS du receiver
            </div>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://crm.agence.com/webhooks/seo-geo"
              maxLength={500}
              className="w-full px-3 py-2 rounded-md text-sm font-[family-name:var(--font-sans)]"
              style={{
                background: 'var(--color-bg)',
                border: `1px solid ${urlInvalid ? 'var(--color-red)' : 'var(--color-border)'}`,
                color: 'var(--color-text)',
              }}
            />
            {urlInvalid ? (
              <p className="mt-1 text-xs" style={{ color: 'var(--color-red)' }}>
                URL doit commencer par http:// ou https://
              </p>
            ) : (
              <p className="mt-1 text-xs" style={{ color: 'var(--color-muted)' }}>
                Events souscrits V1 : <code>audit.completed</code>. Retry 3× avec
                back-off exponentiel.
              </p>
            )}
          </label>
          <button
            type="submit"
            disabled={create.isPending || urlInvalid || url.trim().length === 0}
            className="btn-primary"
          >
            {create.isPending ? 'Création…' : 'Créer le webhook'}
          </button>
        </form>

        <div className="card-premium">
          <h2 className="text-sm uppercase tracking-wider font-[family-name:var(--font-display)]"
            style={{ color: 'var(--color-muted)' }}>
            Webhooks actifs
          </h2>
          {list.isLoading ? (
            <p className="text-sm py-4 text-center" style={{ color: 'var(--color-muted)' }}>
              Chargement…
            </p>
          ) : (list.data?.webhooks ?? []).length === 0 ? (
            <p className="text-sm py-4 text-center" style={{ color: 'var(--color-muted)' }}>
              Aucun webhook configuré.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {list.data!.webhooks.map((w) => (
                <WebhookItem
                  key={w.id}
                  hook={w}
                  onDelete={() => onDelete(w.id, w.url)}
                />
              ))}
            </ul>
          )}
        </div>

        <details className="card-premium">
          <summary className="cursor-pointer font-[family-name:var(--font-display)] font-semibold">
            Format de la signature HMAC
          </summary>
          <div className="mt-3 space-y-2 text-sm font-[family-name:var(--font-sans)]">
            <p>
              Chaque requête porte un en-tête <code>X-SEOGEO-Signature:
              sha256=&lt;hex&gt;</code>.
            </p>
            <p>Côté receiver, ré-signe le body reçu avec ton secret :</p>
            <pre
              className="p-3 rounded text-xs overflow-x-auto"
              style={{
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
              }}
            >{`// Node.js
const crypto = require('crypto')
const expected = 'sha256=' + crypto
  .createHmac('sha256', SECRET)
  .update(rawBody)
  .digest('hex')
// comparaison en temps constant
crypto.timingSafeEqual(Buffer.from(req.headers['x-seogeo-signature']), Buffer.from(expected))`}</pre>
          </div>
        </details>
      </section>
    </div>
  )
}

function WebhookItem({
  hook,
  onDelete,
}: {
  hook: WebhookRow
  onDelete: () => void
}) {
  const status = hook.lastErrorAt && (!hook.lastSuccessAt || new Date(hook.lastErrorAt) > new Date(hook.lastSuccessAt))
    ? { label: 'En erreur', color: 'var(--color-red)' }
    : hook.lastSuccessAt
      ? { label: 'OK', color: 'var(--color-green)' }
      : { label: 'Jamais déclenché', color: 'var(--color-muted)' }

  return (
    <li
      className="flex items-center gap-3 py-2"
      style={{ borderBottom: '1px solid var(--color-border)' }}
    >
      <div className="flex-1 min-w-0">
        <div className="font-[family-name:var(--font-sans)] text-sm truncate">
          {hook.url}
        </div>
        <div className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
          Events : {hook.events} · Créé le{' '}
          {new Date(hook.createdAt).toLocaleDateString('fr-FR')}
          {hook.lastErrorMessage ? ` · ${hook.lastErrorMessage}` : ''}
        </div>
      </div>
      <span
        className="text-xs font-[family-name:var(--font-display)] font-semibold"
        style={{ color: status.color }}
      >
        {status.label}
      </span>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Supprimer webhook ${hook.url}`}
        className="text-xs px-2 py-1 rounded flex items-center gap-1"
        style={{
          color: 'var(--color-muted)',
          border: '1px solid var(--color-border)',
        }}
      >
        <Trash2 size={13} />
      </button>
    </li>
  )
}
