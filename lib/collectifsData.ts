import "server-only";
import { dataQueryTout } from "./data";
import { nomDepartement } from "./senatorialesClassement";
import { sansGroupe, slugCollectif, type GroupeExistant } from "./collectifs";

// Chargement des pages collectives (groupes, départements, partis) :
// tout vient de la table `parlementaires` (fiches actives uniquement).

export type EluCollectif = {
  chambre: string; personne_id: string; slug: string; civilite: string; prenom: string; nom: string;
  groupe: string; groupe_libelle: string; circonscription: string; departement: string;
  photo_url: string; actif: boolean;
};

const COLS = "chambre,personne_id,slug,civilite,prenom,nom,groupe,groupe_libelle,circonscription,departement,photo_url,actif";

async function fichesActives(): Promise<EluCollectif[]> {
  return dataQueryTout<EluCollectif>("parlementaires",
    new URLSearchParams({ select: COLS, actif: "eq.true", order: "nom,prenom" }), 3600);
}

// Groupes existants (une ligne par couple chambre + sigle).
export async function groupesExistants(): Promise<GroupeExistant[]> {
  const rows = await fichesActives();
  const vus = new Set<string>();
  const out: GroupeExistant[] = [];
  for (const r of rows) {
    if (sansGroupe(r.groupe)) continue;
    const cle = `${r.chambre}|${r.groupe}`;
    if (vus.has(cle)) continue;
    vus.add(cle);
    out.push({ chambre: r.chambre, groupe: r.groupe, groupe_libelle: r.groupe_libelle || r.groupe });
  }
  return out.sort((a, b) => a.chambre.localeCompare(b.chambre) || a.groupe.localeCompare(b.groupe));
}

// Sigles de partis (toutes chambres confondues).
export async function partisExistants(): Promise<string[]> {
  const rows = await fichesActives();
  return [...new Set(rows.filter((r) => !sansGroupe(r.groupe)).map((r) => r.groupe))].sort((a, b) => a.localeCompare(b));
}

// Élus d'un groupe dans une chambre.
export async function elusDuGroupe(chambre: string, sigle: string): Promise<EluCollectif[]> {
  return dataQueryTout<EluCollectif>("parlementaires",
    new URLSearchParams({ select: COLS, actif: "eq.true", chambre: `eq.${chambre}`, groupe: `eq.${sigle}`, order: "nom,prenom" }), 3600);
}

// Élus d'un parti (sigle), toutes chambres confondues.
export async function elusDuParti(sigle: string): Promise<EluCollectif[]> {
  return dataQueryTout<EluCollectif>("parlementaires",
    new URLSearchParams({ select: COLS, actif: "eq.true", groupe: `eq.${sigle}`, order: "chambre,nom,prenom" }), 3600);
}

// Départements ayant des élus actifs (nom nettoyé du préfixe de code).
export async function departementsExistants(): Promise<string[]> {
  const rows = await fichesActives();
  return [...new Set(rows.map((r) => nomDepartement(r.departement || r.circonscription)).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr"));
}

// Élus d'un département (toutes chambres confondues). Le nom est comparé en
// entier après nettoyage, pour ne pas confondre « Seine » et « Seine-Maritime ».
export async function elusDuDepartement(nom: string): Promise<EluCollectif[]> {
  const brut = await dataQueryTout<EluCollectif>("parlementaires",
    new URLSearchParams({ select: COLS, actif: "eq.true", or: `(departement.ilike.*${nom.replace(/[(),]/g, "")}*,circonscription.ilike.*${nom.replace(/[(),]/g, "")}*)`, order: "chambre,nom,prenom" }), 3600);
  return brut.filter((r) => nomDepartement(r.departement || r.circonscription).localeCompare(nom, "fr") === 0);
}
// Anciens élus d'un département (fiches inactives : mandats terminés). Ils
// restent des fiches utiles en recherche longue traîne : les lister crée des
// liens internes vers des pages sinon découvertes seulement via le sitemap
// (Search Console : « Détectée, actuellement non indexée »).
export async function anciensDuDepartement(nom: string): Promise<EluCollectif[]> {
  const brut = await dataQueryTout<EluCollectif>("parlementaires",
    new URLSearchParams({ select: COLS, actif: "eq.false", or: `(departement.ilike.*${nom.replace(/[(),]/g, "")}*,circonscription.ilike.*${nom.replace(/[(),]/g, "")}*)`, order: "chambre,nom,prenom" }), 3600);
  return brut.filter((r) => nomDepartement(r.departement || r.circonscription).localeCompare(nom, "fr") === 0);
}


// ── Index /groupe et /parti v2 : mêmes données, avec les compteurs d'élus ──

// Groupes existants avec le nombre d'élus actifs par groupe (chambre + sigle).
export type GroupeCompte = GroupeExistant & { elus: number };
export async function groupesAvecComptes(): Promise<GroupeCompte[]> {
  const rows = await fichesActives();
  const m = new Map<string, GroupeCompte>();
  for (const r of rows) {
    if (sansGroupe(r.groupe)) continue;
    const cle = r.chambre + "|" + r.groupe;
    const g = m.get(cle) ?? { chambre: r.chambre, groupe: r.groupe, groupe_libelle: r.groupe_libelle || r.groupe, elus: 0 };
    g.elus += 1;
    m.set(cle, g);
  }
  return [...m.values()].sort((a, b) => a.chambre.localeCompare(b.chambre) || a.groupe.localeCompare(b.groupe));
}

// Partis (sigles, toutes chambres) avec la répartition des élus par chambre.
export type PartiCompte = { sigle: string; total: number; assemblee: number; senat: number; europarl: number };
export async function partisAvecComptes(): Promise<PartiCompte[]> {
  const rows = await fichesActives();
  const m = new Map<string, PartiCompte>();
  for (const r of rows) {
    if (sansGroupe(r.groupe)) continue;
    const p = m.get(r.groupe) ?? { sigle: r.groupe, total: 0, assemblee: 0, senat: 0, europarl: 0 };
    p.total += 1;
    if (r.chambre === "assemblee" || r.chambre === "senat" || r.chambre === "europarl") p[r.chambre] += 1;
    m.set(r.groupe, p);
  }
  return [...m.values()].sort((a, b) => b.total - a.total || a.sigle.localeCompare(b.sigle));
}
