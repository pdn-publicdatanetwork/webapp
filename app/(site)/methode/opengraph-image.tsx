import { imageOg, TAILLE_OG } from "@/lib/og";

export const alt = "Méthode : DataParl'";
export const size = TAILLE_OG;
export const contentType = "image/png";

export default function Image() {
  return imageOg({ surtitre: "Méthode", legende: "Des publications officielles aux fiches publiées : collecte, croisement, vérification." });
}
