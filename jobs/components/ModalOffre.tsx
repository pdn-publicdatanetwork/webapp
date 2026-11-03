"use client";
import { useEffect, useState } from "react";
import { slugOffre } from "@/lib/jobs";
import FicheOffre from "@/components/FicheOffre";
import type { OffreListe } from "@/lib/types";

// Overlay plein écran pour consulter une offre depuis la liste.
// L’overlay EST le conteneur qui scrolle : pas de centrage flex
// (un contenu plus haut que la fenêtre devient sinon inaccessible),
// pas de bloc de scroll interne sans hauteur bornée, et le panneau
// Postuler n’est pas sticky ici (il ne doit pas flotter au-dessus du texte).
// La page canonique /offre/<slug> sert de variante SEO partageable.

export default function ModalOffre({ offre, onFermer }: { offre: OffreListe; onFermer: () => void }) {
  const [copie, setCopie] = useState(false);

  useEffect(() => {
    const deja = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const surEchap = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFermer();
    };
    window.addEventListener("keydown", surEchap);
    return () => {
      document.body.style.overflow = deja;
      window.removeEventListener("keydown", surEchap);
    };
  }, [onFermer]);

  const partager = async () => {
    const url = window.location.origin + "/offre/" + slugOffre(offre);
    try {
      await navigator.clipboard.writeText(url);
      setCopie(true);
      setTimeout(() => setCopie(false), 2500);
    } catch {
      setCopie(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm overflow-y-auto custom-scrollbar"
      onClick={(e) => {
        if (e.target === e.currentTarget) onFermer();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={offre.titre}
    >
      <div className="mx-auto w-full max-w-5xl bg-[#ECF1FC] sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden sm:my-6">
        {/* Barre sticky : reste visible en haut de la fenêtre pendant le scroll */}
        <div className="bg-white px-5 py-3 border-b border-slate-200 flex items-center justify-between gap-3 sticky top-0 z-10">
          <button onClick={onFermer} className="text-xs font-bold text-slate-500 hover:text-[#4E2E53] transition-colors">
            ← Toutes les offres
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={partager}
              className="text-xs font-semibold text-[#6C84B0] hover:text-[#4E2E53] bg-[#ECF1FC] px-3 py-1.5 rounded-xl transition-colors"
            >
              {copie ? "Lien copié ✓" : "🔗 Partager"}
            </button>
            <button
              onClick={onFermer}
              aria-label="Fermer"
              className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-[#4E2E53] text-sm transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="p-4 sm:p-6">
          <FicheOffre offre={offre} onFermer={onFermer} dansModal />
        </div>
      </div>
    </div>
  );
}
