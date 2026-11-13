// Revue de presse : chaque entrée décrit un article qui cite ou montre
// DataParl'. La page /presse/ils-parlent-de-nous affiche toutes les entrées,
// /presse met en avant la plus récente (bandeau « Vu dans la presse »).
// Pour ajouter une parution : copier un bloc, remplir les champs, mettre
// vedette à true pour l'épingler sur la page /presse.

export type CategorieMedia = "Presse régionale" | "Presse nationale" | "Média spécialisé" | "Audiovisuel";

export type MentionPresse = {
  id: string;
  media: string;
  categorie: CategorieMedia;
  publieLe: string; // date de publication (ISO, AAAA-MM-JJ)
  titre: string;
  url: string;
  citation: string; // extrait exact qui cite DataParl'
  contexte?: string; // la donnée DataParl' utilisée par l'article
  vedette?: boolean; // épinglée sur la page /presse
  logo?: string; // logo du média servi depuis public/presse/logos/ (facultatif)
  capture?: string; // chemin servi de l'image posée dans public/presse/ (facultatif)
  legendeCapture?: string; // légende affichée sous l'image
  creditCapture?: string; // crédit de la photo ou de la capture
};

export const MENTIONS_PRESSE: MentionPresse[] = [
  {
    id: "est-republicain-2026-11-02",
    media: "L'Est Républicain",
    categorie: "Presse régionale",
    publieLe: "2026-11-02",
    titre: "Écoute voir : nos échos politiques, cette semaine, un changement d'équipe et une visite officielle",
    url: "https://www.estrepublicain.fr/politique/2026/11/02/ecoute-voir-nos-echos-politiques-cette-semaine-un-changement-d-equipe-et-une-visite-officielle",
    citation: "Sur le site officiel DataParl', Jean-Eudes Le Moulec-Deschamps a changé d'écurie parlementaire.",
    contexte: "La fiche collaborateur certifiée de DataParl' documente son nouveau rattachement, auprès du député Matthias Renault (RN), d'après les listes officielles.",
    vedette: true,
    logo: "/presse/logos/est-republicain.svg",
    // Capture d'article : déposer l'image dans public/presse/ (voir
    // public/presse/README.md), puis décommenter ces trois lignes.
    // capture: "/presse/est-republicain-2026-11-02.png",
    // legendeCapture: "Capture de l'article, L'Est Républicain, rubrique Écoute voir",
    // creditCapture: "Photo Karine Frelin",
  },
];

// La plus récente des mentions vedette (à défaut, la plus récente tout court) :
// c'est elle qui s'affiche dans le bandeau « Vu dans la presse » de /presse.
export function derniereMention(): MentionPresse | null {
  const vedettes = MENTIONS_PRESSE.filter((m) => m.vedette);
  const pool = vedettes.length ? vedettes : MENTIONS_PRESSE;
  return [...pool].sort((a, b) => b.publieLe.localeCompare(a.publieLe))[0] ?? null;
}
