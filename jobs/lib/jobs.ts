// Helpers DataParl' Jobs : slug, chambres, domaines parlementaires.
import { titrePoste } from "./jobsTexte";

export type Chambre = "an" | "senat" | "pe";

export const CHAMBRES: { valeur: Chambre; libelle: string }[] = [
  { valeur: "an", libelle: "Assemblée nationale" },
  { valeur: "senat", libelle: "Sénat" },
  { valeur: "pe", libelle: "Parlement européen" },
];

export const COULEUR_CHAMBRE: Record<string, string> = {
  an: "#6C84B0",
  senat: "#4E2E53",
  pe: "#3B7EA1",
};

// Domaines de messagerie parlementaires : seuls ces domaines peuvent
// déposer une offre depuis l'espace élu.
export const DOMAINES_PARLEMENT = [
  "assemblee-nationale.fr",
  "clb-an.fr",
  "senat.fr",
  "clb-senat.fr",
  "europarl.europa.eu",
  "ep.europa.eu",
  "europa.eu",
];

export const domaineAutorise = (email: string) => {
  const d = email.split("@")[1]?.toLowerCase() ?? "";
  return DOMAINES_PARLEMENT.some((x) => d === x || d.endsWith("." + x));
};

export type OffreBase = {
  id: string;
  titre: string;
  chambre: string | null;
  departement: string | null;
  elu_prenom: string | null;
  elu_nom: string | null;
  groupe_politique: string | null;
};

export function titreStandard(o: OffreBase): string {
  const chambre = o.chambre === "senat" ? "Sénat" : o.chambre === "pe" ? "PE" : "An";
  const dept = o.departement ? " " + o.departement : "";
  const elu = [o.elu_prenom ?? "", (o.elu_nom ?? "").toUpperCase()].filter(Boolean).join(" ");
  const parti = o.groupe_politique ? " (" + o.groupe_politique + ")" : "";
  return "[" + chambre + "]" + dept + (elu ? " - " + elu : "") + parti + " : " + o.titre;
}

const slugPart = (x: string) =>
  x
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// Slug d'offre : <id>_<chambre>_<Prenom>_<NOMELU>_<nom-de-l-offre>
export function slugOffre(o: OffreBase): string {
  // Slug court : seul l'id sert au routage, on n'accroche qu'un libellé de
  // poste tronqué. Les anciens slugs longs continuent de fonctionner
  // (idDepuisSlug ne lit que le premier segment).
  return [o.id, slugPart(titrePoste(o.titre)).slice(0, 48)].filter(Boolean).join("_");
}

export function idDepuisSlug(slug: string): string | null {
  const seg = slug.split("_")[0] ?? "";
  if (/^[0-9a-f]{64}$/i.test(seg)) return seg;
  const m = seg.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return m ? m[0] : null;
}
