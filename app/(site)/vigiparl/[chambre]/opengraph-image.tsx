import { imageOg, TAILLE_OG } from "@/lib/og";
import { eluDepuisId } from "@/lib/elus";
import { nomAffiche } from "@/lib/format";

export const alt = "VigiParl' : le renouvellement des équipes parlementaires";
export const size = TAILLE_OG;
export const contentType = "image/png";
export const revalidate = 86400;

// /vigiparl/<id-élu> : carte de partage au nom de l'élu (renouvellement de
// son équipe). Les pages de chambre (an, senat, pe) gardent la carte module.
export default async function Image({ params }: { params: Promise<{ chambre: string }> }) {
  const id = decodeURIComponent((await params).chambre);
  if (id === "an" || id === "senat" || id === "pe") {
    return imageOg({ surtitre: "VigiParl' · le renouvellement des équipes", accent: "#FF6B7D", legende: "Qui garde son équipe, qui la renouvelle sans cesse ?" });
  }
  const e = await eluDepuisId(id).catch(() => null);
  if (!e) return imageOg({ surtitre: "VigiParl' · le renouvellement des équipes", accent: "#FF6B7D", legende: "Qui garde son équipe, qui la renouvelle sans cesse ?" });
  return imageOg({
    surtitre: "VigiParl' · le renouvellement des équipes", accent: "#FF6B7D",
    legende: `${nomAffiche(e.nom)} : le renouvellement de son équipe, mois par mois`,
  });
}
