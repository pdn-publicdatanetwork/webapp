import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Informations légales",
  description:
    "Informations légales de DataParl' Jobs : éditeur, comptes et connexion, conditions d'utilisation, sécurité, données personnelles (CV Matching), hébergement et sous-traitants, droits RGPD.",
  alternates: { canonical: "/informations-legales" },
};

const SOMMAIRE: [string, string][] = [
  ["Éditeur", "editeur"],
  ["Comptes et connexion", "comptes"],
  ["Conditions d'utilisation", "conditions"],
  ["Sécurité", "securite"],
  ["Données personnelles", "donnees"],
  ["Hébergement et sous-traitants", "hebergement"],
  ["Vos droits", "droits"],
];

export default function Page() {
  const lien = "text-[#6C84B0] underline";
  const h2 = "font-serif-title font-bold text-[#4E2E53] text-lg";
  const carte = "bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm";
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className={`${carte} space-y-4`}>
        <span className="bg-[#E4BDE9] text-[#4E2E53] text-xs font-bold px-2.5 py-1 rounded-full">Informations légales</span>
        <h1 className="text-2xl sm:text-3xl font-serif-title font-bold text-[#4E2E53]">
          Informations légales
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          DataParl&apos; Jobs (jobs.dataparl.fr) est la plateforme d&apos;emploi de DataParl&apos;, Civic Tech et
          RegTech. Les textes légaux généraux sont publiés sur{" "}
          <a href="https://www.dataparl.fr/informations-legales" className={lien}>www.dataparl.fr</a>.
        </p>
        <nav aria-label="Sommaire" className="flex flex-wrap gap-2">
          {SOMMAIRE.map(([libelle, ancre]) => (
            <a key={ancre} href={`#${ancre}`} className="bg-[#ECF1FC] text-[#4E2E53] text-xs font-medium px-3 py-1.5 rounded-full hover:bg-[#E4BDE9] transition-colors">
              {libelle}
            </a>
          ))}
        </nav>
      </div>

      <section id="editeur" className={`${carte} space-y-3`}>
        <h2 className={h2}>Éditeur</h2>
        <p className="text-sm text-slate-700 leading-relaxed">
          Conformément à l&apos;article 6 de la LCEN, l&apos;éditeur a choisi de ne pas rendre publique son
          identité. Directeur de la publication : l&apos;équipe éditoriale DataParl&apos;.
        </p>
        <p className="text-sm text-slate-700 leading-relaxed">
          DataParl&apos; Jobs exerce deux activités distinctes.
        </p>
        <p className="text-sm text-slate-700 leading-relaxed">
          <strong>Agrégateur d&apos;emploi (moteur de recherche)</strong> : les offres sont collectées
          automatiquement sur des sites publics d&apos;annonces d&apos;emplois parlementaires, puis vérifiées,
          corrigées et enrichies par un traitement assisté par intelligence artificielle (modèle Mistral
          Small, mistral-small-latest, édité par Mistral AI SAS, société française), sous le contrôle de
          l&apos;équipe éditoriale, qui peut corriger ou retirer une offre à tout moment. DataParl&apos; Jobs
          n&apos;est pas l&apos;auteur de ces annonces.
        </p>
        <p className="text-sm text-slate-700 leading-relaxed">
          <strong>Site de gestion d&apos;annonces (job board)</strong> : les offres déposées par les
          parlementaires sont relues par l&apos;équipe éditoriale avant publication ; pour celles-ci,
          DataParl&apos; Jobs agit comme sous-traitant (article 28 du RGPD) de l&apos;équipe parlementaire
          responsable du traitement.
        </p>
        <p className="text-sm text-slate-700 leading-relaxed">
          Nos messages proviennent uniquement du domaine dataparl.fr. Pour toute demande :{" "}
          <a href="/contact" className={lien}>formulaire de contact</a>.
        </p>
      </section>

      <section id="comptes" className={`${carte} space-y-3`}>
        <h2 className={h2}>Comptes et connexion</h2>
        <p className="text-sm text-slate-700 leading-relaxed">
          La connexion utilise le compte DataParl&apos; partagé avec www.dataparl.fr : lien magique par e-mail
          ou connexion Google. Elle est gérée par notre prestataire d&apos;authentification (Supabase), auquel
          sont transmis votre adresse e-mail et vos identifiants de session, conservés tant que le compte
          existe.
        </p>
        <p className="text-sm text-slate-700 leading-relaxed">
          La consultation des listes d&apos;offres est libre. La lecture complète des offres, le CV Matching,
          les alertes et l&apos;espace recruteur nécessitent un compte. Vous pouvez supprimer votre compte et
          vos données directement depuis votre espace{" "}
          <a href="/mon-compte" className={lien}>Mon compte</a>. La suppression est immédiate et
          définitive : votre compte étant unique, elle vaut aussi pour www.dataparl.fr, et efface vos
          alertes ainsi que les données issues du CV Matching.
        </p>
      </section>

      <section id="conditions" className={`${carte} space-y-3`}>
        <h2 className={h2}>Conditions d&apos;utilisation</h2>
        <p className="text-sm text-slate-700 leading-relaxed">
          DataParl&apos; Jobs est gratuit pour les postulants : consulter les offres, candidater, recevoir
          des alertes et utiliser le CV Matching ne coûte rien. Le service est financé par des espaces
          publicitaires et par des solutions payantes proposées aux équipes parlementaires pour la
          publication et la valorisation de leurs annonces.
        </p>
        <p className="text-sm text-slate-700 leading-relaxed">
          Les offres collectées sont relues avant publication, mais seules l&apos;annonce d&apos;origine et
          l&apos;équipe parlementaire font foi : DataParl&apos; ne garantit pas l&apos;exactitude ni
          l&apos;exhaustivité des annonces et ne participe pas au recrutement.
        </p>
        <p className="text-sm text-slate-700 leading-relaxed">
          Les candidatures sont envoyées directement aux équipes parlementaires. Leur envoi n&apos;est
          comptabilisé que de façon anonyme (compteur global sur 30 jours, visible sur chaque offre).
        </p>
        <p className="text-sm text-slate-700 leading-relaxed">
          <strong>Usages interdits</strong> : il est interdit de créer un compte sous une fausse identité, de
          déposer une annonce trompeuse (l&apos;espace recruteur est réservé aux adresses parlementaires et à
          l&apos;équipe DataParl&apos;), de contourner les protections anti-robot ou d&apos;extraire massivement le
          site en dehors de l&apos;API publique documentée.
        </p>
        <p className="text-sm text-slate-700 leading-relaxed">
          <strong>Modération et signalement</strong> : une annonce inexacte ou illicite peut être signalée
          directement depuis sa page ou via le{" "}
          <a href="/contact" className={lien}>formulaire de contact</a>. L&apos;équipe éditoriale peut
          corriger, refuser ou retirer une annonce à tout moment.
        </p>
        <p className="text-sm text-slate-700 leading-relaxed">
          <strong>Évolution du service</strong> : DataParl&apos; peut faire évoluer le service et les présentes
          conditions ; la date de la dernière mise à jour figure en bas de page.
        </p>
      </section>

      <section id="securite" className={`${carte} space-y-3`}>
        <h2 className={h2}>Sécurité</h2>
        <p className="text-sm text-slate-700 leading-relaxed">
          <strong>Mesures appliquées au service</strong> : comptes sans mot de passe (lien magique par
          e-mail ou connexion Google, gérés par Supabase), échanges chiffrés en TLS 1.3, vérification
          anti-robot (Cloudflare Turnstile) devant les formulaires et les adresses de contact, e-mails
          authentifiés par SPF, DKIM et DMARC.
        </p>
        <p className="text-sm text-slate-700 leading-relaxed">
          <strong>Reconnaître nos messages</strong> : nos e-mails proviennent uniquement du domaine
          dataparl.fr et leurs liens pointent toujours vers un site dataparl.fr. Nous ne vous demanderons
          jamais un mot de passe, un code ou des informations bancaires, et nous n&apos;envoyons pas de
          pièce jointe inattendue.
        </p>
        <p className="text-sm text-slate-700 leading-relaxed">
          <strong>En cas de doute</strong> : ne vous connectez jamais depuis un lien reçu par e-mail,
          tapez vous-même l&apos;adresse du site. Si vous avez saisi vos identifiants sur une page suspecte,
          changez immédiatement le mot de passe de votre messagerie ou de votre compte Google, puis
          signalez-nous l&apos;e-mail via le{" "}
          <a href="/contact" className={lien}>formulaire de contact</a> (sujet « Signaler un phishing »).
        </p>
      </section>

      <section id="donnees" className={`${carte} space-y-4`}>
        <h2 className={h2}>Données personnelles</h2>
        <p className="text-sm text-slate-700 leading-relaxed">
          DataParl&apos; Jobs est responsable de traitement des données collectées sur ce site, à l&apos;exception
          des offres déposées par les équipes parlementaires, pour lesquelles l&apos;équipe parlementaire est
          responsable de traitement et DataParl&apos; Jobs agit comme sous-traitant (article 28 du RGPD).
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm text-left border-collapse">
            <caption className="sr-only">Récapitulatif des traitements de données personnelles</caption>
            <thead>
              <tr className="bg-[#ECF1FC] text-[#4E2E53]">
                <th scope="col" className="px-3 py-2 font-semibold">Traitement</th>
                <th scope="col" className="px-3 py-2 font-semibold">Données</th>
                <th scope="col" className="px-3 py-2 font-semibold">Durée</th>
                <th scope="col" className="px-3 py-2 font-semibold">Finalité</th>
              </tr>
            </thead>
            <tbody className="text-slate-700">
              <tr>
                <td className="px-3 py-2 border-b border-slate-100">Comptes</td>
                <td className="px-3 py-2 border-b border-slate-100">Adresse e-mail, identifiant de session</td>
                <td className="px-3 py-2 border-b border-slate-100">Tant que le compte existe</td>
                <td className="px-3 py-2 border-b border-slate-100">Connexion, espace recruteur</td>
              </tr>
              <tr>
                <td className="px-3 py-2 border-b border-slate-100">Mesure d&apos;audience</td>
                <td className="px-3 py-2 border-b border-slate-100">Pages vues, clics, cookies (Google Analytics via Google Tag Manager)</td>
                <td className="px-3 py-2 border-b border-slate-100">30 jours (statistiques internes)</td>
                <td className="px-3 py-2 border-b border-slate-100">Mesure d&apos;audience</td>
              </tr>
              <tr>
                <td className="px-3 py-2 border-b border-slate-100">CV Matching</td>
                <td className="px-3 py-2 border-b border-slate-100">Texte du CV (jamais stocké), coordonnées détectées, compétences</td>
                <td className="px-3 py-2 border-b border-slate-100">Coordonnées et compétences : 3 mois (espace Mon compte)</td>
                <td className="px-3 py-2 border-b border-slate-100">Correspondance avec les offres</td>
              </tr>
              <tr>
                <td className="px-3 py-2 border-b border-slate-100">Alertes</td>
                <td className="px-3 py-2 border-b border-slate-100">Adresse e-mail</td>
                <td className="px-3 py-2 border-b border-slate-100">Tant que l&apos;abonnement est actif</td>
                <td className="px-3 py-2 border-b border-slate-100">Envoi des nouvelles offres</td>
              </tr>
              <tr>
                <td className="px-3 py-2">Offres</td>
                <td className="px-3 py-2">Titre, équipe parlementaire, description</td>
                <td className="px-3 py-2">2 ans après expiration</td>
                <td className="px-3 py-2">Publication, recherche, API publique</td>
              </tr>
            </tbody>
          </table>
        </div>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-700 leading-relaxed">
          <li>
            <strong>Mesure d&apos;audience</strong> : Google Analytics via Google Tag Manager dépose des
            cookies et traite l&apos;adresse IP via Google, comme sur www.dataparl.fr ; un comptage interne
            des pages vues et des clics, sans cookie, complète la mesure. Pour les visiteurs connectés,
            l&apos;adresse e-mail du compte y est associée (statistiques internes, jamais partagées).
          </li>
          <li>
            <strong>CV Matching</strong> : le texte du CV est analysé localement par mots-clés, puis transmis
            à l&apos;API La Plateforme de Mistral AI SAS (société française, modèle Mistral Small) pour
            affiner le résultat. Il n&apos;est jamais stocké dans nos bases ; Mistral le conserve au maximum
            30 jours à des fins de détection d&apos;abus et ne l&apos;utilise pas pour entraîner ses modèles.
            Le score obtenu est purement indicatif : aucune décision automatisée n&apos;est prise à votre égard.
            Seules les coordonnées et les compétences extraites sont conservées 3 mois dans votre espace
            Mon compte, à des fins de recrutement ; vous pouvez les supprimer à tout moment.
          </li>
          <li>
            <strong>Aucun profilage politique</strong> : l&apos;analyse mesure uniquement la correspondance
            entre votre profil et les offres.
          </li>
          <li>
            <strong>Alertes</strong> : adresse e-mail conservée tant que l&apos;abonnement est actif,
            désinscription en un clic. Envoi par notre prestataire Resend.
          </li>
          <li>
            <strong>Offres déposées</strong> : transmises à l&apos;équipe de relecture via une notification
            interne (Slack) avant publication.
          </li>
          <li>
            <strong>Coordonnées des équipes parlementaires</strong> : jamais affichées en clair, protégées
            par la vérification anti-robot.
          </li>
        </ul>
      </section>

      <section id="hebergement" className={`${carte} space-y-3`}>
        <h2 className={h2}>Hébergement et sous-traitants</h2>
        <p className="text-sm text-slate-700 leading-relaxed">
          Hébergeur : Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis ({" "}
          <a href="https://vercel.com" className={lien}>vercel.com</a>). Les applications et les pages sont
          servies depuis l&apos;Union européenne (région Paris).
        </p>
        <p className="text-sm text-slate-700 leading-relaxed">
          L&apos;authentification est gérée par Supabase, les données du service (offres, alertes, statistiques internes) sont stockées par Google Cloud (Firestore). La protection anti-robot et le masquage des adresses de contact
          sont assurés par Cloudflare (Turnstile). L&apos;analyse IA des CV est réalisée par Mistral AI
          (France). Les e-mails transactionnels sont envoyés par Resend.
        </p>
        <p className="text-sm text-slate-700 leading-relaxed">
          Les échanges sont chiffrés en TLS 1.3.
        </p>
      </section>

      <section id="droits" className={`${carte} space-y-3`}>
        <h2 className={h2}>Vos droits</h2>
        <p className="text-sm text-slate-700 leading-relaxed">
          Vous disposez d&apos;un droit d&apos;accès, de rectification, de suppression, d&apos;opposition
          et de portabilité sur vos données. Pour l&apos;exercer :{" "}
          <a href="/contact" className={lien}>formulaire de contact</a> (sujet RGPD). Réponse sous un mois.
        </p>
        <p className="text-sm text-slate-700 leading-relaxed">
          En cas de désaccord, vous pouvez introduire une réclamation auprès de la CNIL :{" "}
          <a href="https://www.cnil.fr" className={lien}>cnil.fr</a>.
        </p>
      </section>

      <p className="text-xs text-slate-400">Dernière mise à jour : novembre 2026.</p>
    </div>
  );
}
