import type { Metadata } from "next";
import { CONTACT_URL } from "../maj";

import { HistoriqueTexte, VERSIONS } from "../historique";

export const metadata: Metadata = { title: "Conditions d'utilisation" };

export default function CGU() {
  return (
    <>
      <h1>Conditions <span className="surligne">d&apos;utilisation</span></h1>
      <HistoriqueTexte versions={VERSIONS.cgu} />

      <h2>1. Objet</h2>
      <p>
        DataParl&apos; recense les collaborateurs des députés, sénateurs et eurodéputés à partir des publications
        officielles, et signale leurs arrivées, départs et transferts. Les présentes conditions encadrent
        l&apos;utilisation du site, des alertes par email et du compte utilisateur. L&apos;usage de l&apos;API relève en
        plus des <a href="/informations-legales/cgu-api">conditions d&apos;utilisation de l&apos;API</a>.
      </p>
      <p>
        <strong>Définition de l&apos;utilisateur.</strong> Au sens des présentes conditions, l&apos;utilisateur désigne toute
        personne qui consulte le site, y effectue une recherche, s&apos;abonne aux alertes par email ou crée un compte.
        L&apos;utilisateur est informé que ces conditions s&apos;appliquent dès la première visite du site.
      </p>
      <p>Utiliser le site, créer un compte ou s&apos;abonner aux alertes vaut acceptation de ces conditions.</p>

      <h2>2. Accès</h2>
      <p>Le service est gratuit.</p>
      <p>
        <strong>Spécificité des fiches collaborateurs et vidéo publicitaire :</strong> le déblocage temporaire des fiches via
        une courte vidéo publicitaire sert directement à financer l&apos;infrastructure technique (serveurs et nom de domaine).
        Le visionnage complet est requis et toute tentative de contournement, de profilage ou de démarchage à partir de ces
        données est strictement interdite.
      </p>
      <p>
        Le service est fourni en l&apos;état, sans garantie de disponibilité : il peut être interrompu pour maintenance, en
        cas d&apos;indisponibilité d&apos;une source ou de l&apos;hébergeur.
      </p>

      <h2>3. Compte</h2>
      <p>
        Un compte se crée avec une adresse email (code de connexion à usage unique) ou via Google ou GitHub.
        L&apos;utilisateur peut exporter ses données ou supprimer son compte à tout moment depuis{" "}
        <a href="/mon-compte">Mon compte</a>.
      </p>
      <p>
        <strong>Suppression du compte.</strong> La suppression est immédiate et définitive : le compte ne permet plus de se
        connecter et les réglages et abonnements associés sont effacés. Pour assurer la sécurité du service et conserver un
        historique fiable des comptes, DataParl&apos; garde un enregistrement minimal de chaque compte supprimé. Cet
        enregistrement ne donne accès à aucune donnée du compte et ne permet pas de le recréer. Le détail figure sur la
        page <a href="/informations-legales/confidentialite">Données personnelles</a>.
      </p>

      <h2>4. Alertes par email</h2>
      <p>
        L&apos;abonnement aux alertes repose sur le consentement de l&apos;utilisateur, confirmé par email (double
        validation). Chaque alerte contient un lien pour régler ses préférences et un lien de désinscription en un clic.
      </p>

      <h2>5. Nature et limites des informations</h2>
      <ul>
        <li>Les données reprennent les listes publiées par les assemblées ; DataParl&apos; ne les modifie pas sur le fond.</li>
        <li>
          Les mouvements sont détectés automatiquement en comparant deux publications successives. La date indiquée est
          celle à laquelle le changement a été constaté, pas la date du contrat de travail, que les sources ne publient
          pas.
        </li>
        <li>
          Des erreurs sont possibles (homonymes, coquille dans la source, publication tardive ou incomplète). Un
          mouvement signalé n&apos;emporte aucun jugement sur les personnes concernées.
        </li>
        <li>
          La méthode, les sources et leurs limites sont documentées publiquement dans le dépôt{" "}
          <a href="https://github.com/dataparl/collaborateurs">dataparl/collaborateurs</a>.
        </li>
      </ul>
      <p>
        Pour signaler une erreur : <a href={CONTACT_URL}>formulaire de contact</a>. Les corrections justifiées sont
        appliquées dans les meilleurs délais.
      </p>

      <h2>6. Fiches collaborateurs et vidéo publicitaire</h2>
      <p>
        Le parcours complet d&apos;un collaborateur (les élus pour qui il ou elle a travaillé, avec les dates) est
        réservé aux comptes. Il se débloque gratuitement en regardant une courte vidéo publicitaire, pour{" "}
        24 heures et pour la fiche concernée. Le déblocage n&apos;est accordé qu&apos;une fois la vidéo vue jusqu&apos;au
        bout, sur confirmation de notre partenaire publicitaire. Contourner ce mécanisme (blocage, automatisation,
        extraction massive des fiches) est interdit. Ces fiches servent l&apos;information sur le fonctionnement des
        assemblées : elles ne doivent pas être utilisées pour profiler, démarcher ou nuire aux personnes.
      </p>

      <h2>6 bis. Adresses email déduites</h2>
      <p>
        La rubrique <a href="/collab">Collaborateurs</a>, réservée aux comptes, affiche des adresses email déduites des
        règles de nommage des assemblées. Elles ne sont publiées par aucune institution, ne sont pas vérifiées et peuvent
        être inexactes. Elles servent à contacter les équipes parlementaires dans le cadre de leurs fonctions.
      </p>
      <p>
        Toute personne concernée peut demander que son adresse ne soit plus affichée, via le{" "}
        <a href="/contact?sujet=rgpd">formulaire de contact</a> (sujet « Demande RGPD »).
      </p>

      <h2>7. Usages interdits</h2>
      <ul>
        <li>utiliser les informations ou les adresses pour harceler, menacer ou discriminer les personnes citées ;</li>
        <li>envoyer des sollicitations commerciales sans rapport avec l&apos;activité parlementaire, ou en masse ;</li>
        <li>revendre, céder ou publier les listes d&apos;adresses obtenues ;</li>
        <li>extraire le site de manière automatisée en dehors de l&apos;API, ou chercher à contourner ses limites ;</li>
        <li>porter atteinte à la sécurité ou au fonctionnement du service ;</li>
        <li>présenter les informations de façon trompeuse, notamment en les sortant de leur contexte ou de leur date.</li>
      </ul>
      <p>Un usage contraire à ces règles peut entraîner la suspension du compte ou des clés API concernés.</p>

      <h2>8. Responsabilité</h2>
      <p>
        L&apos;éditeur met en œuvre des moyens raisonnables pour assurer l&apos;exactitude des informations, sans pouvoir
        la garantir. Il ne saurait être tenu responsable de l&apos;usage fait des informations par les utilisateurs ou
        les réutilisateurs, ni des contenus des sites vers lesquels DataParl&apos; renvoie.
      </p>

      <h2>9. Modification des conditions</h2>
      <p>
        Ces conditions peuvent évoluer. La date de mise à jour figure en haut de page ; en cas de changement important,
        les titulaires d&apos;un compte en sont informés par email.
      </p>

      <h2>10. Droit applicable</h2>
      <p>
        Les présentes conditions sont régies par le droit français. En cas de litige, une solution amiable est
        recherchée en priorité ; à défaut, les tribunaux français sont compétents.
      </p>
    </>
  );
}
