import Link from "next/link";

const LIENS = [
  { icone: "🔍", titre: "Toutes les offres", texte: "Consultez les postes d'assistants et collaborateurs actifs.", href: "/jobs" },
  { icone: "👤", titre: "Mon compte", texte: "Accédez à vos candidatures et alertes e-mail.", href: "/mon-compte" },
  { icone: "🏛️", titre: "DataParl'", texte: "Retour sur la plateforme principale DataParl'.", href: "https://www.dataparl.fr" },
];

export default function Introuvable() {
  return (
    <div className="max-w-4xl mx-auto text-center space-y-8 py-8">
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-lavande/40 border border-lavande text-brand text-xs font-semibold uppercase tracking-wider">
        <span>🏛️ Exception d&apos;irrecevabilité soulevée</span>
      </div>

      <div className="space-y-3">
        <h1 className="text-7xl sm:text-9xl font-serif-title font-extrabold text-brand tracking-tight">404</h1>
        <h2 className="text-2xl sm:text-4xl font-serif-title font-bold text-brand">
          Amendement irrecevable
        </h2>
      </div>

      <form action="/jobs" method="get" className="max-w-xl mx-auto bg-white p-2 sm:p-2.5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-2">
        <div className="pl-3 text-slate-400">🔍</div>
        <input
          type="text"
          name="q"
          placeholder="Chercher un poste (ex: Collaborateur, Stage, Sénat)..."
          className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
        />
        <button type="submit" className="bg-brand hover:bg-brand-hover text-white px-5 py-2.5 rounded-xl text-xs font-semibold shrink-0 transition-all">
          Rechercher
        </button>
      </form>

      <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
        {LIENS.map((l) =>
          l.href.startsWith("/") ? (
            <Link key={l.titre} href={l.href} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:border-brand/40 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-ciel flex items-center justify-center font-bold mb-3 group-hover:scale-105 transition-transform">{l.icone}</div>
              <h3 className="font-serif-title font-bold text-brand text-sm group-hover:text-bleu">{l.titre}</h3>
              <p className="text-xs text-slate-500 mt-1">{l.texte}</p>
            </Link>
          ) : (
            <a key={l.titre} href={l.href} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:border-brand/40 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-ciel flex items-center justify-center font-bold mb-3 group-hover:scale-105 transition-transform">{l.icone}</div>
              <h3 className="font-serif-title font-bold text-brand text-sm group-hover:text-bleu">{l.titre}</h3>
              <p className="text-xs text-slate-500 mt-1">{l.texte}</p>
            </a>
          )
        )}
      </div>
    </div>
  );
}
