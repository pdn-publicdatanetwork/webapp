import type { Metadata } from "next";
import { MISE_A_JOUR } from "../maj";

export const metadata: Metadata = { title: "Licences et réutilisation" };

export default function Licences() {
  return (
    <>
      <h1>Licences et <span className="surligne">réutilisation</span></h1>
      <p className="meta">Dernière mise à jour : {MISE_A_JOUR}</p>
      <p>
        DataParl&apos; ne produit pas l&apos;information à la source : il la relit, la met en forme et la rend
        comparable dans le temps. Tout ce qui est publié peut être réutilisé, dans les conditions ci-dessous.
      </p>

      <h2>Sources</h2>
      <table>
        <thead><tr><th>Source</th><th>Contenu</th><th>Licence</th></tr></thead>
        <tbody>
          <tr>
            <td>Assemblée nationale (data.assemblee-nationale.fr)</td>
            <td>Liste des collaborateurs des députés, liste des députés et de leurs groupes</td>
            <td>Licence Ouverte 2.0 (Etalab)</td>
          </tr>
          <tr>
            <td>Sénat (senat.fr, data.senat.fr)</td>
            <td>Liste des collaborateurs par sénateur publiée par l&apos;A.G.A.S., informations sur les sénateurs</td>
            <td>Licence Ouverte 2.0 (Etalab) pour data.senat.fr ; informations publiques pour la liste A.G.A.S.</td>
          </tr>
          <tr>
            <td>Parlement européen (europarl.europa.eu)</td>
            <td>Assistants des eurodéputés</td>
            <td>Reproduction autorisée avec mention de la source</td>
          </tr>
          <tr>
            <td>Internet Archive</td>
            <td>Captures archivées des publications officielles, pour les périodes non couvertes</td>
            <td>Contenus des sources ci-dessus</td>
          </tr>
        </tbody>
      </table>

      <h2>Ce que DataParl&apos; ajoute</h2>
      <ul>
        <li>la normalisation des noms, pour reconnaître une même personne d&apos;une publication à l&apos;autre ;</li>
        <li>la détection des arrivées, départs et transferts, et leur datation ;</li>
        <li>l&apos;historisation depuis 2015 (Sénat) et 2017 (Assemblée nationale), et l&apos;harmonisation des groupes politiques ;</li>
        <li>la diffusion par le site, les alertes et l&apos;API.</li>
      </ul>

      <h2>Licence de la base DataParl&apos;</h2>
      <p>
        La base des mouvements et des affectations est diffusée sous <a href="https://opendatacommons.org/licenses/odbl/1-0/">Open Database License (ODbL) 1.0</a>.
        Toute personne peut la copier, la diffuser et l&apos;adapter, y compris à des fins commerciales, à trois conditions :
      </p>
      <ul>
        <li><strong>Attribution</strong> : « DataParl&apos; (dataparl.fr), d&apos;après les publications de l&apos;Assemblée nationale et du Sénat » ;</li>
        <li><strong>Partage à l&apos;identique</strong> : une base de données dérivée rendue publique doit être diffusée sous ODbL ;</li>
        <li><strong>Ouverture</strong> : pas de mesure technique empêchant la réutilisation de cette base dérivée.</li>
      </ul>
      <p>
        Les œuvres produites à partir des données (articles, graphiques, études) peuvent être publiées sous la licence
        de son choix, avec la mention de la source.
      </p>

      <h2>Accéder aux données</h2>
      <ul>
        <li>API avec clé gratuite : <a href="https://api.dataparl.fr">api.dataparl.fr</a> et ses <a href="/informations-legales/cgu-api">conditions d&apos;utilisation</a>.</li>
      </ul>

      <h2>Données personnelles</h2>
      <p>
        Les données citent des personnes. Toute réutilisation doit respecter le RGPD et les interdictions posées par
        les <a href="/informations-legales/cgu-api">conditions de l&apos;API</a> (pas de harcèlement, pas de prospection
        commerciale hors activité parlementaire, pas de revente). Voir aussi la page <a href="/informations-legales/confidentialite">Données personnelles</a>.
      </p>
    </>
  );
}
