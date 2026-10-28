import { imageOg, TAILLE_OG } from "@/lib/og";
import { eluDepuisId } from "@/lib/elus";
import { nomAffiche } from "@/lib/format";

export const alt = "MixiParl' : la mixité des équipes parlementaires";
export const size = TAILLE_OG;
export const contentType = "image/png";
export const revalidate = 86400;

// /mixiparl/<id-élu> : carte de partage au nom de l'élu (mixité de son
// équipe). Les pages de chambre gardent la carte du module.
export default async function Image({ params }: { params: Promise<{ chambre: string }> }) {
  const id = decodeURIComponent((await params).chambre);
  if (id === "an" || id === "senat" || id === "pe") {
    return imageOg({ surtitre: "MixiParl' · la mixité des équipes", accent: "#B794FF", legende: "Les équipes parlementaires sont-elles mixtes ?" });
  }
  const e = await eluDepuisId(id).catch(() => null);
  if (!e) return imageOg({ surtitre: "MixiParl' · la mixité des équipes", accent: "#B794FF", legende: "Les équipes parlementaires sont-elles mixtes ?" });
  return imageOg({
    surtitre: "MixiParl' · la mixité des équipes", accent: "#B794FF",
    legende: `${nomAffiche(e.nom)} : la mixité de son équipe, mois par mois`,
  });
}
