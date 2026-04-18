'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/header'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { useCreateScheduledAudit } from '@/lib/hooks/use-scheduled-audits'

type Frequency = 'daily' | 'weekly' | 'monthly'
type AuditMode = 'standard' | 'full'

export default function NewScheduledAuditPage() {
  const router = useRouter()
  const createSchedule = useCreateScheduledAudit()

  const [targetUrl, setTargetUrl] = useState('')
  const [frequency, setFrequency] = useState<Frequency>('weekly')
  const [mode, setMode] = useState<AuditMode>('standard')

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await createSchedule.mutateAsync({ targetUrl, frequency, mode })
      toast.success('Planification créée')
      router.push('/dashboard/audits/schedule')
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Impossible de créer la planification',
      )
    }
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Audits', href: '/dashboard/audits' },
          { label: 'Planification', href: '/dashboard/audits/schedule' },
          { label: 'Nouveau' },
        ]}
      />
      <PageHeader
        title="Planifier un audit"
        description="Configurez un audit récurrent automatique."
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
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              className="input-modern"
              maxLength={2048}
            />
          </div>

          <div>
            <div className="text-xs font-medium mb-2 font-[family-name:var(--font-display)]">
              Fréquence
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { key: 'daily' as Frequency, label: 'Quotidien' },
                  { key: 'weekly' as Frequency, label: 'Hebdomadaire' },
                  { key: 'monthly' as Frequency, label: 'Mensuel' },
                ] as const
              ).map(({ key, label }) => {
                const selected = frequency === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFrequency(key)}
                    className="rounded-xl p-3 text-center text-sm transition-colors font-[family-name:var(--font-display)]"
                    style={{
                      background: selected
                        ? 'color-mix(in srgb, var(--color-accent) 8%, var(--color-surface))'
                        : 'var(--color-bg)',
                      border: `1px solid ${selected ? 'var(--color-accent)' : 'var(--color-border)'}`,
                      color: selected
                        ? 'var(--color-text)'
                        : 'var(--color-muted)',
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium mb-2 font-[family-name:var(--font-display)]">
              Mode d&apos;analyse
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  {
                    key: 'standard' as AuditMode,
                    label: 'Standard',
                    desc: '7 phases · 3 sous-pages',
                  },
                  {
                    key: 'full' as AuditMode,
                    label: 'Complet',
                    desc: '11 phases · 20 sous-pages',
                  },
                ] as const
              ).map(({ key, label, desc }) => {
                const selected = mode === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMode(key)}
                    className="rounded-xl p-4 text-left transition-colors"
                    style={{
                      background: selected
                        ? 'color-mix(in srgb, var(--color-accent) 8%, var(--color-surface))'
                        : 'var(--color-bg)',
                      border: `1px solid ${selected ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    }}
                  >
                    <div className="font-[family-name:var(--font-display)] font-semibold text-[13px]">
                      {label}
                    </div>
                    <div
                      className="mt-1 text-[11px] font-[family-name:var(--font-sans)]"
                      style={{ color: 'var(--color-muted)' }}
                    >
                      {desc}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={createSchedule.isPending}
          >
            {createSchedule.isPending ? 'Création…' : 'Créer la planification'}
          </button>
        </form>
      </section>
    </div>
  )
}
