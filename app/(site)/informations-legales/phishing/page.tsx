import type { Metadata } from "next";

import { HistoriqueTexte, VERSIONS } from "../historique";

export const metadata: Metadata = { title: "Phishing" };

export default function Phishing() {
  return (
    <>
      <h1>Reconna&icirc;tre un <span className="surligne">phishing</span></h1>
      <HistoriqueTexte versions={VERSIONS.phishing} />
      <p>
        Des courriels frauduleux pourraient tenter d&apos;imiter DataParl&apos; pour obtenir vos identifiants ou
        des informations personnelles. Cette page explique comment reconna&icirc;tre une tentative de phishing
        et quels courriels proviennent r&eacute;ellement de DataParl&apos;.
      </p>

      <h2>1. Les domaines qui envoient r&eacute;ellement du courriel</h2>
      <p>
        DataParl&apos; vous &eacute;crit uniquement depuis des adresses se terminant par{" "}
        <code>@dataparl.fr</code> ou <code>@dataparl.com</code>, quelle que soit la nature du message
        (bienvenue, alertes, r&eacute;ponses &agrave; une demande). Tout courriel se pr&eacute;sentant comme
        venant de DataParl&apos; depuis un autre domaine (<code>dataparl.org</code>, <code>dataparl.net</code>,{" "}
        <code>dataparl-eu.fr</code>, etc.) est frauduleux.
      </p>
      <p>
        Important : quel que soit le domaine de l&apos;exp&eacute;diteur, <strong>tous les liens cliquables</strong>
        d&apos;un v&eacute;ritable courriel DataParl&apos; m&egrave;nent toujours &agrave; une adresse qui se{" "}
        <strong>termine</strong> par <code>dataparl.fr</code> ou <code>dataparl.com</code>, quel que soit le
        sous-domaine inscrit avant (<code>www.dataparl.fr</code>, <code>survey.dataparl.fr</code>, etc.).
        Avant de cliquer, survolez le lien (ou appuyez longuement sur mobile) et v&eacute;rifiez la fin de
        l&apos;adresse affich&eacute;e : m&eacute;fiez-vous des adresses qui contiennent &laquo; dataparl &raquo;
        sans se terminer par <code>dataparl.fr</code> ou <code>dataparl.com</code>{" "}
        (<code>dataparl.fr.autre-site.com</code> est l&apos;adresse d&apos;un autre site).
      </p>

      <h2>2. Les comptes et r&eacute;seaux officiels</h2>
      <p>
        DataParl&apos; ne communique que depuis ces trois comptes, et n&apos;en a aucun autre :
      </p>
      <ul>
        <li><strong>Bluesky</strong> : toujours <code>@dataparl.fr</code> (<code>bsky.app/profile/dataparl.fr</code>) ;</li>
        <li><strong>X (Twitter)</strong> : <code>@DataParl_fr</code> (<code>x.com/DataParl_fr</code>) ;</li>
        <li><strong>Telegram</strong> : <code>t.me/dataparl_daily</code>.</li>
      </ul>
      <p>
        Tout autre compte, sur ces r&eacute;seaux ou sur d&apos;autres, qui se pr&eacute;sente comme
        DataParl&apos; est un faux compte. En cas de doute, v&eacute;rifiez l&apos;adresse du compte depuis la
        page &laquo; &Agrave; propos &raquo; du site.
      </p>

      <h2>3. Ce que DataParl&apos; ne fait jamais</h2>
      <p>
        Un courriel qui enfreint une seule de ces r&egrave;gles n&apos;&eacute;mane pas de DataParl&apos; :
      </p>
      <ul>
        <li>demander votre mot de passe, un code de connexion ou une information bancaire ;</li>
        <li>joindre une pi&egrave;ce jointe inattendue : nos courriels n&apos;en contiennent jamais ;</li>
        <li>vous presser d&apos;agir sous peine de suppression du compte ou de tout autre d&eacute;lai impos&eacute; ;</li>
        <li>utiliser un lien raccourci ou un domaine tiers &agrave; la place de <code>dataparl.fr</code> ;</li>
        <li>vous &eacute;crire sans que vous ayez agi sur le site (cr&eacute;ation de compte, demande de contact,
        inscription aux alertes).</li>
      </ul>

      <h2>4. Comment v&eacute;rifier un courriel douteux</h2>
      <ul>
        <li>
          <strong>V&eacute;rifiez l&apos;exp&eacute;diteur complet</strong>, pas seulement le nom affich&eacute; :
          dans Gmail (par exemple), cliquez sur le nom pour d&eacute;plier l&apos;adresse r&eacute;elle. Elle
          doit se terminer par <code>@dataparl.fr</code> ou <code>@dataparl.com</code>.
        </li>
        <li>
          <strong>Ne vous connectez jamais depuis un lien d&apos;un courriel</strong> : pour toute action
          sensible, ouvrez vous-m&ecirc;me <a href="https://www.dataparl.fr">www.dataparl.fr</a> dans votre
          navigateur et connectez-vous depuis l&apos;accueil.
        </li>
        <li>
          <strong>Au moindre doute, ne cliquez sur rien</strong> : aucune information ne peut &ecirc;tre
          compromise par la simple lecture d&apos;un courriel tant que vous n&apos;interagissez pas avec.
        </li>
      </ul>

      <h2>5. Nos protections</h2>
      <p>
        Les domaines d&apos;envoi de DataParl&apos; sont prot&eacute;g&eacute;s par les m&eacute;canismes
        standard anti-usurpation (SPF, DKIM et DMARC) : la plupart des fournisseurs de messagerie rejettent ou
        signalent automatiquement les courriels qui usurpent <code>dataparl.fr</code> ou{" "}
        <code>dataparl.com</code>. C&apos;est une protection forte, mais pas absolue : en cas de doute, les
        r&eacute;flexes ci-dessus restent la meilleure d&eacute;fense.
      </p>

      <h2>6. Signaler une tentative</h2>
      <p>
        Si vous recevez un courriel suspect en utilisant le nom de DataParl&apos;, ne r&eacute;pondez pas :
        transmettez-le via le <a href="/contact?sujet=phishing">formulaire de contact</a> (sujet &laquo;
        Signaler un phishing &raquo;). Nous v&eacute;rifions chaque signalement et prenons les mesures utiles.
      </p>
      <p>
        Si vous avez d&eacute;j&agrave; cliqu&eacute; sur un lien ou saisi un mot de passe sur une page
        suspecte : changez ce mot de passe imm&eacute;diatement (depuis le site officiel), et, s&apos;il sert
        ailleurs, changez-le aussi sur les autres services.
      </p>
    </>
  );
}
