import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Informations légales : DataParl' Jobs",
  description: "Mentions légales, conditions d'utilisation et données personnelles de DataParl' Jobs.",
};

export default function Page() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-3">
        <span className="bg-[#E4BDE9] text-[#4E2E53] text-xs font-bold px-2.5 py-1 rounded-full">Informations légales</span>
        <h1 className="text-2xl sm:text-3xl font-serif-title font-bold text-[#4E2E53]">Informations légales</h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          DataParl&apos; Jobs est un service de DataParl&apos;, projet civique de suivi de l&apos;écosystème
          parlementaire français d&apos;après les publications officielles. Les textes légaux complets
          (CGU, politique de confidentialité, RGPD) sont publiés sur{" "}
          <a href="https://www.dataparl.fr/informations-legales" className="text-[#6C84B0] underline">www.dataparl.fr</a>.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-5 text-sm text-slate-700 leading-relaxed">
        <section className="space-y-2">
          <h2 className="font-serif-title font-bold text-[#4E2E53] text-lg">Éditeur</h2>
          <p>DataParl&apos; — les offres publiées proviennent des sources officielles (Assemblée nationale, Sénat, Parlement européen) ou sont déposées par les élus et leurs cabinets, puis relues avant publication.</p>
          <p>Pour toute demande : <a href="/contact" className="text-[#6C84B0] underline">formulaire de contact</a>.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif-title font-bold text-[#4E2E53] text-lg">Comptes et connexion</h2>
          <p>
            La connexion utilise le compte DataParl&apos; partagé avec www.dataparl.fr (lien magique par e-mail
            ou Google), géré par notre prestataire d&apos;authentification. L&apos;inscription aux alertes
            et le CV Matching nécessitent un compte.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif-title font-bold text-[#4E2E53] text-lg">Données personnelles</h2>
          <p>
            Dans le CV Matching, le texte de votre CV est analysé pour la correspondance avec les offres
            mais il n&apos;est jamais conservé. Seules les coordonnées détectées (e-mail, téléphone) et les
            compétences sont conservées à des fins de recrutement, sur nos serveurs, et peuvent être
            supprimées sur simple demande via le formulaire de contact.
          </p>
          <p>
            Les e-mails de contact des équipes parlementaires ne sont jamais affichés publiquement.
            Pour exercer vos droits (accès, rectification, suppression) :{" "}
            <a href="/contact" className="text-[#6C84B0] underline">formulaire de contact</a> (sujet RGPD).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif-title font-bold text-[#4E2E53] text-lg">Hébergement</h2>
          <p>Le site est hébergé par Vercel. Les données d&apos;authentification sont gérées par Supabase, les offres sont stockées chez Google Firestore (projet dataparl-jobs).</p>
        </section>

        <p className="text-xs text-slate-400">Dernière mise à jour : novembre 2026.</p>
      </div>
    </div>
  );
}
