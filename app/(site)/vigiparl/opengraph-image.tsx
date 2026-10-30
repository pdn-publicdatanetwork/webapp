import { imageOg, TAILLE_OG } from "@/lib/og";
import { agreger, pct, statsElus, tauxTurnover } from "@/lib/stats";

export const alt = "VigiParl' : le renouvellement des équipes parlementaires";
export const size = TAILLE_OG;
export const contentType = "image/png";
export const revalidate = 86400;

export default async function Image() {
  const an = agreger(await statsElus().catch(() => []), (r) => r.chambre).find((a) => a.cle === "assemblee");
  return imageOg({
    surtitre: "VigiParl' : le renouvellement des équipes", accent: "#FF6B7D",
    chiffre: an ? pct(tauxTurnover(an)) : undefined,
    legende: an ? "de renouvellement des collaborateurs de l'Assemblée en 12 mois, élu par élu" : "Qui garde son équipe, qui la renouvelle sans cesse ?",
  });
}
