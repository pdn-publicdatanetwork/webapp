import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Informations légales",
  description:
    "Informations légales de DataParl' Jobs : éditeur, comptes et connexion, conditions d'utilisation, données personnelles (CV Matching), hébergement et sous-traitants, droits RGPD.",
  alternates: { canonical: "/informations-legales" },
};

const SOMMAIRE: [string, string][] = [
  ["Éditeur", "editeur"],
  ["Comptes et connexion", "comptes"],
  ["Conditions d'utilisation", "conditions"],
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
          DataParl&apos; Jobs (jobs.dataparl.fr) est un service de DataParl&apos;, projet civique de suivi de
          l&apos;écosystème parlementaire français. Les textes légaux généraux sont publiés sur{" "}
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
          Les offres publiées sont collectées automatiquement sur des sites publics d&apos;annonces d&apos;emplois
          parlementaires, ou déposées directement par les élus et leurs cabinets. Les annonces collectées sont vérifiées, corrigées et enrichies par un traitement assisté par intelligence artificielle (modèle Mistral Small, mistral-small-latest, édité par Mistral AI SAS, société française), sous le contrôle de l&apos;équipe éditoriale, qui peut corriger ou retirer une offre à tout moment. Les offres déposées sont, elles, relues par un humain avant publication ; pour celles-ci, DataParl&apos; agit comme sous-traitant (article 28 du RGPD)
          de l&apos;équipe parlementaire responsable du traitement.
        </p>
        <p className="text-sm text-slate-700 leading-relaxed">
          Nos messages proviennent uniquement d&apos;adresses en @dataparl.fr : bienvenue@ pour la connexion et
          le compte, alerte-job@ pour les alertes emplois. Pour toute demande :{" "}
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
          les alertes et l&apos;espace recruteur nécessitent un compte. Vous pouvez demander la suppression de
          votre compte et de vos données via le{" "}
          <a href="/contact" className={lien}>formulaire de contact</a>.
        </p>
      </section>

      <section id="conditions" className={`${carte} space-y-3`}>
        <h2 className={h2}>Conditions d'utilisation</h2>
        <p className="text-sm text-slate-700 leading-relaxed">
          DataParl&apos; Jobs est un service d&apos;information gratuit, sans publicité.
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
          <strong>Modération et signalement</strong> : une annonce inexacte ou illicite peut être signalée via
          le{" "}<a href="/contact" className={lien}>formulaire de contact</a>. L&apos;équipe éditoriale peut
          corriger, refuser ou retirer une annonce à tout moment.
        </p>
        <p className="text-sm text-slate-700 leading-relaxed">
          <strong>Évolution du service</strong> : DataParl&apos; peut faire évoluer le service et les présentes
          conditions ; la date de la dernière mise à jour figure en bas de page.
        </p>
      </section>

      <section id="donnees" className={`${carte} space-y-4`}>
        <h2 className={h2}>Données personnelles</h2>
        <p className="text-sm text-slate-700 leading-relaxed">
          DataParl&apos; est responsable de traitement des données collectées sur ce site, à l&apos;exception
          des offres déposées par les équipes parlementaires, pour lesquelles l&apos;équipe parlementaire est
          responsable de traitement et DataParl&apos; agit comme sous-traitant (article 28 du RGPD).
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
                <td className="px-3 py-2 border-b border-slate-100">Coordonnées et compétences : 3 mois</td>
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
            <strong>Mesure d&apos;audience</strong> : Google Tag Manager et Google Analytics déposent des
            cookies et traitent l&apos;adresse IP via Google, comme sur www.dataparl.fr. S&apos;y ajoute un
            comptage interne des pages vues et des clics, sans cookie : pour les visiteurs connectés,
            l&apos;adresse e-mail du compte est associée aux visites (statistiques internes uniquement, jamais
            partagées).
          </li>
          <li>
            <strong>CV Matching</strong> : le texte de votre CV est d&apos;abord analysé localement (mise en
            correspondance par mots-clés), puis, pour affiner le résultat, transmis à l&apos;API La Plateforme de Mistral AI SAS (société française, Paris, hébergement par défaut dans l&apos;Union européenne), qui utilise le modèle Mistral Small (mistral-small-latest). Le texte du CV n&apos;est jamais stocké dans nos bases ; Mistral le conserve au maximum 30 jours à des fins de détection d&apos;abus et ne l&apos;utilise jamais pour entraîner ses modèles. Le score et le conseil obtenus sont purement indicatifs : aucune décision automatisée n&apos;est prise à votre égard, vous restez seul juge de vos candidatures. Seules les coordonnées détectées (e-mail, téléphone) et les
            compétences extraites sont conservées 3 mois à des fins de recrutement, puis effacées. Vous
            pouvez demander leur suppression à tout moment via le formulaire de contact.
          </li>
          <li>
            <strong>Aucun profilage politique</strong> : l&apos;analyse mesure uniquement la correspondance entre
            votre profil et les offres ; elle n&apos;évalue ni ne classe les candidats selon des opinions
            politiques.
          </li>
          <li>
            <strong>Alertes</strong> : votre adresse e-mail est conservée tant que l&apos;abonnement est actif,
            désinscription en un clic. L&apos;envoi est réalisé par notre prestataire d&apos;e-mails
            transactionnels (Resend).
          </li>
          <li>
            <strong>Offres déposées</strong> : leur contenu est transmis à l&apos;équipe de relecture via une
            notification interne (Slack) avant publication.
          </li>
          <li>
            <strong>Coordonnées des équipes parlementaires</strong> : les e-mails de contact des équipes ne
            sont jamais affichés en clair ; ils sont protégés par la vérification anti-robot.
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