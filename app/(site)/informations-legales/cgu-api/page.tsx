import type { Metadata } from "next";

import { HistoriqueTexte, VERSIONS } from "../historique";

export const metadata: Metadata = { title: "Conditions d'utilisation de l'API" };

export default function CGUAPI() {
  return (
    <>
      <h1>Conditions d&apos;utilisation de <span className="surligne">l&apos;API</span></h1>
      <HistoriqueTexte versions={VERSIONS.cguApi} />
      <p>
        Ces conditions complètent les <a href="/informations-legales/cgu">conditions générales d&apos;utilisation</a>.
        La documentation est sur <a href="https://api.dataparl.fr/docs">api.dataparl.fr/docs</a>.
        Retour à l&apos;API : <a href="https://api.dataparl.fr/">api.dataparl.fr</a>.
      </p>

      <h2>1. Accès par clé</h2>
      <ul>
        <li>L&apos;API est gratuite. Chaque appel nécessite une clé personnelle, obtenue sur <a href="https://api.dataparl.fr/request-access">api.dataparl.fr/request-access</a> après avoir lu et accepté les présentes conditions.</li>
        <li>Une seule clé par compte. Elle peut être révoquée puis remplacée à tout moment depuis l&apos;espace API.</li>
        <li>
          La clé est transmise dans l&apos;en-tête <code>Authorization: Bearer &lt;clé&gt;</code> (ou <code>X-API-Key</code>).
          Elle est personnelle : l&apos;utilisateur ne doit ni la publier (dépôt de code public, application côté navigateur), ni la céder.
        </li>
        <li>DataParl&apos; ne conserve qu&apos;une empreinte de la clé : en cas de perte, la clé doit être révoquée puis remplacée.</li>
      </ul>

      <h2>2. Quotas</h2>
      <p>
        Chaque clé dispose de 1 000 requêtes par jour, remises à zéro à minuit (heure de Paris). Au-delà, l&apos;API
        répond <code>429</code> jusqu&apos;au lendemain. Un quota plus élevé peut être accordé sur demande motivée
        (recherche, journalisme, projet d&apos;intérêt général), via le <a href="/contact?sujet=api">formulaire de contact</a>.
      </p>
      <p>Il est interdit de contourner les quotas, notamment en multipliant les comptes.</p>

      <h2>3. Réutilisation des données</h2>
      <p>
        Les données servies par l&apos;API sont diffusées sous licence ODbL 1.0 (voir{" "}
        <a href="/informations-legales/licences">Licences et réutilisation</a>). Toute réutilisation, y compris
        commerciale, est permise à condition :
      </p>
      <ul>
        <li>de citer la source : « DataParl&apos; (dataparl.fr), d&apos;après les publications de l&apos;Assemblée nationale et du Sénat » ;</li>
        <li>de publier sous la même licence toute base de données dérivée rendue publique ;</li>
        <li>d&apos;indiquer la date d&apos;extraction, les données évoluant chaque jour.</li>
      </ul>

      <h2>4. Données personnelles</h2>
      <p>
        Les données contiennent les noms de collaborateurs et d&apos;élus. En les réutilisant, l&apos;utilisateur devient responsable de
        son propre traitement au sens du RGPD et doit en respecter les obligations (finalité légitime,
        information, droits des personnes). Sont notamment interdits :
      </p>
      <ul>
        <li>le harcèlement, l&apos;intimidation ou la discrimination des personnes citées ;</li>
        <li>la prospection commerciale sans rapport avec l&apos;activité parlementaire ;</li>
        <li>la revente ou la cession des données à des fins de fichage.</li>
      </ul>

      <h2>5. Disponibilité et évolutions</h2>
      <p>
        L&apos;API est fournie en l&apos;état, sans garantie de disponibilité ni d&apos;exhaustivité. Les versions sont
        préfixées (<code>/v1</code>) ; un changement incompatible donne lieu à une nouvelle version et à une période
        de transition annoncée.
      </p>

      <h2>6. Suspension</h2>
      <p>
        Une clé utilisée en violation de ces conditions, ou de manière à dégrader le service, peut être suspendue ou
        révoquée sans préavis. Le titulaire du compte en est informé par email.
      </p>
    </>
  );
}
