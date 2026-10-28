import { imageOg, TAILLE_OG } from "@/lib/og";
import { parlementaireDepuisId } from "@/lib/referentiel";
import { prenomNom } from "@/lib/format";

export const alt = "Fiche parlementaire DataParl'";
export const size = TAILLE_OG;
export const contentType = "image/png";
export const revalidate = 86400;

// Carte de partage 1200×630 au nom de l'élu pour toute fiche parlementaire
// (fiche, /bio, /historique) : même charte que le reste du site.
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const id = decodeURIComponent((await params).id);
  const f = await parlementaireDepuisId(id).catch(() => null);
  const nom = f ? prenomNom(f.prenom, f.nom) : "Parlementaire";
  return imageOg({
    surtitre: "Fiche parlementaire · équipe de collaborateurs",
    legende: `${nom} : son équipe de collaborateurs, ses arrivées, ses départs et ses mandats`,
  });
}
