import { imageOg, TAILLE_OG } from "@/lib/og";
import { mixite, mixiteMoyenne, pct, statsElus } from "@/lib/stats";

export const alt = "MixiParl' : la mixité des équipes parlementaires";
export const size = TAILLE_OG;
export const contentType = "image/png";
export const revalidate = 86400;

export default async function Image() {
  const rows = (await statsElus().catch(() => [])).filter((r) => r.chambre !== "europarl");
  const m = mixite(rows);
  const an = mixiteMoyenne(rows.filter((r) => r.chambre === "assemblee"));
  return imageOg({
    surtitre: "MixiParl' : la mixité des équipes", accent: "#B794FF",
    chiffre: an.taux !== null ? pct(an.taux) : undefined,
    legende: an.taux !== null ? `de mixité en moyenne dans les équipes de l'Assemblée, et ${m.nonMixtes} équipes non mixtes au Parlement` : "Les équipes parlementaires sont-elles mixtes ?",
  });
}
