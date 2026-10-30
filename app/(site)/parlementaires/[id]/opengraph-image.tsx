import { carteEluOg, imageOg, TAILLE_OG } from "@/lib/og";
import { parlementaireDepuisId } from "@/lib/referentiel";
import { eluDepuisFiche, statsElu } from "@/lib/elus";
import { historiqueMensuel } from "@/lib/indicateurs";
import { photoAbsolue } from "@/lib/media";
import { CHAMBRE_LONG, prenomNom } from "@/lib/format";

export const alt = "Fiche parlementaire DataParl'";
export const size = TAILLE_OG;
export const contentType = "image/png";
export const revalidate = 86400;

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const id = decodeURIComponent((await params).id);
  const f = await parlementaireDepuisId(id).catch(() => null);
  if (!f) return imageOg({ surtitre: "Fiche parlementaire : équipe de collaborateurs", legende: "Parlementaire : son équipe de collaborateurs, ses mouvements et ses mandats" });
  const e = eluDepuisFiche(f);
  const [stat, hist] = await Promise.all([
    statsElu(e).catch(() => null),
    historiqueMensuel(e).catch(() => ({ points: [], debutSuivi: null })),
  ]);
  return carteEluOg({
    module: "DataParl'", accent: "#FFD23F",
    nom: prenomNom(f.prenom, f.nom),
    role: CHAMBRE_LONG[f.chambre] + (f.groupe ? `, groupe ${f.groupe}` : ""),
    photoUrl: photoAbsolue(f.chambre, f.slug, 400),
    chiffres: [
      stat ? { valeur: String(stat.effectif), legende: "collaborateurs aujourd'hui" } : null,
      stat ? { valeur: String(stat.departs_12m), legende: "départs sur 12 mois" } : null,
      stat ? { valeur: String(stat.departs_total), legende: "départs depuis le début du suivi" } : null,
    ].filter((x): x is { valeur: string; legende: string } => !!x),
    serie: hist.points.map((p) => p.femmes + p.hommes),
    serieLegende: "Effectif de l'équipe, fin de mois" + (hist.debutSuivi ? `, suivi depuis ${hist.debutSuivi}` : ""),
  });
}
