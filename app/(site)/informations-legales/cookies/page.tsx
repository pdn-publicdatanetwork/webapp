import type { Metadata } from "next";

import { HistoriqueTexte, VERSIONS } from "../historique";

export const metadata: Metadata = { title: "Cookies" };

export default function Cookies() {
  return (
    <>
      <h1><span className="surligne">Cookies</span></h1>
      <HistoriqueTexte versions={VERSIONS.cookies} />
      <p>
        Par défaut, les seuls cookies déposés sont strictement nécessaires au service : ils sont dispensés de
        consentement (article 82 de la loi Informatique et libertés). La mesure d&apos;audience et la publicité
        ne sont activées qu&apos;après l&apos;accord de l&apos;utilisateur, donné dans le bandeau d&apos;accueil — elles
        peuvent être refusées ou ajustées à tout moment en supprimant les cookies du navigateur.
      </p>
      <p>
        Une seule exception, à la demande de l&apos;utilisateur : pour débloquer gratuitement le parcours d&apos;une
        fiche collaborateur, l&apos;utilisateur peut choisir de regarder une courte vidéo publicitaire. Le lecteur de
        notre partenaire AppLixir n&apos;est chargé qu&apos;après un clic sur « Regarder la vidéo » (voir plus bas).
      </p>

      <h2>Ce qui est stocké</h2>
      <p>
        Ces cookies sont posés sur le domaine <code>dataparl.fr</code>, pour qu&apos;une seule connexion vaille sur
        le site et sur l&apos;espace API.
      </p>
      <table>
        <thead><tr><th>Nom</th><th>Rôle</th><th>Durée</th></tr></thead>
        <tbody>
          <tr>
            <td><code>dp-auth.0</code>, <code>dp-auth.1</code>… (cookies)</td>
            <td>Garder la session ouverte une fois l&apos;utilisateur connecté ; la session est découpée en plusieurs cookies</td>
            <td>Jusqu&apos;à la déconnexion, 30 jours au plus</td>
          </tr>
          <tr>
            <td><code>dp-auth-code-verifier.0</code> (cookie)</td>
            <td>Sécuriser la connexion via Google ou GitHub, le temps de l&apos;aller-retour</td>
            <td>Quelques minutes</td>
          </tr>
          <tr>
            <td><code>dp_consentement_v1.0</code> (cookie)</td>
            <td>Mémoriser le choix de consentement : mesure d&apos;audience et publicité accordées ou refusées</td>
            <td>30 jours</td>
          </tr>
        </tbody>
      </table>
      <p>
        Si l&apos;utilisateur choisit de se connecter avec Google ou GitHub, ces services déposent leurs propres
        cookies sur leurs domaines, selon leurs politiques respectives. DataParl&apos; n&apos;y a pas accès.
      </p>

      <h2>Mesure d&apos;audience et publicité (avec l&apos;accord de l&apos;utilisateur)</h2>
      <p>
        Si l&apos;utilisateur les accepte, deux traitements complémentaires sont activés, pilotés par le bandeau du
        site (pas par une bannière Google) :
      </p>
      <ul>
        <li><strong>Mesure d&apos;audience</strong> : statistiques de fréquentation anonymisées, pour savoir quelles
          pages sont lues et améliorer le site ;</li>
        <li><strong>Publicité</strong> : annonces de Google AdSense, avec personnalisation publicitaire si
          l&apos;utilisateur l&apos;accepte — sinon, des annonces non personnalisées.</li>
      </ul>
      <p>
        Ces choix sont transmis à Google (Tag Manager et AdSense) via les signaux de consentement officiels
        (Consent Mode v2) : tant que l&apos;utilisateur n&apos;a pas répondu, ou en cas de refus, aucun cookie publicitaire
        ni cookie de mesure n&apos;est déposé et aucune annonce personnalisée n&apos;est diffusée.
      </p>
      <p>
        La mesure d&apos;audience inclut, avec le même accord, <strong>Microsoft Clarity</strong> : heatmaps et
        enregistrements de session, pour comprendre comment le site est utilisé. Clarity masque
        automatiquement les zones de saisie de l&apos;utilisateur dans ses enregistrements. Sans accord, le script
        Clarity n&apos;est jamais chargé.
      </p>

      <h2>Vidéo publicitaire (à la demande de l&apos;utilisateur)</h2>
      <p>
        Quand l&apos;utilisateur lance la vidéo, le lecteur d&apos;AppLixir et les régies publicitaires qui
        fournissent la vidéo peuvent déposer ou lire des cookies et identifiants publicitaires sur son appareil,
        pour diffuser la publicité, en limiter la répétition, lutter contre la fraude et la mesurer. Le lecteur
        peut demander son accord pour une publicité personnalisée : en cas de refus, une publicité non
        personnalisée est proposée. Ces traitements relèvent de la responsabilité d&apos;AppLixir et de ses
        partenaires, selon leurs propres politiques.
      </p>
      <p>
        DataParl&apos; ne transmet à AppLixir ni l&apos;adresse, ni l&apos;identifiant de compte, ni la fiche
        consultée : seulement un jeton aléatoire à usage unique, qui permet à notre serveur de vérifier que la
        vidéo a été vue jusqu&apos;au bout. Si aucune vidéo n&apos;est lancée, rien de tout cela n&apos;a lieu.
      </p>

      <h2>Gérer ou supprimer</h2>
      <p>
        L&apos;utilisateur peut effacer ces éléments à tout moment depuis les réglages de son navigateur (données de
        site) ; la session sera simplement fermée.
      </p>
      <p>
        Un bloqueur de publicité empêche la vidéo de se charger : la fiche reste alors bloquée, le reste du site
        fonctionne normalement. Pour revoir les choix de consentement, supprimer les cookies du site suffit : le
        bandeau s&apos;affichera à nouveau.
      </p>
    </>
  );
}
