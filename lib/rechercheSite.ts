import "server-only";
import { suggererGroupes } from "./familles";
import { CHAMBRE, prenomNom } from "./format";
import { pagesPour } from "./pagesSite";
import { rechercheGlobale } from "./referentiel";

// Recherche unifiée de l'accueil : élus, collaborateurs, groupes, pages.
// Insensible aux accents (clés normalisées côté base et ici).
export type Resultat = { valeur: string; libelle: string; detail?: string; href: string; groupe: string };

const TEXTE = /^[\p{L}\p{N} .'’-]{2,60}$/u;

export async function rechercherSite(q: string, limite = 8): Promise<Resultat[]> {
  q = q.trim();
  if (!TEXTE.test(q)) return [];
  const { elus, collabs } = await rechercheGlobale(q).catch(() => ({ elus: [], collabs: [] }));
  const groupes = suggererGroupes(q, 3).filter((g) => g.valeur.length > 0);
  const pages = pagesPour(q, 3);
  const blocs: Resultat[][] = [
    elus.map((e) => ({
      valeur: `elu:${e.slug}`, libelle: prenomNom(e.prenom, e.nom), groupe: "Élus",
      detail: [e.groupe, CHAMBRE[e.chambre], e.actif ? "" : "ancien mandat"].filter(Boolean).join(", "),
      href: `/parlementaires/${encodeURIComponent(e.slug)}`,
    })),
    collabs.map((c) => ({
      valeur: `collab:${c.slug}`, libelle: prenomNom(c.prenom, c.nom), groupe: "Collaborateurs",
      detail: [c.genre === "F" ? "Collaboratrice" : "Collaborateur", c.chambres.split(" ").map((x) => CHAMBRE[x]).join(", "), c.actif ? "en poste" : `jusqu'en ${c.derniere_date.slice(0, 4)}`].filter(Boolean).join(", "),
      href: `/collab/${encodeURIComponent(c.slug)}`,
    })),
    groupes.map((g) => ({
      valeur: `groupe:${g.valeur}`, libelle: g.libelle, detail: g.detail, groupe: "Groupes politiques",
      href: `/mouvements/parlement?groupe=${encodeURIComponent(g.valeur)}`,
    })),
    pages.map((p) => ({ valeur: `page:${p.href}`, libelle: p.libelle, detail: p.detail, href: p.href, groupe: "Pages" })),
  ];
  // Un groupe ou une page qui correspond exactement passe devant (« eco », « vigiparl »).
  const n = (x: string) => x.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  const nq = n(q);
  const fort = [false, false,
    groupes.some((g) => n(g.valeur) === nq),
    pages.some((p) => n(p.libelle).startsWith(nq) && nq.length >= 4)];
  const ordre = [0, 1, 2, 3].sort((a, b) => Number(fort[b]) - Number(fort[a]));
  blocs.splice(0, blocs.length, ...ordre.map((i) => blocs[i]));
  // Répartit la limite : une place à tour de rôle à chaque type qui a des résultats.
  const pris = blocs.map(() => 0);
  let reste = limite;
  while (reste > 0 && blocs.some((b, i) => pris[i] < b.length)) {
    for (let i = 0; i < blocs.length && reste > 0; i++) if (pris[i] < blocs[i].length) { pris[i]++; reste--; }
  }
  return blocs.flatMap((b, i) => b.slice(0, pris[i]));
}
