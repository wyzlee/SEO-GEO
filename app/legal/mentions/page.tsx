import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Mentions légales',
  description: 'Mentions légales de la plateforme SEO-GEO de Wyzlee.',
}

export default function MentionsLegalesPage() {
  return (
    <article className="space-y-5 text-sm leading-relaxed font-[family-name:var(--font-sans)]">
      <header>
        <h1 className="text-3xl font-[family-name:var(--font-display)] font-semibold mb-2">
          Mentions légales
        </h1>
        <p style={{ color: 'var(--color-muted)' }}>
          Dernière mise à jour : 16 avril 2026
        </p>
      </header>

      <Section title="Éditeur du site">
        <p>
          Le site SEO-GEO (ci-après « la Plateforme ») est édité par{' '}
          <strong>Wyzlee</strong>, société par actions simplifiée.
        </p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 mt-3">
          <dt style={{ color: 'var(--color-muted)' }}>Dénomination</dt>
          <dd>Wyzlee SAS</dd>
          <dt style={{ color: 'var(--color-muted)' }}>Siège social</dt>
          <dd>À compléter — adresse du siège</dd>
          <dt style={{ color: 'var(--color-muted)' }}>RCS / SIREN</dt>
          <dd>À compléter</dd>
          <dt style={{ color: 'var(--color-muted)' }}>Capital social</dt>
          <dd>À compléter</dd>
          <dt style={{ color: 'var(--color-muted)' }}>TVA intracommunautaire</dt>
          <dd>À compléter</dd>
          <dt style={{ color: 'var(--color-muted)' }}>Directeur de la publication</dt>
          <dd>Olivier Podio</dd>
          <dt style={{ color: 'var(--color-muted)' }}>Contact</dt>
          <dd>
            <a href="mailto:contact@wyzlee.com">contact@wyzlee.com</a>
          </dd>
        </dl>
      </Section>

      <Section title="Hébergement">
        <p>
          La Plateforme est hébergée sur un serveur privé virtuel opéré par{' '}
          <strong>Wyzlee</strong>. La base de données opérationnelle est gérée
          par <strong>Neon Database Inc.</strong> (Neon Serverless Postgres),
          région <em>eu-central-1</em> (Frankfurt, Allemagne).
        </p>
      </Section>

      <Section title="Propriété intellectuelle">
        <p>
          L&apos;ensemble des éléments composant la Plateforme (interface,
          textes, rapports types, moteur d&apos;audit, logos, charte graphique,
          nomenclature des phases d&apos;audit) est la propriété exclusive de
          Wyzlee, sauf mentions contraires expresses. Toute reproduction,
          représentation ou exploitation totale ou partielle sans autorisation
          écrite préalable est interdite et constitue une contrefaçon
          sanctionnée par les articles L.335-2 et suivants du Code de la
          propriété intellectuelle.
        </p>
        <p>
          Les rapports d&apos;audit générés via la Plateforme pour le compte
          d&apos;un Client lui sont cédés à titre non-exclusif pour un usage
          interne et commercial lié à son activité, sans transfert de
          propriété sur le moteur d&apos;audit sous-jacent.
        </p>
      </Section>

      <Section title="Liens hypertextes">
        <p>
          La Plateforme peut inclure des liens vers des sites tiers (moteurs
          IA, outils SEO, ressources de référence). Wyzlee n&apos;exerce
          aucun contrôle sur ces sites et décline toute responsabilité quant
          à leur contenu.
        </p>
      </Section>

      <Section title="Droit applicable">
        <p>
          Les présentes mentions légales sont régies par le droit français.
          Tout litige sera soumis aux tribunaux compétents du ressort du siège
          social de Wyzlee.
        </p>
      </Section>
    </article>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-xl font-[family-name:var(--font-display)] font-semibold mt-6">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}
