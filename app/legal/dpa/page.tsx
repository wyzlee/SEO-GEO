import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Accord de traitement des données (DPA)',
  description:
    'Data Processing Agreement pour les clients B2B de la plateforme SEO-GEO.',
}

export default function DpaPage() {
  return (
    <article className="space-y-5 text-sm leading-relaxed font-[family-name:var(--font-sans)]">
      <header>
        <h1 className="text-3xl font-[family-name:var(--font-display)] font-semibold mb-2">
          Accord de traitement des données (DPA)
        </h1>
        <p style={{ color: 'var(--color-muted)' }}>
          Version 1.0 — applicable au 16 avril 2026
        </p>
      </header>

      <div
        className="p-4 rounded-md text-xs"
        style={{
          background: 'color-mix(in srgb, var(--color-amber) 12%, transparent)',
          border: '1px solid var(--color-amber)',
        }}
      >
        Le DPA signé en version PDF peut être obtenu sur demande à{' '}
        <a href="mailto:dpo@wyzlee.com">dpo@wyzlee.com</a>. La présente page en
        synthétise les clauses matérielles applicables par défaut à tous les
        clients B2B.
      </div>

      <Section title="1. Parties">
        <p>
          <strong>Sous-traitant</strong> : Wyzlee SAS (« le Processeur »), agissant
          en qualité de sous-traitant au sens de l&apos;article 28 RGPD.
        </p>
        <p>
          <strong>Responsable de traitement</strong> : l&apos;organisation
          cliente (« le Contrôleur ») qui accède à la Plateforme via un
          compte provisionné.
        </p>
      </Section>

      <Section title="2. Objet du traitement">
        <p>
          Le Processeur traite les données à caractère personnel pour le
          compte du Contrôleur dans le seul but d&apos;exécuter les
          fonctionnalités de la Plateforme : authentification, lancement
          d&apos;audits, génération de rapports, conservation et partage.
        </p>
      </Section>

      <Section title="3. Durée">
        <p>
          Le présent DPA est conclu pour la durée du contrat principal liant
          les parties. Toute donnée traitée est supprimée ou restituée dans
          un délai de 30 jours après résiliation, sauf obligation légale
          contraire.
        </p>
      </Section>

      <Section title="4. Nature des données traitées">
        <ul className="list-disc pl-6 space-y-1">
          <li>Identifiants de connexion (email, identifiant opaque).</li>
          <li>Données de session et journaux techniques.</li>
          <li>
            Contenu client fourni pour audit (URLs, archives, recos). Aucun
            champ sensible au sens de l&apos;art. 9 RGPD n&apos;est requis
            par la Plateforme.
          </li>
        </ul>
      </Section>

      <Section title="5. Sous-traitants ultérieurs">
        <p>
          Le Processeur recourt aux sous-traitants techniques suivants.
          Tout nouvel ajout fera l&apos;objet d&apos;une information
          préalable avec droit d&apos;opposition de 30 jours.
        </p>
        <div className="overflow-x-auto">
          <table
            className="w-full text-xs border-collapse"
            style={{ border: '1px solid var(--color-border)' }}
          >
            <thead>
              <tr style={{ background: 'var(--color-bgAlt)' }}>
                {['Sous-traitant', 'Finalité', 'Pays', 'Garanties'].map((h) => (
                  <th
                    key={h}
                    className="text-left px-3 py-2 font-[family-name:var(--font-display)] font-semibold"
                    style={{ borderBottom: '1px solid var(--color-border)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                {
                  name: 'Vercel Inc.',
                  purpose: 'Hébergement, edge compute, CDN',
                  country: 'USA',
                  guarantee: 'DPA + SCC — vercel.com/legal/dpa',
                },
                {
                  name: 'Neon Database Inc.',
                  purpose: 'Base de données opérationnelle',
                  country: 'UE (Frankfurt)',
                  guarantee: 'RGPD natif — neon.tech/dpa',
                },
                {
                  name: 'Stack Auth',
                  purpose: 'Authentification, gestion de compte',
                  country: 'USA',
                  guarantee: 'SCC — stack-auth.com/legal',
                },
                {
                  name: 'Resend',
                  purpose: 'Emails transactionnels',
                  country: 'USA',
                  guarantee: 'SCC — resend.com/legal/dpa',
                },
                {
                  name: 'Anthropic PBC',
                  purpose: 'Synthèse IA des rapports d\'audit',
                  country: 'USA',
                  guarantee: 'DPA sur demande — legal@anthropic.com',
                },
                {
                  name: 'Google LLC',
                  purpose: 'API Chrome UX Report (métriques CWV)',
                  country: 'USA',
                  guarantee: 'Google Cloud DPA — cloud.google.com/terms/data-processing-addendum',
                },
              ].map((row) => (
                <tr
                  key={row.name}
                  style={{ borderBottom: '1px solid var(--color-border)' }}
                >
                  <td className="px-3 py-2 font-[family-name:var(--font-display)] font-medium">{row.name}</td>
                  <td className="px-3 py-2">{row.purpose}</td>
                  <td className="px-3 py-2">{row.country}</td>
                  <td className="px-3 py-2" style={{ color: 'var(--color-muted)' }}>{row.guarantee}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="6. Mesures techniques et organisationnelles (art. 32 RGPD)">
        <ul className="list-disc pl-6 space-y-1">
          <li>Chiffrement TLS 1.3 en transit, AES-256 au repos (Neon).</li>
          <li>Authentification OIDC / JWT, rotation de clés, MFA disponible.</li>
          <li>Isolation logique multi-tenant (scoping `organization_id`).</li>
          <li>Journalisation structurée, sans enregistrement de secrets.</li>
          <li>
            Tests d&apos;intégration automatisés sur les routes critiques
            (authentification, isolation, validation, rate limiting).
          </li>
          <li>
            Accès interne limité aux collaborateurs habilités, traçabilité
            par logs.
          </li>
        </ul>
      </Section>

      <Section title="7. Notification de violation">
        <p>
          En cas de violation de données, le Processeur en informe le
          Contrôleur sans retard indu et au plus tard dans un délai de 72
          heures après en avoir pris connaissance, en précisant la nature,
          les catégories concernées, les conséquences probables et les
          mesures prises.
        </p>
      </Section>

      <Section title="8. Transferts hors UE">
        <p>
          Les traitements sont opérés au sein de l&apos;Union européenne
          (Neon région Frankfurt). Le recours à Stack Auth implique des
          transferts vers les États-Unis, encadrés par des Clauses
          Contractuelles Types (CCT / SCCs) de la Commission européenne.
        </p>
      </Section>

      <Section title="9. Audit">
        <p>
          Le Contrôleur peut solliciter, une fois par an et moyennant un
          préavis raisonnable, un audit des mesures mises en œuvre par le
          Processeur. Cet audit peut être satisfait par la communication des
          certifications / rapports tiers pertinents, à la discrétion du
          Processeur.
        </p>
      </Section>

      <Section title="10. Fin du traitement">
        <p>
          À la fin du contrat, le Processeur restitue ou supprime l&apos;ensemble
          des données à caractère personnel au choix du Contrôleur, sauf
          obligation légale de conservation (notamment données de
          facturation, 10 ans).
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
