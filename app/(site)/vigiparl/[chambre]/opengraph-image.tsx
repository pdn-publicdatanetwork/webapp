import { carteEluOg, imageOg, TAILLE_OG } from "@/lib/og";
import { eluDepuisId, statsElu } from "@/lib/elus";
import { historiqueMensuel } from "@/lib/indicateurs";
import { pct, tauxTurnover } from "@/lib/stats";
import { nomAffiche } from "@/lib/format";

export const alt = "VigiParl' : le renouvellement des équipes parlementaires";
export const size = TAILLE_OG;
export const contentType = "image/png";
export const revalidate = 86400;

const GENERIQUE = () => imageOg({ surtitre: "VigiParl' · le renouvellement des équipes", accent: "#FF6B7D", legende: "Qui garde son équipe, qui la renouvelle sans cesse ?" });

export default async function Image({ params }: { params: Promise<{ chambre: string }> }) {
  const id = decodeURIComponent((await params).chambre);
  if (id === "an" || id === "senat" || id === "pe") return GENERIQUE();
  const e = await eluDepuisId(id).catch(() => null);
  if (!e) return GENERIQUE();
  const [stat, hist] = await Promise.all([
    statsElu(e).catch(() => null),
    historiqueMensuel(e).catch(() => ({ points: [], debutSuivi: null })),
  ]);
  const t = stat ? tauxTurnover(stat) : null;
  return carteEluOg({
    module: "VigiParl'", accent: "#FF6B7D",
    nom: nomAffiche(e.nom),
    role: "le renouvellement de l'équipe",
    chiffres: [
      stat ? { valeur: String(stat.effectif), legende: "collaborateurs aujourd'hui" } : null,
      stat ? { valeur: String(stat.departs_12m), legende: "départs sur 12 mois" } : null,
      t === null ? null : { valeur: pct(t), legende: "de renouvellement en 12 mois" },
    ].filter((x): x is { valeur: string; legende: string } => !!x),
    serie: hist.points.map((p) => p.femmes + p.hommes),
    serieLegende: "Effectif de l'équipe, fin de mois" + (hist.debutSuivi ? ` · suivi depuis ${hist.debutSuivi}` : ""),
  });
}
