import { NextResponse } from "next/server";
import { consommer } from "@/lib/apiKeys";
import { authAdmin } from "@/lib/supabaseAdmin";
import { COLONNES_PUBLIQUES, dataQuery, normaliser, type Mouvement } from "@/lib/data";

// GET https://api.dataparl.fr/v1/mouvements
//   ?chambre=assemblee|senat|europarl  ?type=arrivee|depart|transfert
//   ?depuis=AAAA-MM-JJ  ?jusqua=AAAA-MM-JJ  ?elu=<identifiant de l'élu>
//   ?collab=<nom ou prénom du collaborateur, correspondance partielle>
//   ?groupe=<code ou codes séparés par virgules> (elu_groupe / elu_origine_groupe)
//   ?source=suivi|archives  ?limit=1..500  ?offset=0..
// Tous les filtres se combinent (ET).
// Chaque requête consommant du quota est journalisée dans public.api_journal
// (endpoint, paramètres, IP, user-agent, statut, durée) — jamais bloquant.

const CHAMBRES = new Set(["assemblee", "senat", "europarl"]);
const TYPES = new Set(["arrivee", "depart", "transfert"]);
// Les sources internes sont exposées sous deux noms publics.
const SOURCES: Record<string, string> = { suivi: "eq.live", archives: "in.(regardscitoyens,wayback)" };
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const GROUPE = /^[\p{L}\p{N} .'-]{1,40}$(?:,[\p{L}\p{N} .'-]{1,40})*$/u;
const TEXTE = /^[\p{L}\p{N} .'-]{1,80}$/u;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, X-API-Key",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(req: Request) {
  const verdict = await consommer(req);
  if (!verdict.ok) {
    return NextResponse.json({ error: verdict.message }, { status: verdict.status, headers: CORS });
  }
  const t0 = Date.now();
  const q = new URL(req.url).searchParams;

  // Traçabilité : la journalisation ne doit jamais faire échouer la requête.
  const journal = async (statut: number, erreurMsg: string | null = null) => {
    try {
      const { error } = await authAdmin().rpc("api_journaliser", {
        p_key_id: verdict.cleId,
        p_endpoint: "/v1/mouvements",
        p_methode: "GET",
        p_parametres: q.toString().slice(0, 2000),
        p_ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        p_user_agent: req.headers.get("user-agent"),
        p_statut: statut,
        p_duree_ms: Date.now() - t0,
        p_erreur: erreurMsg,
      });
      if (error) console.error("api_journaliser", error.message);
    } catch { /* silencieux */ }
  };
  const reponse = async (statut: number, corps: Record<string, unknown>, headers: Record<string, string> = CORS, erreurMsg: string | null = null) => {
    await journal(statut, erreurMsg);
    return NextResponse.json(corps, { status: statut, headers });
  };
  const erreurParam = (param: string) => reponse(400, { error: `paramètre invalide : ${param}` }, CORS, param);

  const quotaHeaders = {
    "X-RateLimit-Limit": String(verdict.quota),
    "X-RateLimit-Remaining": String(Math.max(verdict.quota - verdict.requetes, 0)),
  };
  const limit = Math.min(Math.max(Number(q.get("limit") ?? 100) || 100, 1), 500);
  const offset = Math.max(Number(q.get("offset") ?? 0) || 0, 0);
  const p = new URLSearchParams({ select: COLONNES_PUBLIQUES, order: "date_event.desc,id.asc", limit: String(limit), offset: String(offset) });

  // Conditions cumulables, assemblées dans un seul « and » PostgREST.
  const et: string[] = [];

  const chambre = q.get("chambre");
  if (chambre) { if (!CHAMBRES.has(chambre)) return erreurParam("chambre"); et.push(`chambre.eq.${chambre}`); }
  const type = q.get("type");
  if (type) { if (!TYPES.has(type)) return erreurParam("type"); et.push(`type.eq.${type}`); }
  const source = q.get("source");
  if (source) { if (!(source in SOURCES)) return erreurParam("source"); p.set("source", SOURCES[source]); }

  const groupe = q.get("groupe");
  if (groupe) {
    if (!GROUPE.test(groupe)) return erreurParam("groupe");
    const liste = groupe.split(",").map((g) => `"${g.replace(/"/g, "")}"`).join(",");
    et.push(`or(elu_groupe.in.(${liste}),elu_origine_groupe.in.(${liste}))`);
  }

  const depuis = q.get("depuis"), jusqua = q.get("jusqua");
  if (depuis && !DATE.test(depuis)) return erreurParam("depuis");
  if (jusqua && !DATE.test(jusqua)) return erreurParam("jusqua");
  if (depuis) et.push(`date_event.gte.${depuis}`);
  if (jusqua) et.push(`date_event.lte.${jusqua}`);

  const elu = q.get("elu");
  if (elu) {
    if (!TEXTE.test(elu)) return erreurParam("elu");
    et.push(`or(elu_cle.eq."${elu}",elu_id.eq."${elu}")`);
  }

  const collab = q.get("collab");
  if (collab) {
    if (!TEXTE.test(collab)) return erreurParam("collab");
    // collab_cle est stockée normalisée (sans accents) : on compare aussi le
    // nom et le prénom tels quels, en correspondance partielle.
    const n = normaliser(collab).replace(/ /g, "");
    const e = collab.replace(/["*]/g, "");
    et.push(`or(collab_cle.ilike."*${n}*",collab_nom.ilike."*${e}*",collab_prenom.ilike."*${e}*")`);
  }

  if (et.length) p.set("and", `(${et.join(",")})`);

  try {
    const { rows, total } = await dataQuery<Mouvement>("mouvements", p, 300);
    return reponse(
      200,
      {
        total, limit, offset,
        mouvements: rows.map((m) => ({ ...m, source: m.source === "live" ? "suivi" : "archives" })),
        licence: "ODbL 1.0",
        attribution: "DataParl' (dataparl.fr), d'après les publications de l'Assemblée nationale et du Sénat",
      },
      { ...CORS, ...quotaHeaders, "Cache-Control": "private, max-age=60" },
    );
  } catch {
    return reponse(503, { error: "données indisponibles" }, CORS, "données indisponibles");
  }
}
