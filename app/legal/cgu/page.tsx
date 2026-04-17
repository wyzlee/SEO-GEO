import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Conditions générales d\'utilisation',
  description:
    'Conditions générales d\'utilisation de la plateforme SEO-GEO de Wyzlee.',
}

export default function CguPage() {
  return (
    <article className="space-y-5 text-sm leading-relaxed font-[family-name:var(--font-sans)]">
      <header>
        <h1 className="text-3xl font-[family-name:var(--font-display)] font-semibold mb-2">
          Conditions générales d&apos;utilisation
        </h1>
        <p style={{ color: 'var(--color-muted)' }}>
          Version 1.0 — applicable au 16 avril 2026
        </p>
      </header>

      <Section title="1. Objet">
        <p>
          Les présentes Conditions Générales d&apos;Utilisation (« CGU »)
          régissent l&apos;accès et l&apos;usage de la plateforme SEO-GEO
          éditée par Wyzlee SAS (« l&apos;Éditeur »), permettant à ses
          utilisateurs de déclencher des audits SEO et GEO (Generative Engine
          Optimization), de recevoir des rapports de diagnostic et de les
          partager.
        </p>
      </Section>

      <Section title="2. Accès au service">
        <p>
          La Plateforme est accessible aux personnes morales disposant d&apos;un
          compte provisionné par l&apos;Éditeur ou par un administrateur de
          leur organisation. L&apos;accès requiert une authentification
          individuelle. L&apos;Utilisateur s&apos;engage à conserver ses
          identifiants confidentiels et à signaler toute utilisation
          non autorisée.
        </p>
      </Section>

      <Section title="3. Description du service">
        <p>Le service permet à l&apos;Utilisateur de :</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Lancer un audit à partir d&apos;une URL publique, d&apos;une archive de code ou d&apos;un dépôt GitHub public.</li>
          <li>Consulter le scoring sur 100 points réparti sur 11 phases d&apos;analyse.</li>
          <li>Consulter les findings structurés (severity, recommandations, effort estimé).</li>
          <li>Générer un rapport livrable au format HTML partageable, avec lien de partage expirable.</li>
          <li>Personnaliser le branding du rapport (logo, couleurs, nom affiché).</li>
        </ul>
      </Section>

      <Section title="4. Obligations de l'Utilisateur">
        <p>L&apos;Utilisateur s&apos;engage à :</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            N&apos;auditer que des sites / dépôts dont il est légitimement
            propriétaire ou pour lesquels il dispose d&apos;une autorisation
            écrite explicite.
          </li>
          <li>
            Ne pas tenter de contourner les mesures techniques de sécurité
            (SSRF guard, rate limiting, authentification).
          </li>
          <li>
            Ne pas utiliser le service pour auditer des cibles à des fins
            concurrentielles déloyales, d&apos;ingénierie inverse ou
            d&apos;attaque.
          </li>
          <li>
            Ne pas uploader de code contenant des secrets non chiffrés,
            des identifiants de production ou des données à caractère
            personnel non anonymisées.
          </li>
        </ul>
      </Section>

      <Section title="5. Propriété des données">
        <p>
          L&apos;Utilisateur reste propriétaire des données qu&apos;il injecte
          (URLs cibles, archives, informations client). L&apos;Éditeur se voit
          concéder un droit limité d&apos;usage strictement nécessaire à
          l&apos;exécution du service (stockage, traitement, génération de
          rapport).
        </p>
        <p>
          Les rapports générés restent la propriété de l&apos;Utilisateur,
          libre de les diffuser à ses clients, y compris sous marque blanche.
          L&apos;Éditeur conserve la propriété exclusive du moteur d&apos;audit,
          de ses algorithmes de scoring, du template de rapport et de la
          nomenclature des phases.
        </p>
      </Section>

      <Section title="6. Disponibilité & SLA">
        <p>
          L&apos;Éditeur met en œuvre ses meilleurs efforts pour assurer la
          disponibilité du service. Aucun SLA contractuel n&apos;est accordé
          sur la version actuelle (mode agence). Des fenêtres de maintenance
          peuvent intervenir sans préavis formel. Un SLA négocié peut être
          adossé à un contrat de prestation spécifique.
        </p>
      </Section>

      <Section title="7. Tarification">
        <p>
          En mode agence (V1), l&apos;accès à la Plateforme est accordé dans le
          cadre d&apos;un contrat de prestation bilatéral conclu avec
          l&apos;Éditeur, qui précise les conditions financières applicables.
          L&apos;ouverture d&apos;un mode self-serve payant fera l&apos;objet
          de conditions tarifaires publiques distinctes.
        </p>
      </Section>

      <Section title="8. Responsabilité">
        <p>
          Les recommandations produites par le moteur d&apos;audit sont
          fournies à titre indicatif et reposent sur l&apos;état des bonnes
          pratiques SEO/GEO connues à la date de génération. L&apos;Éditeur
          ne garantit ni l&apos;amélioration du positionnement, ni la
          citation par les moteurs IA, ni un quelconque résultat commercial.
        </p>
        <p>
          La responsabilité de l&apos;Éditeur est en tout état de cause
          plafonnée aux sommes versées par l&apos;Utilisateur au titre des
          douze (12) derniers mois, hors taxes.
        </p>
      </Section>

      <Section title="9. Suspension / Résiliation">
        <p>
          L&apos;Éditeur peut suspendre ou résilier l&apos;accès en cas de
          manquement caractérisé aux présentes CGU, notamment en cas
          d&apos;usage abusif, de violation manifeste du droit applicable
          ou de non-paiement.
        </p>
      </Section>

      <Section title="10. Modification des CGU">
        <p>
          L&apos;Éditeur se réserve le droit de modifier les présentes CGU.
          Toute modification substantielle sera notifiée par email à
          l&apos;adresse de contact de l&apos;organisation, avec un préavis
          de trente (30) jours avant effet.
        </p>
      </Section>

      <Section title="11. Droit applicable – litiges">
        <p>
          Les présentes CGU sont régies par le droit français. Les parties
          tenteront de résoudre amiablement tout différend. À défaut, les
          tribunaux compétents du siège social de l&apos;Éditeur seront
          seuls compétents.
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
