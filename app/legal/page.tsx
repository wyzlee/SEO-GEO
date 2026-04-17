import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Informations légales',
  description: 'Mentions légales, CGU, politique de confidentialité et DPA.',
}

export default function LegalIndexPage() {
  return (
    <article className="space-y-6 font-[family-name:var(--font-sans)]">
      <header>
        <h1 className="text-3xl font-[family-name:var(--font-display)] font-semibold mb-2">
          Informations légales
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          L&apos;ensemble des documents légaux régissant l&apos;usage de la
          Plateforme.
        </p>
      </header>

      <div className="grid gap-3">
        <LegalLink
          href="/legal/mentions"
          title="Mentions légales"
          description="Éditeur, hébergement, propriété intellectuelle."
        />
        <LegalLink
          href="/legal/cgu"
          title="Conditions générales d'utilisation"
          description="Règles d'accès au service, obligations, limitation de responsabilité."
        />
        <LegalLink
          href="/legal/privacy"
          title="Politique de confidentialité"
          description="Données collectées, RGPD, durée de conservation, droits d'accès."
        />
        <LegalLink
          href="/legal/dpa"
          title="Accord de traitement des données (DPA)"
          description="Cadre B2B pour les clients en tant que responsables de traitement."
        />
      </div>
    </article>
  )
}

function LegalLink({
  href,
  title,
  description,
}: {
  href: string
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="block p-4 rounded-md transition-colors"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div className="font-[family-name:var(--font-display)] font-semibold">
        {title}
      </div>
      <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
        {description}
      </p>
    </Link>
  )
}
