import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Politique de confidentialité',
  description:
    'Politique de confidentialité et RGPD de la plateforme SEO-GEO de Wyzlee.',
}

export default function PrivacyPage() {
  return (
    <article className="space-y-5 text-sm leading-relaxed font-[family-name:var(--font-sans)]">
      <header>
        <h1 className="text-3xl font-[family-name:var(--font-display)] font-semibold mb-2">
          Politique de confidentialité
        </h1>
        <p style={{ color: 'var(--color-muted)' }}>
          Dernière mise à jour : 16 avril 2026 — conforme RGPD (UE 2016/679) et
          Loi Informatique & Libertés modifiée.
        </p>
      </header>

      <Section title="Responsable du traitement">
        <p>
          Le responsable du traitement des données à caractère personnel
          collectées via la Plateforme est <strong>Wyzlee SAS</strong> (voir{' '}
          <a href="/legal/mentions">mentions légales</a>). Pour toute
          question relative à cette politique ou à l&apos;exercice de vos
          droits, contactez{' '}
          <a href="mailto:dpo@wyzlee.com">dpo@wyzlee.com</a>.
        </p>
      </Section>

      <Section title="Données collectées">
        <dl className="space-y-3">
          <DataBlock
            category="Identité & authentification"
            fields="email, nom d'affichage, identifiant Stack Auth, rôle dans l'organisation"
            source="fourni par l'utilisateur lors de l'inscription / invitation"
            retention="jusqu'à suppression du compte + 30 jours (journal d'audit)"
          />
          <DataBlock
            category="Usage du service"
            fields="audits lancés, URLs cibles, findings, scores, rapports générés"
            source="généré par l'utilisateur et par le moteur d'audit"
            retention="durée du contrat + 12 mois, ou suppression à la demande"
          />
          <DataBlock
            category="Journaux techniques"
            fields="logs JSON structurés (timestamp, user_id, org_id, audit_id, événement)"
            source="généré automatiquement par la Plateforme"
            retention="90 jours glissants maximum"
          />
          <DataBlock
            category="Communication"
            fields="emails transactionnels (audit terminé, invitation), adresse e-mail associée"
            source="fournie par l'utilisateur"
            retention="jusqu'à désinscription ou suppression du compte"
          />
        </dl>
      </Section>

      <Section title="Bases légales">
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Exécution contractuelle</strong> (art. 6.1.b RGPD) — pour
            la fourniture du service d&apos;audit lui-même.
          </li>
          <li>
            <strong>Intérêt légitime</strong> (art. 6.1.f RGPD) — pour la
            sécurité technique, la prévention des abus (rate limiting, SSRF
            guard) et la journalisation opérationnelle.
          </li>
          <li>
            <strong>Obligation légale</strong> (art. 6.1.c RGPD) — pour la
            conservation de données de facturation (10 ans, Code de commerce).
          </li>
        </ul>
      </Section>

      <Section title="Destinataires">
        <p>
          Les données ne sont communiquées qu&apos;aux personnes habilitées
          chez Wyzlee et à ses sous-traitants techniques :
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Stack Auth</strong> — identification / gestion de compte
            (UE / US — Standard Contractual Clauses en vigueur).
          </li>
          <li>
            <strong>Neon Database Inc.</strong> — base de données
            opérationnelle, hébergée en UE (Frankfurt).
          </li>
          <li>
            <strong>Resend</strong> — envoi d&apos;emails transactionnels
            (DKIM / SPF activés).
          </li>
        </ul>
        <p>
          Aucune donnée n&apos;est revendue à des tiers. Aucun transfert
          publicitaire n&apos;est effectué.
        </p>
      </Section>

      <Section title="Données non collectées">
        <ul className="list-disc pl-6 space-y-1">
          <li>Aucun cookie publicitaire ou de mesure tierce.</li>
          <li>
            Le HTML source brut des sites audités n&apos;est pas persisté ;
            seuls les findings structurés le sont.
          </li>
          <li>
            Les archives de code uploadées sont automatiquement purgées dans
            les 24 heures suivant leur analyse.
          </li>
        </ul>
      </Section>

      <Section title="Vos droits (RGPD art. 15 à 22)">
        <p>
          Vous pouvez à tout moment exercer les droits suivants en écrivant à{' '}
          <a href="mailto:dpo@wyzlee.com">dpo@wyzlee.com</a> :
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Accès à vos données et copie (art. 15)</li>
          <li>Rectification (art. 16)</li>
          <li>Effacement (« droit à l&apos;oubli », art. 17)</li>
          <li>Limitation du traitement (art. 18)</li>
          <li>Portabilité (art. 20)</li>
          <li>Opposition (art. 21)</li>
        </ul>
        <p>
          Une réponse vous sera apportée dans un délai maximal d&apos;un mois.
          Vous disposez également du droit d&apos;introduire une réclamation
          auprès de la <strong>CNIL</strong> (www.cnil.fr).
        </p>
      </Section>

      <Section title="Sécurité">
        <p>
          La Plateforme met en œuvre des mesures techniques appropriées :
          chiffrement TLS de bout en bout, stockage chiffré au repos (Neon),
          authentification JWT à durée de vie courte, cloisonnement
          multi-tenant strict (chaque requête scopée par `organization_id`),
          protection contre les SSRF, rate limiting par utilisateur et par
          organisation, journaux structurés sans PII.
        </p>
      </Section>

      <Section title="Cookies">
        <p>
          La Plateforme n&apos;utilise que des cookies strictement
          nécessaires à son fonctionnement (authentification Stack Auth,
          préférences d&apos;affichage dark / light). Aucune finalité
          marketing n&apos;est rattachée à ces cookies ; aucun consentement
          n&apos;est requis par la directive ePrivacy pour ces usages
          techniques.
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

function DataBlock({
  category,
  fields,
  source,
  retention,
}: {
  category: string
  fields: string
  source: string
  retention: string
}) {
  return (
    <div
      className="p-3 rounded-md"
      style={{
        background: 'var(--color-bgAlt)',
        border: '1px solid var(--color-border)',
      }}
    >
      <p className="font-[family-name:var(--font-display)] font-semibold mb-1">
        {category}
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 text-xs">
        <dt style={{ color: 'var(--color-muted)' }}>Champs</dt>
        <dd>{fields}</dd>
        <dt style={{ color: 'var(--color-muted)' }}>Source</dt>
        <dd>{source}</dd>
        <dt style={{ color: 'var(--color-muted)' }}>Conservation</dt>
        <dd>{retention}</dd>
      </dl>
    </div>
  )
}
