import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Informations légales",
  description:
    "Informations légales de DataParl' Jobs : éditeur, comptes et connexion, données personnelles (CV Matching), hébergement et droits RGPD.",
  alternates: { canonical: "/informations-legales" },
};

export default function Page() {
  const lien = "text-[#6C84B0] underline";
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-3">
        <span className="bg-[#E4BDE9] text-[#4E2E53] text-xs font-bold px-2.5 py-1 rounded-full">Informations légales</span>
        <h1 className="text-2xl sm:text-3xl font-serif-title font-bold text-[#4E2E53]">
          Informations légales
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          DataParl&apos; Jobs (jobs.dataparl.fr) est un service de DataParl&apos;, projet civique de suivi de
          l&apos;écosystème parlementaire français. Les textes légaux généraux sont publiés sur{" "}
          <a href="https://www.dataparl.fr/informations-legales" className={lien}>www.dataparl.fr</a>.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-8 text-sm text-slate-700 leading-relaxed">
        <section className="space-y-2">
          <h2 className="font-serif-title font-bold text-[#4E2E53] text-lg">Éditeur</h2>
          <p>
            Conformément à l&apos;article 6 de la LCEN, l&apos;éditeur a choisi de ne pas rendre publique son
            identité. Directeur de la publication : l&apos;équipe éditoriale DataParl&apos;.
          </p>
          <p>
            Les offres publiées proviennent des sources officielles (Assemblée nationale, Sénat, Parlement
            européen) ou sont déposées par les élus et leurs cabinets, puis relues avant publication. Pour les
            offres déposées, DataParl&apos; agit comme sous-traitant (article 28 du RGPD) de l&apos;équipe
            parlementaire responsable de traitement.
          </p>
          <p>
            Pour toute demande : <a href="/contact" className={lien}>formulaire de contact</a>.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif-title font-bold text-[#4E2E53] text-lg">Comptes et connexion</h2>
          <p>
            La connexion utilise le compte DataParl&apos; partagé avec www.dataparl.fr (lien magique par
            e-mail ou Google), géré par notre prestataire d&apos;authentification. L&apos;inscription aux
            alertes et le CV Matching nécessitent un compte.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif-title font-bold text-[#4E2E53] text-lg">Données personnelles</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong>Mesure d&apos;audience</strong> : le site utilise Google Tag Manager et Google
              Analytics (dépôt de cookies, adresse IP traitée par Google), comme sur www.dataparl.fr, ainsi
              qu&apos;un comptage interne anonyme des pages vues et des clics, sans cookie ni identifiant.
            </li>
            <li>
              <strong>CV Matching</strong> : le texte de votre CV est analysé pour la correspondance avec les
              offres, puis <strong>jamais conservé</strong>. Seules les coordonnées détectées (e-mail,
              téléphone) et les compétences extraites sont conservées 3 mois à des fins de recrutement, puis
              effacées. Vous pouvez supprimer ces données à tout moment en autonomie depuis votre compte ou
              sur simple demande via le formulaire de contact.
            </li>
            <li><strong>Inscriptions aux alertes</strong> : conservées tant que l&apos;abonnement est actif ; désinscription en un clic.</li>
            <li><strong>Offres publiées</strong> : conservées 2 ans après leur expiration.</li>
            <li>
              <strong>Coordonnées des équipes parlementaires</strong> : les e-mails de contact des équipes
              parlementaires ne sont pas affichés publiquement.
            </li>
            <li>
              <strong>Aucun profilage politique</strong> : l&apos;analyse IA du CV mesure uniquement la
              correspondance avec les offres ; elle n&apos;évalue ni ne classe les candidats selon des
              opinions politiques.
            </li>
          </ul>
          <p>
            Pour exercer vos droits (accès, rectification, suppression) :{" "}
            <a href="/contact" className={lien}>formulaire de contact</a> (sujet RGPD) ou auprès de la CNIL
            (cnil.fr) en cas de désaccord.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif-title font-bold text-[#4E2E53] text-lg">Hébergement</h2>
          <p>
            Le site est hébergé par Vercel (infrastructures dans l&apos;Union européenne, région Paris). Les
            données d&apos;authentification sont gérées par Supabase, les offres sont stockées chez Google
            Firestore. Protection anti-robot et masquage des adresses de contact par Cloudflare (Turnstile) ;
            chiffrement des échanges en TLS 1.3.
          </p>
        </section>

        <p className="text-xs text-slate-400">Dernière mise à jour : novembre 2026.</p>
      </div>
    </div>
  );
}
