import { ImageResponse } from "next/og";
import { offreVisible } from "@/lib/firestore";
import { idDepuisSlug } from "@/lib/jobs";
import { normaliser } from "@/lib/types";
import { CHAMBRE_NOM, nomElu, titrePoste, typeContrat } from "@/lib/jobsTexte";

// Aperçu réseaux sociaux de la fiche d'offre (Open Graph, 1200x630).
// Next.js référence automatiquement cette image dans les balises og:image.

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Offre DataParl' Jobs";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const id = idDepuisSlug(slug);
  const o = id ? await offreVisible(id) : null;
  const n = o ? normaliser(o) : null;
  const titre = n ? titrePoste(n.titre) : "Offre introuvable";
  const elu = n ? nomElu(n) : "";
  const chambre = n && n.chambre ? CHAMBRE_NOM[n.chambre] ?? n.chambre : "";
  const ligne = n ? [chambre, n.groupe_politique, typeContrat(n), n.localisation].filter(Boolean).join(" · ") : "";
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#ECF1FC",
          padding: 64,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: 44, fontWeight: 700, color: "#4E2E53" }}>
            Data<span style={{ background: "#E4BDE9", padding: "0 10px", borderRadius: 8, color: "#4E2E53" }}>Parl'</span>
            <span style={{ color: "#6C84B0", fontWeight: 600, marginLeft: 10 }}>Jobs</span>
          </div>
          {chambre ? (
            <div style={{ background: "#4E2E53", color: "#ffffff", fontSize: 24, padding: "10px 24px", borderRadius: 999 }}>
              {chambre}
            </div>
          ) : null}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 68, fontWeight: 700, color: "#1e293b", lineHeight: 1.15, maxWidth: 1000 }}>
            {titre.length > 90 ? titre.slice(0, 88) + "…" : titre}
          </div>
          {elu ? <div style={{ fontSize: 36, color: "#475569", marginTop: 20 }}>{elu}</div> : null}
          {ligne ? <div style={{ fontSize: 28, color: "#6C84B0", marginTop: 12 }}>{ligne}</div> : null}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 26, color: "#94a3b8" }}>Offre de collaborateur parlementaire</div>
          <div style={{ background: "#4E2E53", color: "#ffffff", fontSize: 26, padding: "12px 28px", borderRadius: 12 }}>
            Voir l'offre sur jobs.dataparl.fr
          </div>
        </div>
      </div>
    ),
    size
  );
}
