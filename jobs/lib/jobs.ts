// Helpers DataParl' Jobs : slug, chambres, domaines parlementaires.
import { dateFr, nomElu, tempsTravail, titrePoste, typeContrat, villeDe } from "./jobsTexte";

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

// Domaines de messagerie autorisés : parlementaires + équipe DataParl'.
export const DOMAINES_PARLEMENT = [
  "dataparl.fr",
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

// ── SEO des fiches offre ─────────────────────────────────────────────────
// <title> et <meta description> orientés recherche : le titre place le poste,
// le contrat et la ville en tête (Google coupe l'affichage vers 60
// caractères), l'élu vient en fin de titre.

export type OffreSeo = OffreBase & {
  type_poste?: string | null;
  localisation?: string | null;
  description?: string | null;
  publie_le?: string | null;
};

export function titreSeo(o: OffreSeo): string {
  const poste = titrePoste(o.titre);
  const contrat = typeContrat({ type_poste: o.type_poste ?? null, description: o.description ?? "" });
  const ville = villeDe(o.localisation ?? null) ?? o.departement;
  const elu = nomElu({ elu_prenom: o.elu_prenom, elu_nom: o.elu_nom });
  const base = poste + (contrat !== "Autre" ? " (" + contrat + ")" : "") + (ville ? " à " + ville : "");
  return elu && base.length + 12 + elu.length <= 75 ? base + ", équipe de " + elu : base;
}

export function descriptionSeo(o: OffreSeo): string {
  const poste = titrePoste(o.titre).toLowerCase();
  const contrat = typeContrat({ type_poste: o.type_poste ?? null, description: o.description ?? "" });
  const travail = tempsTravail(o.description ?? "");
  const ville = villeDe(o.localisation ?? null) ?? o.departement;
  const elu = nomElu({ elu_prenom: o.elu_prenom, elu_nom: o.elu_nom });
  let p1 = "Offre d'emploi : " + poste;
  if (contrat !== "Autre") p1 += " en " + contrat;
  if (travail) p1 += " (" + travail.toLowerCase() + ")";
  if (ville) p1 += " à " + ville;
  p1 += ".";
  const phrases: string[] = [p1];
  if (elu) {
    const detail = [o.groupe_politique, o.departement].filter(Boolean).join(", ");
    phrases.push("Équipe parlementaire de " + elu + (detail ? " (" + detail + ")" : "") + ".");
  } else if (o.groupe_politique) {
    phrases.push("Groupe " + o.groupe_politique + ".");
  }
  if (o.publie_le) {
    const d = dateFr(o.publie_le);
    if (d) phrases.push("Publiée le " + d + " sur DataParl' Jobs.");
  }
  let texte = "";
  for (const p of phrases) {
    const suite = texte ? texte + " " + p : p;
    if (suite.length > 165) break;
    texte = suite;
  }
  if (!texte) texte = p1.length > 165 ? p1.slice(0, 162) + "..." : p1;
  return texte;
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
