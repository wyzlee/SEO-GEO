import { PageHeader } from '@/components/layout/header'

export default function SettingsPage() {
  return (
    <div>
      <PageHeader
        title="Paramètres"
        description="Organisation, membres, branding white-label, webhooks."
      />
      <section className="p-6">
        <div className="card-premium">
          <p
            className="text-sm"
            style={{ color: 'var(--color-muted)' }}
          >
            À brancher au Sprint 04+ (branding white-label, gestion des membres,
            tokens API).
          </p>
        </div>
      </section>
    </div>
  )
}
