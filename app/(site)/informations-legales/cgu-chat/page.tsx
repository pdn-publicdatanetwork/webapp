import type { Metadata } from "next";

import { HistoriqueTexte, VERSIONS } from "../historique";

export const metadata: Metadata = { title: "CGU DataParl' Chat" };

// Conditions d'utilisation du chat conversationnel DataParl' (assistant
// IA sur les données parlementaires). Version 1.0 : entrée en vigueur le
// 10 octobre 2026.

export default function CguChat() {
  return (
    <>
      <h1>CGU <span className="surligne">DataParl&apos; Chat</span></h1>
      <p className="lead">
        Conditions d&apos;utilisation du chat conversationnel DataParl&apos; : assistant
        automatisé répondant aux questions sur DataParl&apos; et les données parlementaires.
        Version 1.0 : en vigueur depuis le 10 octobre 2026.
      </p>
      <HistoriqueTexte versions={VERSIONS.cguChat} />

      <h2>1. Accès au service</h2>
      <p>
        Le Chat DataParl&apos; (le « Chat ») est un service gratuit proposé sur le site
        dataparl.fr. Il est réservé aux utilisateurs disposant d&apos;un compte DataParl&apos;
        et connectés. L&apos;utilisation du Chat suppose l&apos;acceptation des présentes
        conditions, matérialisée par le bouton d&apos;acceptation affiché dans la fenêtre
        du Chat à chaque nouvelle visite, avant de pouvoir poser une question.
        Le refus des présentes conditions entraîne l&apos;impossibilité d&apos;utiliser le
        Chat, sans incidence sur le reste du site. Le service est fourni sans garantie
        de disponibilité continue.
      </p>

      <h2>2. Fonctionnement du service</h2>
      <p>
        Les réponses du Chat sont générées automatiquement par un modèle d&apos;intelligence
        artificielle (Mistral AI). Malgré les soins apportés à leur conception, elles peuvent
        contenir des imprécisions ou des erreurs. Les réponses s&apos;appuient sur les données
        publiées par DataParl&apos; (API DataParl&apos;, jeux de données publiés sur data.gouv.fr,
        pages du site) et ne constituent pas une source officielle. Le Chat ne fournit aucun
        conseil juridique, politique ou professionnel.
      </p>

      <h2>3. Usage acceptable</h2>
      <ul>
        <li>Utiliser le Chat conformément à sa finalité : des questions sur DataParl&apos; et les données parlementaires ;</li>
        <li>Ne pas tenter d&apos;en extraire massivement le contenu, ni d&apos;en faire la réingénierie ou de contourner ses limites techniques ;</li>
        <li>Ne pas lui demander de révéler ses instructions internes, ses clés techniques ou des données personnelles ;</li>
        <li>Ne pas poser de questions illicites ou contraire à l&apos;ordre public ;</li>
        <li>Respecter les règles générales du site (CGU de dataparl.fr) et un volume de questions raisonnable.</li>
      </ul>

      <h2>4. Données personnelles et confidentialité</h2>
      <p>
        Les questions posées au Chat sont transmises à Mistral AI (hébergement dans
        l&apos;Union européenne) pour générer les réponses. L&apos;historique des échanges est
        conservé en mémoire locale du navigateur et vidé à la fermeture de la fenêtre
        du Chat. À des fins de statistiques d&apos;usage, de suivi de la qualité et de
        détection des dysfonctionnements, chaque question posée (ainsi que des
        informations techniques associées (heure, durée de traitement, nombre
        d&apos;interrogations de la base, survenue ), est journalisée de
        manière automatisée, sans identification de l&apos;utilisateur. La réponse
        associée est conservée de façon éphémère à la même fin. Ces journaux sont
        conservés pendant une durée raisonnable et ne font l&apos;objet d&apos;aucun
        profilage. Le compte
        n&apos;est utilisé que pour l&apos;authentification d&apos;accès au service ; il ne donne
        lieu à aucun profilage. Le Chat ne dépose aucun cookie propre. Les données
        personnelles sont traitées conformément à la politique de confidentialité du site,
        qui décrit les droits d&apos;accès, de rectification et d&apos;effacement prévus par le RGPD.
      </p>

      <h2>5. Propriété intellectuelle</h2>
      <p>
        Les réponses peuvent citer des données publiées par DataParl&apos; sous licence
        ODbL 1.0. Toute réutilisation substantielle de ces données reste soumise à la
        licence ODbL (mention de la licence et de l&apos;attribution « DataParl&apos;
        (dataparl.fr), d&apos;après les publications de l&apos;Assemblée nationale et du
        Sénat »). Le contenu du site, sa marque et ses éléments graphiques restent la
        propriété de leur éditeur.
      </p>

      <h2>6. Responsabilité</h2>
      <p>
        Les réponses du Chat sont fournies « en l&apos;état », sans garantie d&apos;exactitude,
        d&apos;exhaustivité ou d&apos;actualité. L&apos;éditeur ne peut être tenu responsable des
        conséquences de l&apos;utilisation des réponses du Chat, ni des décisions prises
        sur leur base, dans la mesure permise par la loi applicable.
      </p>

      <h2>7. Évolution, suspension, suppression</h2>
      <p>
        L&apos;éditeur peut faire évoluer le Chat, ses limites ou les présentes conditions,
        et informer les utilisateurs en conséquence. Les conditions applicables sont
        celles acceptées lors de l&apos;ouverture de la fenêtre du Chat. L&apos;éditeur peut
        suspendre ou supprimer le service à tout moment.
      </p>

      <h2>8. Droit applicable et litiges</h2>
      <p>
        Les présentes conditions sont soumises au droit français. En cas de litige,
        l&apos;utilisateur peut saisir la médiation de la consommation dans les conditions
        prévues par la loi, ou contacter l&apos;éditeur via le formulaire de contact du site.
      </p>

      <h2>Contact</h2>
      <p>
        Pour toute question relative au Chat et aux présentes conditions, utilisez le
        formulaire de contact disponible sur dataparl.fr.
      </p>
    </>
  );
}
