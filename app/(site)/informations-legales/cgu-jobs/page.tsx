import type { Metadata } from "next";
import { CONTACT_URL } from "../maj";

import { HistoriqueTexte, VERSIONS } from "../historique";

export const metadata: Metadata = { title: "Conditions d'utilisation — DataParl' Jobs" };

export default function CGUJobs() {
  return (
    <>
      <h1>
        Conditions d&apos;utilisation <span className="surligne">DataParl&apos; Jobs</span>
      </h1>
      <HistoriqueTexte versions={VERSIONS.cguJobs} />
      <p className="meta">
        L&apos;éditeur, l&apos;hébergement et les conditions générales du site sont ceux des{" "}
        <a href="/informations-legales/mentions-legales">mentions légales</a> et des{" "}
        <a href="/informations-legales/cgu">conditions d&apos;utilisation</a>. Les présentes conditions précisent les
        règles propres au service Jobs.
      </p>

      <h2>1. Objet</h2>
      <p>
        DataParl&apos; Jobs référence des offres d&apos;emploi de collaborateur parlementaire — Assemblée nationale,
        Sénat, Parlement européen. Les offres sont collectées automatiquement à partir de sources publiques (sites
        institutionnels et agrégateurs d&apos;offres en politique), puis <strong>relues et validées à la main</strong>{" "}
        avant publication.
      </p>

      <h2>2. Exactitude des informations</h2>
      <p>
        Les intitulés et descriptions reprennent les annonces d&apos;origine. Malgré la relecture humaine, DataParl&apos;
        ne garantit ni l&apos;exhaustivité ni l&apos;actualité du référencement : une offre peut être pourvue ou retirée
        sans que sa source l&apos;ait signalé. Les conditions contractuelles (rémunération, durée, statut) relèvent du
        seul employeur.
      </p>

      <h2>3. Aucun intermédiaire de recrutement</h2>
      <p>
        DataParl&apos; Jobs est un service d&apos;information. Il <strong>n&apos;est ni une agence de recrutement ni une
        plateforme de candidature</strong>.
      </p>
      <p>
        <strong>Les candidatures ne passent pas par DataParl&apos;.</strong> Le service ne collecte, ne transmet ni ne
        stocke aucun CV ni aucune candidature. Les candidats ne doivent pas contacter DataParl&apos; — ni par email,
        ni via le formulaire de contact — au sujet d&apos;une offre : toute demande de candidature, de mise en relation
        ou de recommandation ne recevra aucune réponse. La démarche relève du seul rapport direct entre le candidat et
        l&apos;employeur mentionné dans l&apos;annonce.
      </p>

      <h2>4. Propriété intellectuelle et retrait des annonces</h2>
      <p>
        Les annonces appartiennent à leurs auteurs (élus, employeurs, plateformes sources) ; leur reproduction vise à
        faciliter l&apos;accès à une information publique. Tout auteur d&apos;annonce peut en demander le retrait,
        traité sur simple <a href={CONTACT_URL}>contact</a>.
      </p>

      <h2>5. Données personnelles</h2>
      <p>
        Les noms d&apos;élus et les informations d&apos;équipe cités proviennent des déclarations publiques de
        collaborateurs parlementaires. Aucun profilage des utilisateurs n&apos;est mis en œuvre ; les traitements
        relèvent de la <a href="/informations-legales/confidentialite">politique de confidentialité</a>.
      </p>

      <h2>6. Limitation de responsabilité</h2>
      <p>
        DataParl&apos; ne saurait être tenu responsable des conséquences directes ou indirectes de l&apos;utilisation
        des informations publiées, notamment des décisions de candidature ou d&apos;embauche prises sur leur fondement.
      </p>
    </>
  );
}
