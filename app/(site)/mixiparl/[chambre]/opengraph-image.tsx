import { carteEluOg, imageOg, TAILLE_OG } from "@/lib/og";
import { eluDepuisId, statsElu } from "@/lib/elus";
import { historiqueMensuel } from "@/lib/indicateurs";
import { partFemmes, pct, tauxMixite } from "@/lib/stats";
import { nomAffiche } from "@/lib/format";

export const alt = "MixiParl' : la mixité des équipes parlementaires";
export const size = TAILLE_OG;
export const contentType = "image/png";
export const revalidate = 86400;

const GENERIQUE = () => imageOg({ surtitre: "MixiParl' · la mixité des équipes", accent: "#B794FF", legende: "Les équipes parlementaires sont-elles mixtes ?" });

export default async function Image({ params }: { params: Promise<{ chambre: string }> }) {
  const id = decodeURIComponent((await params).chambre);
  if (id === "an" || id === "senat" || id === "pe") return GENERIQUE();
  const e = await eluDepuisId(id).catch(() => null);
  if (!e) return GENERIQUE();
  const [stat, hist] = await Promise.all([
    statsElu(e).catch(() => null),
    historiqueMensuel(e).catch(() => ({ points: [], debutSuivi: null })),
  ]);
  const pf = stat ? partFemmes(stat) : null;
  const tm = stat ? tauxMixite(stat) : null;
  return carteEluOg({
    module: "MixiParl'", accent: "#B794FF",
    nom: nomAffiche(e.nom),
    role: "la mixité de l'équiperole,
    chiffres: [
      stat ? { valeur: String(stat.effectif), legende: "collaborateurs aujourd'hui" } : null,
      pf === null ? null : { valeur: pct(pf), legende: "de femmes dans l'équipe" },
      tm === null ? null : { valeur: pct(tm), legende: "de mixité (100 % à 50/50)" },
    ].filter((x): x is { valeur: string; legende: string } => !!x),
    serie: hist.points.map((p) => p.femmes + p.hommes),
    serieLegende: "Effectif de l'équipe, fin de mois" + (hist.debutSuivi ? ` · suivi depuis ${hist.debutSuivi}` : ""),
  });
}
