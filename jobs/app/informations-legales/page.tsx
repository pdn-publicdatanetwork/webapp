import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Informations légales",
  description:
    "Informations légales et mentions obligatoires de DataParl' Jobs : double statut (agrégateur de données publiques, sous-traitant RGPD), conservation des données, sécurité et droits.",
  alternates: { canonical: "/informations-legales" },
};

export default function Page() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-3">
        <span className="bg-[#E4BDE9] text-[#4E2E53] text-xs font-bold px-2.5 py-1 rounded-full">Informations légales</span>
        <h1 className="text-2xl sm:text-3xl font-serif-title font-bold text-[#4E2E53]">
          Informations légales &amp; Mentions obligatoires
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          DataParl&apos; Jobs (jobs.dataparl.fr) est un service de DataParl&apos;, projet civique de suivi de
          l&apos;écosystème parlementaire français d&apos;après les publications officielles. Les textes légaux
          généraux sont publiés sur{" "}
          <a href="https://www.dataparl.fr/informations-legales" className="text-[#6C84B0] underline">www.dataparl.fr</a>.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-8 text-sm text-slate-700 leading-relaxed">
        <section className="space-y-2">
          <h2 className="font-serif-title font-bold text-[#4E2E53] text-lg">1. Éditeur</h2>
          <p>
            Conformément à l&apos;article 6 de la LCEN, l&apos;éditeur a choisi de ne pas rendre publique son
            identité. Toute demande passe par le{" "}
            <a href="/contact" className="text-[#6C84B0] underline">formulaire de contact</a> ; l&apos;équipe répond
            par e-mail et, le cas échéant, aux demandes des autorités compétentes.
          </p>
          <p>Directeur de la publication : l&apos;équipe éditoriale DataParl&apos;.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif-title font-bold text-[#4E2E53] text-lg">2. Double statut juridique</h2>
          <p>
            <strong>Agrégateur de données publiques.</strong> Pour les offres collectées automatiquement sur les
            sources officielles (Assemblée nationale, Sénat, Parlement européen), DataParl&apos; Jobs agit comme
            agrégateur : les informations reprises sont publiques, relues avant publication, et citées avec leur
            source. Aucune donnée personnelle n&apos;est collectée au-delà de ce qui figure dans les annonces.
          </p>
          <p>
            <strong>Sous-traitant RGPD (article 28).</strong> Pour les offres déposées directement par les
            parlementaires et leurs cabinets via l&apos;espace recruteur, DataParl&apos; Jobs agit comme
            sous-traitant de l&apos;équipe parlementaire (responsable de traitement) : les données de recrutement
            sont traitées uniquement sur instruction de l&apos;équipe, dans le cadre de sa procédure de recrutement,
            et ne sont ni revendues ni réutilisées.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif-title font-bold text-[#4E2E53] text-lg">3. Données personnelles et durées de conservation</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Offres publiées</strong> : conservées 2 ans après leur expiration, puis supprimées ou archivées de manière irréversible.</li>
            <li><strong>Comptes (lien magique ou Google)</strong> : e-mail de connexion conservé le temps du compte ; suppression simple sur demande via le formulaire de contact.</li>
            <li><strong>Inscriptions aux alertes</strong> : conservées tant que l&apos;abonnement est actif ; désinscription en un clic.</li>
            <li><strong>CV Matching</strong> : le texte du CV est analysé pour la correspondance mais <strong>jamais conservé</strong>. Seules les coordonnées détectées (e-mail, téléphone) et les compétences sont conservées 3 mois à des fins de recrutement, puis effacées.</li>
            <li><strong>Coordonnées des équipes parlementaires</strong> : les adresses de candidature ne sont pas affichées publiquement ; elles ne servent qu&apos;à transmettre les candidatures.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif-title font-bold text-[#4E2E53] text-lg">4. Absence de profilage</h2>
          <p>
            DataParl&apos; Jobs ne réalise aucun profilage politique des utilisateurs. L&apos;analyse IA du CV
            sert exclusivement à mesurer la correspondance avec les offres en ligne ; elle n&apos;évalue aucune
            opinion politique, ne classe pas les candidats sur ce critère et n&apos;alimente aucun scoring
            automatique discriminatoire. Les scores affichés sont indicatifs.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif-title font-bold text-[#4E2E53] text-lg">5. Sécurité et hébergement</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Hébergement : Vercel, infrastructures dans l&apos;Union européenne (région Paris) pour le site ; Google Firestore (projet dataparl-jobs) pour les offres ; Supabase pour l&apos;authentification.</li>
            <li>Protection anti-robot et masquage des adresses de contact par Cloudflare (Turnstile).</li>
            <li>Chiffrement des échanges en TLS 1.3.</li>
            <li>Authentification sans mot de passe : lien magique à usage unique ou connexion Google ; validation par code OTP (e-mail) pour les actions sensibles.</li>
            <li>Accès restreints : l&apos;espace recruteur exige une adresse autorisée (chambres parlementaires, équipe DataParl&apos;).</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif-title font-bold text-[#4E2E53] text-lg">6. Vos droits (RGPD)</h2>
          <p>
            Accès, rectification, effacement, limitation, opposition et portabilité : via le{" "}
            <a href="/contact" className="text-[#6C84B0] underline">formulaire de contact</a> (sujet RGPD) ou auprès de la
            CNIL (cnil.fr) en cas de désaccord.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif-title font-bold text-[#4E2E53] text-lg">7. Conditions applicables aux équipes parlementaires</h2>
          <p>
            L&apos;espace recruteur est réservé aux élus et cabinets avec une adresse autorisée. En déposant une
            offre, l&apos;équipe parlementaire confirme être responsable de traitement de son recrutement,
            détenir les droits sur le contenu publié et s&apos;engage à ne pas déposer de contenu discriminatoire.
            Les offres sont relues avant publication et peuvent être retirées sur simple demande.
          </p>
        </section>

        <p className="text-xs text-slate-400">Dernière mise à jour : novembre 2026.</p>
      </div>
    </div>
  );
}
