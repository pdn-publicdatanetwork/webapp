import type { Metadata } from "next";
import { CONTACT_RGPD, MISE_A_JOUR } from "../maj";

export const metadata: Metadata = { title: "Données personnelles" };

export default function Confidentialite() {
  return (
    <>
      <h1>Données <span className="surligne">personnelles</span></h1>
      <p className="meta">Dernière mise à jour : {MISE_A_JOUR}</p>
      <p>
        DataParl&apos; traite deux sortes de données personnelles : celles des personnes qui utilisent le site
        (compte, alertes, API, contact), et celles des personnes citées dans les données publiées (élus et
        collaborateurs parlementaires). Aucune donnée n&apos;est vendue, louée ni utilisée à des fins publicitaires.
      </p>

      <h2>1. Responsable du traitement</h2>
      <p>
        L&apos;éditeur de DataParl&apos; (voir les <a href="/informations-legales/mentions-legales">mentions légales</a>).
        Pour toute question ou demande relative à ses données : <a href={CONTACT_RGPD}>formulaire de contact</a>, sujet
        « Demande RGPD ».
      </p>

      <h2>2. Utilisateurs du site</h2>
      <table>
        <thead>
          <tr><th>Données</th><th>Finalité</th><th>Base légale</th><th>Conservation</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Adresse email ; identifiant, nom et photo transmis par Google ou GitHub si l&apos;utilisateur choisit ces services</td>
            <td>Créer et sécuriser le compte de l&apos;utilisateur</td>
            <td>Exécution des conditions d&apos;utilisation</td>
            <td>Jusqu&apos;à la suppression du compte, ou 3 ans sans connexion</td>
          </tr>
          <tr>
            <td>Réglages d&apos;alertes : chambres, types de mouvement, groupes, élus suivis, fréquence</td>
            <td>Envoyer les alertes</td>
            <td>Consentement</td>
            <td>Jusqu&apos;à la désactivation des alertes ou la suppression du compte</td>
          </tr>
          <tr>
            <td>Date, nature de l&apos;action, version de cette politique, adresse IP hachée (jamais en clair), navigateur</td>
            <td>Prouver le consentement ; limiter les abus</td>
            <td>Obligation de pouvoir démontrer le consentement (art. 7 RGPD) ; intérêt légitime</td>
            <td>3 ans après la fin de l&apos;abonnement ou du compte</td>
          </tr>
          <tr>
            <td>Prénom, nom, email, sujet et contenu des messages envoyés via le formulaire de contact</td>
            <td>Répondre à la demande</td>
            <td>Intérêt légitime ; obligation légale pour les demandes RGPD</td>
            <td>2 ans après le dernier échange</td>
          </tr>
          <tr>
            <td>Destinataire, objet, identifiant et statut des emails envoyés</td>
            <td>Suivre la délivrabilité, traiter les erreurs d&apos;envoi</td>
            <td>Intérêt légitime</td>
            <td>12 mois</td>
          </tr>
          <tr>
            <td>Usage déclaré et empreinte de la clé API, nombre de requêtes par jour</td>
            <td>Fournir l&apos;API, appliquer les quotas</td>
            <td>Exécution des conditions de l&apos;API</td>
            <td>Jusqu&apos;à la révocation de la clé ; compteurs 12 mois</td>
          </tr>
          <tr>
            <td>Journaux techniques de l&apos;hébergeur (adresse IP, pages demandées)</td>
            <td>Sécurité et bon fonctionnement</td>
            <td>Intérêt légitime</td>
            <td>Durée courte fixée par l&apos;hébergeur</td>
          </tr>
        </tbody>
      </table>
      <p>
        <strong>Mesure d&apos;audience et publicité.</strong> Par défaut, aucune mesure d&apos;audience et aucune
        publicité : les seuls cookies déposés sans accord sont strictement nécessaires au service. Si
        l&apos;utilisateur l&apos;accepte dans le bandeau, trois traitements sont activés, chacun révocable à
        tout moment en supprimant les cookies du site :
      </p>
      <ul>
        <li><strong>Mesure d&apos;audience</strong> (Google Analytics 4 via Google Tag Manager) : statistiques de
          fréquentation, dans une optique d&apos;amélioration de la qualité du service ;</li>
        <li><strong>Mesure comportementale</strong> (Microsoft Clarity) : analyse anonymisée de l&apos;usage du site,
          dans une optique d&apos;amélioration de la qualité du service ;</li>
        <li><strong>Publicité</strong> (Google AdSense) : annonces contextualisées, avec personnalisation
          publicitaire uniquement si l&apos;utilisateur l&apos;accepte. Ce traitement n&apos;est pas
          implémenté à ce jour : aucun cookie publicitaire n&apos;est déposé, même en cas d&apos;accord.</li>
      </ul>
      <p>
        Tant que l&apos;utilisateur n&apos;a pas répondu au bandeau, ou s&apos;il refuse, aucun de ces cookies
        n&apos;est déposé et aucun script correspondant n&apos;est chargé. Le détail des cookies est
        décrit sur la page <a href="/informations-legales/cookies">Cookies</a>.
      </p>
      <p>
        <strong>Journalistes.</strong> Le carnet presse (nom, média, adresse professionnelle) sert à envoyer nos communiqués, sur la base de
        notre intérêt légitime à informer la presse. Chaque communiqué contient un lien de désinscription ; toute personne
        concernée peut aussi écrire à presse@dataparl.fr.
      </p>

      <h2>3. Personnes citées dans les données</h2>
      <p>
        DataParl&apos; publie les noms des collaborateurs des parlementaires, l&apos;élu qui les emploie, son groupe
        politique, et les dates auxquelles une arrivée, un départ ou un transfert a été constaté.
      </p>
      <ul>
        <li>
          <strong>Sources.</strong> Listes publiées par l&apos;Assemblée nationale, le Sénat et le Parlement européen
          (depuis les lois du 11 octobre 2013 relatives à la transparence de la vie publique, les parlementaires
          déclarent leurs collaborateurs dans leur déclaration d&apos;intérêts, rendue publique, et les assemblées
          publient ces listes), et archives de ces publications. Ces données ne sont pas collectées auprès des
          personnes elles-mêmes.
        </li>
        <li>
          <strong>Finalité et base légale.</strong> Information du public sur le fonctionnement des assemblées,
          transparence de la vie publique, recherche : intérêt légitime (art. 6, 1, f du RGPD), fondé sur le
          caractère public de ces informations.
        </li>
        <li>
          <strong>Fiches de parcours.</strong> Pour chaque collaborateur, DataParl&apos; rassemble sur une fiche les
          élus pour lesquels la personne a figuré sur les listes officielles, avec les dates et la chambre. Ces fiches ne
          sont pas indexées par les moteurs de recherche, et le parcours complet n&apos;est visible que par les comptes
          connectés. Une personne est reconnue à son nom : deux homonymes peuvent être confondus, ce qui se corrige sur
          simple demande.
        </li>
        <li>
          <strong>Limites.</strong> Aucune donnée sensible, aucune adresse ni téléphone personnels, aucune évaluation
          des personnes : seules les informations des listes officielles sont reprises.
        </li>
        <li>
          <strong>Conservation.</strong> Ces informations constituent une archive de la vie parlementaire et sont
          conservées sans limite de durée, à l&apos;image des publications officielles dont elles sont issues.
        </li>
      </ul>

      <h3>Adresses email professionnelles déduites</h3>
      <p>
        Pour les comptes connectés, la rubrique Collaborateurs affiche une adresse email professionnelle déduite des
        règles de nommage des assemblées (par exemple <code>prenom.nom@clb-an.fr</code> ou{" "}
        <code>initiales.nom@clb.senat.fr</code>). Ces adresses :
      </p>
      <ul>
        <li>ne sont publiées par aucune institution et ne sont pas vérifiées : elles peuvent être inexactes ;</li>
        <li>sont calculées à partir du nom publié, jamais collectées ailleurs ;</li>
        <li>
          servent à permettre un contact professionnel avec les équipes parlementaires, dans le cadre de leurs
          fonctions (intérêt légitime) ; les CGU interdisent le harcèlement, la prospection commerciale sans rapport
          avec l&apos;activité parlementaire et la revente des listes ;
        </li>
        <li>
          cessent d&apos;être affichées dès que la personne concernée le demande : <a href={CONTACT_RGPD}>formulaire
          de contact</a>, sujet « Demande RGPD ».
        </li>
      </ul>

      <h3>Droits des personnes concernées</h3>
      <p>
        Toute personne concernée peut demander l&apos;accès à ses données, la rectification d&apos;une erreur, le
        masquage de son adresse déduite, ou s&apos;opposer au traitement pour des raisons tenant à sa situation
        particulière. Chaque demande d&apos;opposition est examinée au cas par cas, en la mettant en balance avec
        l&apos;intérêt public de l&apos;information. Cette page tient lieu d&apos;information des personnes concernées : les contacter
        individuellement exigerait des efforts disproportionnés (art. 14, 5, b du RGPD).
      </p>

      <h2>4. Prestataires et transferts</h2>
      <table>
        <thead><tr><th>Prestataire</th><th>Rôle</th><th>Localisation</th></tr></thead>
        <tbody>
          <tr><td>Supabase</td><td>Base de données, comptes</td><td>Union européenne (Irlande)</td></tr>
          <tr><td>Vercel</td><td>Hébergement du site</td><td>États-Unis, réseau mondial</td></tr>
          <tr><td>Resend</td><td>Envoi des emails</td><td>Envoi depuis l&apos;Union européenne (Irlande) ; société américaine</td></tr>
          <tr><td>AppLixir (et ses régies)</td><td>Vidéo publicitaire, seulement si l&apos;utilisateur choisit de la regarder pour débloquer une fiche ; reçoit un jeton aléatoire, pas le compte</td><td>Société américaine ; responsable de ses propres traitements publicitaires (voir la page Cookies)</td></tr>
          <tr><td>Google (Analytics 4, Tag Manager, AdSense)</td><td>Mesure d&apos;audience et publicité, uniquement après acceptation dans le bandeau</td><td>États-Unis, réseau mondial</td></tr>
          <tr><td>Microsoft (Clarity)</td><td>Mesure comportementale, uniquement après acceptation de la mesure d&apos;audience</td><td>États-Unis (Azure)</td></tr>
          <tr><td>Google, GitHub</td><td>Connexion, uniquement si l&apos;utilisateur choisit ces services</td><td>Union européenne et États-Unis</td></tr>
        </tbody>
      </table>
      <p>
        Les transferts hors de l&apos;Union européenne sont encadrés, selon le prestataire, par le cadre de protection
        des données UE-États-Unis ou par les clauses contractuelles types de la Commission européenne. La Suisse
        bénéficie d&apos;une décision d&apos;adéquation.
      </p>

      <h2>5. Droits de l&apos;utilisateur</h2>
      <p>
        L&apos;utilisateur dispose des droits d&apos;accès, de rectification, d&apos;effacement, de limitation, de
        portabilité et d&apos;opposition, ainsi que du droit de retirer son consentement à tout moment et de définir
        des directives sur le sort de ses données après son décès.
      </p>
      <ul>
        <li>Export et suppression du compte : directement depuis <a href="/mon-compte">Mon compte</a>.</li>
        <li>Alertes : désactivation depuis la page <a href="/alertes">Alertes</a> ou lien de désinscription dans chaque email.</li>
        <li>Toute autre demande : <a href={CONTACT_RGPD}>formulaire de contact</a>, sujet « Demande RGPD ». Réponse sous un mois.</li>
      </ul>
      <p>
        Si l&apos;utilisateur estime que ses droits ne sont pas respectés, il peut saisir la CNIL (<a href="https://www.cnil.fr">cnil.fr</a>).
      </p>
    </>
  );
}
