import "server-only";
import { unstable_cache } from "next/cache";
import { DATA_SUPABASE_KEY, DATA_SUPABASE_URL } from "./env";
import { FONCTIONS_SOCIETES, paramExclusionMvts } from "./exclusions";
import { siglesDe } from "./familles";

// Lecture des données publiques (base dataparl, RLS : select ouvert).

export type Mouvement = {
  id: string;
  date_event: string;
  chambre: "assemblee" | "senat" | "europarl";
  type: "arrivee" | "depart" | "transfert";
  collab_cle: string;
  collab_nom: string;
  collab_prenom: string;
  collab_civilite: string;
  elu_cle: string;
  elu_id: string;
  elu_nom: string;
  elu_groupe: string;
  elu_origine_nom: string;
  elu_origine_groupe: string;
  fonction: string;
  contexte: string;
  source: string;
  confiance: string;
};

export const COLONNES_PUBLIQUES =
  "id,date_event,chambre,type,collab_cle,collab_nom,collab_prenom,collab_civilite,elu_cle,elu_id,elu_nom,elu_groupe," +
  "elu_origine_nom,elu_origine_groupe,fonction,contexte,source,confiance";

// Requête PostgREST brute. Jamais mise en cache par le fetch lui-même :
// le Data Cache de fetch ignore les requêtes portant un en-tête Authorization
// (comportement documenté de Next). Le cache passe par unstable_cache
// ci-dessous, qui gare le résultat côté serveur quel que soit le rendu de
// la page (statique, ISR ou dynamique : page 404, recherche, comptes…).
async function requeteBrute(table: string, requete: string): Promise<{ rows: unknown[]; total: number | null }> {
  const url = `${DATA_SUPABASE_URL}/rest/v1/${table}?${requete}`;
  const r = await fetch(url, {
    headers: { apikey: DATA_SUPABASE_KEY, Authorization: `Bearer ${DATA_SUPABASE_KEY}`, Prefer: "count=estimated" },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`dataparl ${table} : HTTP ${r.status}`);
  const range = r.headers.get("content-range");
  const total = range && range.includes("/") && !range.endsWith("*") ? Number(range.split("/")[1]) : null;
  return { rows: (await r.json()) as unknown[], total };
}

// Lecture avec cache serveur persistant (clé : table + requête). Une lecture
// identique ne part vers Supabase qu'une fois par fenêtre de revalidation,
// quel que soit le nombre de rendus. Avant ce cache, toutes les lectures
// partaient réellement vers Supabase (~100 000 requêtes REST/24 h, egress
// dépassé), dont 16 000 rien que pour la page 404. revalidate <= 0 (données
// admin ou nominatives) court-circuite le cache. Étiquette « dp-<table> » :
// revalidateTag permet de rafraîchir une table après une collecte sans
// attendre la fin de la fenêtre.
export async function dataQuery<T>(table: string, params: URLSearchParams, revalidate = 300): Promise<{ rows: T[]; total: number | null }> {
  const requete = params.toString();
  const r = revalidate <= 0
    ? await requeteBrute(table, requete)
    : await unstable_cache(requeteBrute, ["dp", table, requete], { revalidate, tags: [`dp-${table}`] })(table, requete);
  return { rows: r.rows as T[], total: r.total };
}

export async function derniersMouvements(limit = 10, chambre?: Mouvement["chambre"]): Promise<Mouvement[]> {
  const p = new URLSearchParams({
    select: COLONNES_PUBLIQUES,
    source: "eq.live",
    order: "date_event.desc,chambre.asc",
    limit: String(limit),
  });
  if (chambre) p.set("chambre", `eq.${chambre}`);
  p.set("not.or", paramExclusionMvts());
  return (await dataQuery<Mouvement>("mouvements", p)).rows;
}

export async function compteAffectations(): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const chambre of ["assemblee", "senat", "europarl"]) {
    const p = new URLSearchParams({ select: "elu_cle", chambre: `eq.${chambre}`, limit: "1" });
    // Au PE, on ne compte que les personnes : les sociétés (tiers payants,
    // prestataires) sont suivies sur leurs pages dédiées, hors des compteurs.
    if (chambre === "europarl") p.set("fonction", `not.in.(${FONCTIONS_SOCIETES.map((f) => `"${f}"`).join(",")})`);
    out[chambre] = (await dataQuery<unknown>("affectations", p, 3600)).total ?? 0;
  }
  return out;
}

// ── Référentiel des élus (d'après l'état courant des affectations) ──────────

export type Elu = { chambre: Mouvement["chambre"]; cle: string; id: string; nom: string; groupe: string; n_collabs: number };

// PostgREST plafonne chaque réponse (1 000 lignes par défaut) : on pagine.
export async function dataQueryTout<T>(table: string, params: URLSearchParams, revalidate = 3600, page = 1000): Promise<T[]> {
  const out: T[] = [];
  for (let offset = 0; offset < 100_000; offset += page) {
    const p = new URLSearchParams(params);
    p.set("limit", String(page));
    p.set("offset", String(offset));
    const { rows } = await dataQuery<T>(table, p, revalidate);
    out.push(...rows);
    if (rows.length < page) break;
  }
  return out;
}

export async function referentiel(): Promise<Elu[]> {
  const p = new URLSearchParams({ select: "chambre,elu_cle,elu_id,elu_nom,elu_groupe", order: "chambre,elu_cle,collab_cle" });
  const rows = await dataQueryTout<{ chambre: Elu["chambre"]; elu_cle: string; elu_id: string; elu_nom: string; elu_groupe: string }>(
    "affectations", p,
  );
  const parCle = new Map<string, Elu>();
  for (const r of rows) {
    const k = `${r.chambre}|${r.elu_cle}`;
    const e = parCle.get(k);
    if (e) e.n_collabs += 1;
    else parCle.set(k, { chambre: r.chambre, cle: r.elu_cle, id: r.elu_id, nom: r.elu_nom, groupe: r.elu_groupe, n_collabs: 1 });
  }
  return [...parCle.values()].sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
}

export function groupesDe(elus: Elu[]): Record<string, string[]> {
  const out: Record<string, Set<string>> = {};
  for (const e of elus) if (e.groupe) (out[e.chambre] ??= new Set()).add(e.groupe);
  return Object.fromEntries(Object.entries(out).map(([c, s]) => [c, [...s].sort()]));
}

// ── Recherche de mouvements (toutes sources) ──────────────────────────────

export type Filtres = {
  chambre?: string; type?: string; groupe?: string; elu?: string; q?: string;
  elus?: string[]; // identifiants et clés d'un même élu (voir cleElus)
  depuis?: string; jusqua?: string; limit?: number; offset?: number;
};

const CHAMBRES_OK = new Set(["assemblee", "senat", "europarl"]);
const TYPES_OK = new Set(["arrivee", "depart", "transfert"]);
const DATE_OK = /^\d{4}-\d{2}-\d{2}$/;
const TEXTE_OK = /^[\p{L}\p{N} .'${APOS}_-]{1,80}$/u;
const GROUPE_OK = /^[\p{L}\p{N} .'${APOS}\/&-]{1,40}$/u;
const q_ = (v: string) => `"${v.replace(/"/g, "")}"`;

export function normaliser(t: string): string {
  return t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[-'${APOS}.]/g, " ").replace(/[^a-z0-9 ]/g, "").trim();
}

// Construit les paramètres PostgREST ; renvoie null si un filtre est invalide.
export function parametresRecherche(f: Filtres): URLSearchParams | null {
  const p = new URLSearchParams({
    select: COLONNES_PUBLIQUES,
    order: "date_event.desc,id.asc",
    limit: String(Math.min(Math.max(f.limit ?? 50, 1), 500)),
    offset: String(Math.max(f.offset ?? 0, 0)),
  });
  const et: string[] = [];
  if (f.chambre) { if (!CHAMBRES_OK.has(f.chambre)) return null; p.set("chambre", `eq.${f.chambre}`); }
  if (f.type) { if (!TYPES_OK.has(f.type)) return null; p.set("type", `eq.${f.type}`); }
  if (f.groupe) {
    // Un code de famille (« ECO ») couvre tous ses groupes dans les trois chambres.
    if (!GROUPE_OK.test(f.groupe)) return null;
    const liste = siglesDe(f.groupe, f.chambre).map(q_).join(",");
    et.push(`or(elu_groupe.in.(${liste}),elu_origine_groupe.in.(${liste}))`);
  }
  const elus = f.elus?.length ? f.elus : f.elu ? [f.elu] : [];
  if (elus.length) {
    if (!elus.every((e) => TEXTE_OK.test(e))) return null;
    const liste = elus.map(q_).join(",");
    et.push(`or(elu_cle.in.(${liste}),elu_id.in.(${liste}),elu_origine_cle.in.(${liste}),elu_origine_id.in.(${liste}))`);
  }
  if (f.depuis) { if (!DATE_OK.test(f.depuis)) return null; et.push(`date_event.gte.${f.depuis}`); }
  if (f.jusqua) { if (!DATE_OK.test(f.jusqua)) return null; et.push(`date_event.lte.${f.jusqua}`); }
  if (f.q) {
    if (!TEXTE_OK.test(f.q)) return null;
    // Chaque mot doit apparaître quelque part ; collab_cle est déjà sans accents
    // (on compare le mot normalisé), elu_nom sans tenir compte de la casse.
    for (const brut of f.q.split(/[\s-]+/).filter(Boolean).slice(0, 6)) {
      const n = normaliser(brut).replace(/ /g, "");
      if (!n) continue;
      const e = brut.replace(/["*]/g, "");
      et.push(`or(collab_cle.ilike."*${n}*",elu_nom.ilike."*${e}*",elu_origine_nom.ilike."*${e}*")`);
    }
  }
  if (et.length) p.set("and", `(${et.join(",")})`);
  p.set("not.or", paramExclusionMvts());
  return p;
}

// Les sources internes sont présentées comme « suivi quotidien » ou « archives ».
export function sourcePublique(source: string): "suivi" | "archives" {
  return source === "live" ? "suivi" : "archives";
}
