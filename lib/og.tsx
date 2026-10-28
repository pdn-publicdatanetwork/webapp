import { ImageResponse } from "next/og";

// Images de partage (Open Graph) : fond bleu nuit, le chiffre en grand.
export const TAILLE_OG = { width: 1200, height: 630 };

type Carte = { surtitre: string; chiffre?: string; legende: string; accent?: string };

export function imageOg({ surtitre, chiffre, legende, accent = "#FFD23F" }: Carte): ImageResponse {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#14224e", color: "#ffffff", padding: "64px 72px" }}>
        <div style={{ display: "flex", fontSize: 34, color: "#C9D2EA", letterSpacing: 1 }}>{surtitre}</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {chiffre && <div style={{ display: "flex", fontSize: 168, fontWeight: 700, lineHeight: 1, color: accent }}>{chiffre}</div>}
          <div style={{ display: "flex", fontSize: chiffre ? 46 : 64, lineHeight: 1.2, marginTop: 18, maxWidth: 1000 }}>{legende}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", fontSize: 40, fontWeight: 700 }}>
          <span>Data</span><span style={{ background: "#FFD23F", color: "#071A41", padding: "0 6px", marginLeft: 2 }}>Parl&apos;</span>
          <span style={{ marginLeft: 22, fontSize: 28, fontWeight: 400, color: "#C9D2EA" }}>dataparl.fr</span>
        </div>
      </div>
    ),
    TAILLE_OG,
  );
}

// ── Carte de partage « par élu » ──────────────────────────────────────────────
// Photo officielle de l'élu (media.dataparl.fr), logo du module (DataParl',
// VigiParl', MixiParl'), deux ou trois chiffres clés et la courbe mensuelle de
// l'effectif de l'équipe — la même lecture que la fiche, en un coup d'œil.
export type Chiffre = { valeur: string; legende: string };
type CarteElu = {
  module: "DataParl'" | "VigiParl'" | "MixiParl'";
  accent: string;
  nom: string;
  role: string;
  photoUrl?: string | null;
  chiffres: Chiffre[];
  serie?: number[]; // effectif de l'équipe, fin de mois
  serieLegende?: string;
};

// Récupère la photo officielle (binaire passable à <img> ; défaillances tolérées).
async function photoBin(url: string) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!r.ok) return null;
    return await r.arrayBuffer();
  } catch {
    return null;
  }
}

export async function carteEluOg(c: CarteElu): Promise<ImageResponse> {
  const base = c.module.slice(0, -5); // "Data" | "Vigi" | "Mixi"
  const photo = c.photoUrl ? await photoBin(c.photoUrl) : null;
  const serie = (c.serie ?? []).filter((v) => Number.isFinite(v));
  const W = 1050, H = 96;
  const max = Math.max(1, ...serie);
  const pts = serie.length > 1
    ? serie.map((v, i) => `${(i / (serie.length - 1)) * W},${H - (v / max) * (H - 8)}`).join(" ")
    : "";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#14224e", color: "#ffffff", padding: "52px 72px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 32, color: "#C9D2EA", letterSpacing: 1 }}>
            {c.role}
          </div>
          <div style={{ display: "flex", fontSize: 44, fontWeight: 700 }}>
            <span>{base}</span><span style={{ background: c.accent, color: "#071A41", padding: "0 6px", marginLeft: 2 }}>Parl&apos;</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center" }}>
          {photo ? (
            <img src={photo as unknown as string} width={168} height={168} style={{ borderRadius: 168, objectFit: "cover", display: "flex", border: "4px solid #FFFFFF", marginRight: 40 }} />
          ) : (
            <div style={{ width: 168, height: 168, borderRadius: 168, display: "flex", alignItems: "center", justifyContent: "center", background: "#26366B", color: "#C9D2EA", fontSize: 56, fontWeight: 700, marginRight: 40 }}>
              {c.nom.charAt(0)}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 76, fontWeight: 700, lineHeight: 1.1, maxWidth: 820 }}>{c.nom}</div>
            <div style={{ display: "flex", fontSize: 34, color: "#C9D2EA", marginTop: 10, maxWidth: 820 }}>
              {c.chiffres.map((ch) => `${ch.valeur} ${ch.legende}`).join("  ·  ")}
            </div>
          </div>
        </div>

        {pts ? (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {c.serieLegende ? (
              <div style={{ display: "flex", fontSize: 26, color: "#C9D2EA", marginBottom: 10 }}>{c.serieLegende}</div>
            ) : null}
            <svg width={W} height={H} style={{ display: "flex" }}>
              <polygon points={`0,${H} ${pts} ${W},${H}`} fill="#FFFFFF" fillOpacity={0.12} />
              <polyline points={pts} fill="none" stroke={c.accent} strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" />
            </svg>
          </div>
        ) : (
          <div style={{ display: "flex", fontSize: 30, color: "#C9D2EA" }}>dataparl.fr</div>
        )}

        <div style={{ display: "flex", alignItems: "center", fontSize: 36, fontWeight: 700 }}>
          <span>Data</span><span style={{ background: "#FFD23F", color: "#071A41", padding: "0 6px", marginLeft: 2 }}>Parl&apos;</span>
          <span style={{ marginLeft: 20, fontSize: 26, fontWeight: 400, color: "#C9D2EA" }}>dataparl.fr</span>
        </div>
      </div>
    ),
    TAILLE_OG,
  );
}
