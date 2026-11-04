import Link from "next/link";

// Page d'accueil des démonstrations : aperçu des espaces avec fausses
// données, sans connexion ni action réelle.

export default function Page() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm space-y-3 text-center">
        <span className="bg-amber-100 text-amber-900 text-xs font-bold px-3 py-1 rounded-full">Mode démonstration</span>
        <h1 className="text-3xl font-serif-title font-bold text-[#4E2E53]">Aperçu des espaces DataParl&apos; Jobs</h1>
        <p className="text-sm text-slate-600 leading-relaxed max-w-xl mx-auto">
          Ces pages présentent les espaces candidat et recruteur avec de fausses données.
          Aucune connexion n&apos;est demandée, aucune action n&apos;est réellement envoyée.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Link href="/demo/candidat" className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-3 hover:border-[#4E2E53]/40 transition-all">
          <div className="w-11 h-11 rounded-2xl bg-[#E4BDE9] flex items-center justify-center text-xl">👤</div>
          <h2 className="font-serif-title font-bold text-lg text-[#4E2E53]">Espace candidat</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Tableau de bord : suivi des candidatures, alertes e-mail et profil CV.
          </p>
        </Link>
        <Link href="/demo/espace-recruteur" className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-3 hover:border-[#4E2E53]/40 transition-all">
          <div className="w-11 h-11 rounded-2xl bg-[#E4BDE9] flex items-center justify-center text-xl">🏛️</div>
          <h2 className="font-serif-title font-bold text-lg text-[#4E2E53]">Espace recruteur</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Dépôt d&apos;offre par un élu ou son cabinet, avec l&apos;auditeur de conformité.
          </p>
        </Link>
      </div>
    </div>
  );
}
