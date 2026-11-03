"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

// En-tête du portail : marque + navigation entre les trois espaces.

const ONGLETS = [
  { href: "/", libelle: "🔎 Explorer les offres" },
  { href: "/matching", libelle: "🤖 CV Matching", nouveau: true },
  { href: "/proposer", libelle: "🏛️ Espace Élu / Pro" },
];

export default function Entete() {
  const chemin = usePathname() ?? "/";
  return (
    <header className="sticky top-0 z-30 bg-[#ECF1FC]/90 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-1.5 text-left">
            <span className="font-serif-title text-2xl font-bold tracking-tight text-[#4E2E53]">
              Data<span className="bg-[#E4BDE9] px-1 rounded text-[#4E2E53]">Parl&apos;</span>
            </span>
            <span className="text-xl font-semibold text-[#6C84B0] ml-1">Jobs</span>
          </Link>
          <nav className="hidden md:flex items-center space-x-2 text-xs font-semibold">
            {ONGLETS.map((t) => {
              const actif = t.href === "/" ? chemin === "/" : chemin.startsWith(t.href);
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                    actif ? "bg-[#4E2E53] text-white" : "text-slate-600 hover:text-[#4E2E53]"
                  }`}
                >
                  <span>{t.libelle}</span>
                  {t.nouveau && (
                    <span className="bg-[#E4BDE9] text-[#4E2E53] text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      Nouveau
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
        <Link
          href="/proposer"
          className="bg-[#4E2E53] hover:bg-[#3b223f] text-white px-4 py-2.5 rounded-xl font-medium text-xs shadow-sm transition-all flex items-center gap-2 shrink-0"
        >
          <span>Publier une offre</span>
        </Link>
      </div>
    </header>
  );
}
