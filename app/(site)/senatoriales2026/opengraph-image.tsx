import { imageOg, TAILLE_OG } from "@/lib/og";

export const alt = "Sénatoriales 2026 : DataParl'";
export const size = TAILLE_OG;
export const contentType = "image/png";

export default function Image() {
  return imageOg({ surtitre: "Sénatoriales 2026", legende: "Les nouveaux sénateurs, département par département, avec leurs groupes et leurs équipes." });
}
