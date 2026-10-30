import "server-only";
import { dataQuery, dataQueryTout } from "./data";

// Référentiel des parlementaires (tables parlementaires, mandats,
// appartenances) et parcours des collaborateurs (collaborateurs, periodes),
// alimentés chaque jour par dataparl/collaborateurs.

export type Chambre = "assemblee" | "senat" | "europarl";

export type Parlementaire = {
  chambre: Chambre; elu_id: string; personne_id: string; cle: string; civilite: string; prenom: string; nom: string;
  date_naissance: string; actif: boolean; circonscription: string; departement: string; groupe: string; groupe_libelle: string;
  photo_url: string; url_officielle: string; slug: string; premier_mandat: string; fin_mandat: string; email: string;
};
export type Mandat = { personne_id: string; chambre: Chambre; elu_id: string; debut: string; fin: string; libelle: string; circonscription: string; legislature: string; cause_fin: string };
export type Appartenance = { personne_id: string; chambre: Chambre; elu_id: string; type: string; code: string; libelle: string; sigle: string; fonction: string; debut: string; fin: string };
export type Ministre = { id: string; personne_id: string; fonction: string; portefeuille: string; gouvernement: string; rang: string; debut: string; fin: string; source: string };
export type Collaborateur = {
  collab_id: string; collab_cle: string; slug: string; prenom: string; nom: string; civilite: string; genre: string;
  chambres: string; n_elus: number; premiere_date: string; derniere_date: string; actif: boolean;
  personne_id?: string; parlementaire_slug?: string;
  photo_url?: string | null;
};
export type Periode = {
  collab_id: string; chambre: Chambre; elu_cle: string; elu_id: string; elu_nom: string; debut: string; debut_connu: boolean;
  fin: string; fin_connue: boolean; en_cours: boolean; fonction: string;
};

const COLS_PARL = "chambre,elu_id,personne_id,cle,civilite,prenom,nom,date_naissance,actif,circonscription,departement,groupe,groupe_libelle,photo_url,url_officielle,slug,premier_mandat,fin_mandat,email";
const ID_OK = /^[\p{L}\p{N}_ -]{1,80}$/u;

// Retrouve un parlementaire à partir de l'identifiant d'URL : PA… (AN), slug
// senat.fr ou matricule (Sénat), identifiant européen (PE). Un même personne_id
// peut avoir plusieurs fiches (une par chambre) : si l'identifiant d'URL
// correspond à l'ancienne fiche d'une personne qui siège aujourd'hui ailleurs
// (ex. un député devenu sénateur), la fiche active est préférée — les deux URL
// montrent alors la même personne, avec l'historique complet des mandats.
export async function parlementaireDepuisId(id: string): Promise<Parlementaire | null> {
  if (!ID_OK.test(id)) return null;
  const p = new URLSearchParams({ select: COLS_PARL, or: `(slug.ilike.${id},elu_id.ilike.${id})`, limit: "3" });
  const { rows } = await dataQuery<Parlementaire>("parlementaires", p, 3600);
  const f = rows.find((r) => r.slug.toLowerCase() === id.toLowerCase()) ?? rows[0] ?? null;
  if (!f || f.actif) return f;
  const actives = await dataQuery<Parlementaire>("parlementaires",
    new URLSearchParams({ select: COLS_PARL, personne_id: `eq.${f.personne_id}`, actif: "eq.true", limit: "2" }), 3600);
  // Une seule fiche active : c'est elle qui représente la personne aujourd'hui.
  return actives.rows.length === 1 ? actives.rows[0] : f;
}

// Fiche du référentiel correspondant à un élu des données de collaborateurs
// (AN : identifiant PA ; Sénat : matricule, ou clé du nom dans les archives).
export async function parlementaireDepuisElu(chambre: string, eluId: string, eluCle: string): Promise<Parlementaire | null> {
  const p = new URLSearchParams({ select: COLS_PARL, chambre: `eq.${chambre}`, limit: "2" });
  if (eluId) p.set("elu_id", `eq.${eluId}`);
  else p.set("cle", `eq.${eluCle}`);
  const { rows } = await dataQuery<Parlementaire>("parlementaires", p, 3600);
  return rows.length === 1 ? rows[0] : null;
}

export async function personne(personneId: string) {
  const q = (select: string) => new URLSearchParams({ select, personne_id: `eq.${personneId}` });
  const [fiches, mandats, appartenances] = await Promise.all([
    dataQuery<Parlementaire>("parlementaires", q(COLS_PARL), 3600),
    dataQuery<Mandat>("mandats", new URLSearchParams({ ...Object.fromEntries(q("*")), order: "debut.desc" }), 3600),
    dataQueryTout<Appartenance>("appartenances", new URLSearchParams({ ...Object.fromEntries(q("*")), order: "debut.desc" })),
  ]);
  return { fiches: fiches.rows, mandats: mandats.rows, appartenances };
}

// Fonctions gouvernementales d'une personne (table ministres, alimentée par le
// pipeline gouvernement ou la rédaction) : affichées sur la fiche parlementaire.
export async function fonctionsGouvernement(personneId: string): Promise<Ministre[]> {
  const { rows } = await dataQuery<Ministre>("ministres",
    new URLSearchParams({ select: "id,personne_id,fonction,portefeuille,gouvernement,rang,debut,fin,source", personne_id: `eq.${personneId}`, order: "debut.desc" }), 3600);
  return rows;
}

// Toutes les fiches, en version compacte (autocomplétion).
export type EluCompact = { s: string; p: string; n: string; c: Chambre; g: string; a: boolean; d: string };
export async function tousLesParlementaires(): Promise<EluCompact[]> {
  const rows = await dataQueryTout<Parlementaire>("parlementaires",
    new URLSearchParams({ select: "slug,prenom,nom,chambre,groupe,actif,circonscription", order: "chambre,elu_id" }), 3600);
  return rows.map((r) => ({ s: r.slug, p: r.prenom, n: r.nom, c: r.chambre, g: r.groupe, a: r.actif, d: r.circonscription }));
}

export async function collaborateurDepuisSlug(slug: string): Promise<Collaborateur | null> {
  const m = slug.match(/([0-9a-f]{8})$/);
  if (!m) return null;
  const { rows } = await dataQuery<Collaborateur>("collaborateurs", new URLSearchParams({ select: "*", collab_id: `eq.${m[1]}`, limit: "1" }), 3600);
  return rows[0] ?? null;
}

export async function periodesCollab(collabId: string): Promise<Periode[]> {
  const p = new URLSearchParams({ select: "*", collab_id: `eq.${collabId}`, order: "debut.desc" });
  return (await dataQuery<Periode>("periodes", p, 3600)).rows;
}

// Périodes de tous les collaborateurs d'un élu, sur toutes ses chambres.
export async function periodesElu(fiches: Pick<Parlementaire, "chambre" | "elu_id" | "cle">[]): Promise<Periode[]> {
  const or = fiches.flatMap((f) => [`and(chambre.eq.${f.chambre},elu_id.eq.${f.elu_id})`,
    ...(f.chambre === "senat" && f.cle ? [`and(chambre.eq.senat,elu_cle.eq."${f.cle}")`] : [])]).join(",");
  if (!or) return [];
  const rows = await dataQueryTout<Periode>("periodes", new URLSearchParams({ select: "*", or: `(${or})`, order: "debut.desc" }));
  const vus = new Set<string>();
  return rows.filter((r) => { const k = `${r.collab_id}|${r.chambre}|${r.elu_cle}|${r.debut}`; if (vus.has(k)) return false; vus.add(k); return true; });
}

export async function collaborateursParId(ids: string[]): Promise<Collaborateur[]> {
  const out: Collaborateur[] = [];
  for (let i = 0; i < ids.length; i += 150) {
    const lot = ids.slice(i, i + 150);
    out.push(...(await dataQuery<Collaborateur>("collaborateurs", new URLSearchParams({ select: "*", collab_id: `in.(${lot.join(",")})` }), 3600)).rows);
  }
  return out;
}

export async function parlementairesParElu(cles: { chambre: string; elu_id: string }[]): Promise<Parlementaire[]> {
  const uniques = [...new Map(cles.filter((c) => c.elu_id).map((c) => [`${c.chambre}|${c.elu_id}`, c])).values()];
  const out: Parlementaire[] = [];
  for (let i = 0; i < uniques.length; i += 80) {
    const or = uniques.slice(i, i + 80).map((c) => `and(chambre.eq.${c.chambre},elu_id.eq.${c.elu_id})`).join(",");
    out.push(...(await dataQuery<Parlementaire>("parlementaires", new URLSearchParams({ select: COLS_PARL, or: `(${or})` }), 3600)).rows);
  }
  return out;
}

export async function appartenancesDe(personneIds: string[]): Promise<Appartenance[]> {
  const ids = [...new Set(personneIds)];
  const out: Appartenance[] = [];
  for (let i = 0; i < ids.length; i += 100) {
    out.push(...(await dataQueryTout<Appartenance>("appartenances",
      new URLSearchParams({ select: "*", personne_id: `in.(${ids.slice(i, i + 100).join(",")})`, type: "neq.groupe" }))));
  }
  return out;
}

// Recherche globale : élus (toutes chambres, anciens compris) et collaborateurs.
export async function rechercheGlobale(q: string) {
  const mots = q.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((m) => m.length >= 2).slice(0, 4);
  if (!mots.length) return { elus: [], collabs: [] };
  const et = (col: string) => `(${mots.map((m) => `${col}.ilike.*${m}*`).join(",")})`;
  const [elus, collabs] = await Promise.all([
    dataQuery<Parlementaire>("parlementaires", new URLSearchParams({ select: COLS_PARL, and: et("cle"), order: "actif.desc,fin_mandat.desc", limit: "40" }), 600),
    dataQuery<Collaborateur>("collaborateurs", new URLSearchParams({ select: "*", and: et("collab_cle"), order: "actif.desc,derniere_date.desc", limit: "40" }), 600),
  ]);
  // Mots entiers d'abord (« martin » avant « martine »), puis les personnes en fonction.
  const score = (cle: string, actif: boolean) => mots.filter((m) => cle.split(" ").includes(m)).length * 2 + (actif ? 1 : 0);
  const tri = <T,>(rows: T[], cle: (r: T) => string, actif: (r: T) => boolean) =>
    rows.map((r, i) => ({ r, i, s: score(cle(r), actif(r)) })).sort((a, b) => b.s - a.s || a.i - b.i).slice(0, 7).map((x) => x.r);
  return { elus: tri(elus.rows, (r) => r.cle, (r) => r.actif), collabs: tri(collabs.rows, (r) => r.collab_cle, (r) => r.actif) };
}

// Valeurs de filtre d'un élu choisi par autocomplétion (slug) : son
// identifiant et la clé de son nom (archives du Sénat, sans matricule).
export async function cleElus(valeur: string): Promise<string[]> {
  const p = await parlementaireDepuisId(valeur).catch(() => null);
  if (!p) return [valeur];
  return [...new Set([p.elu_id, p.cle].filter(Boolean))];
}

// Fiche de collaborateur d'une personne qui a aussi été parlementaire.
export async function collaborateurDeLaPersonne(personneId: string): Promise<Collaborateur | null> {
  const { rows } = await dataQuery<Collaborateur>("collaborateurs", new URLSearchParams({ select: "*", personne_id: `eq.${personneId}`, limit: "1" }), 3600);
  return rows[0] ?? null;
}
