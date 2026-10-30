// Habillage commun des pages d'atterrissage des emails (désinscription,
// préférences) : même charte que le gabarit des emails (lib/gabarit.ts) —
// fond crème, carte blanche, serif navy, bouton navy, filet gris — pour que
// la page continue visuellement l'email qui y mène.
import type { ReactNode } from "react";

const FOND = "#FAF8F5";
const ENCRE = "#0F172A";
const GRIS = "#475569";
const LIGNE = "#E2E8F0";
const BLEU = "#164DFF";
const JAUNE = "#FFD23F";

export function Logo() {
  return (
    <span style={{ fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 21, color: ENCRE }}>
      Data<span style={{ background: JAUNE, padding: "0 3px 0 1px" }}>Parl'</span>
    </span>
  );
}

// Bouton navy, arrondi 8 px, hauteur confortable (mobile) — même style que
// les boutons des emails (lib/mail.ts).
export function Bouton({ children }: { children: ReactNode }) {
  return (
    <button type="submit" style={{ background: ENCRE, color: "#ffffff", border: "none", borderRadius: 8, padding: "13px 24px", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
      {children}
    </button>
  );
}

// Carte blanche sur fond crème, logo en tête, pied discret : le pendant web
// de la carte email du gabarit (max-width 600, filet 1 px, coins 12 px).
export function Carte({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <main style={{ background: FOND, padding: "32px 16px 56px" }}>
      <div style={{ width: "100%", maxWidth: 600, margin: "0 auto", background: "#ffffff", border: "1px solid " + LIGNE, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "20px 32px", borderBottom: "1px solid " + LIGNE }}><Logo /></div>
        <div style={{ padding: "28px 32px 32px" }}>
          <h1 style={{ margin: "0 0 16px", fontSize: 23, lineHeight: 1.25, fontWeight: 700, color: ENCRE }}>{titre}</h1>
          {children}
        </div>
        <div style={{ padding: "16px 32px 22px", borderTop: "1px solid " + LIGNE, background: FOND, fontSize: 13, textAlign: "center", color: GRIS }}>
          DataParl' · <a href="https://www.dataparl.fr/" style={{ color: BLEU, textDecoration: "none" }}>www.dataparl.fr</a>
        </div>
      </div>
    </main>
  );
}

export const styles = {
  texte: { margin: 0, fontSize: 16, lineHeight: 1.6, color: ENCRE } as const,
  meta: { margin: 0, fontSize: 14, color: GRIS } as const,
  libelle: { display: "block", margin: "20px 0 6px", fontSize: 14, fontWeight: 600, color: ENCRE } as const,
  select: { width: "100%", padding: "10px 12px", fontSize: 15, color: ENCRE, background: "#ffffff", border: "1px solid " + LIGNE, borderRadius: 8 } as const,
  check: { display: "flex", alignItems: "center", gap: 10, margin: "0 0 10px", fontSize: 15, color: ENCRE, cursor: "pointer" } as const,
  coche: { accentColor: ENCRE, width: 16, height: 16 } as const,
  lien: { color: BLEU, textDecoration: "none" } as const,
  ok: { display: "inline-block", margin: "0 0 16px", background: JAUNE, padding: "6px 10px", borderRadius: 6, fontSize: 14, fontWeight: 600, color: ENCRE } as const,
};