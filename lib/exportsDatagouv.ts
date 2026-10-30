import { dataQueryTout } from "./data";
import { utilisateur } from "./userAuth";
import { NOMS_COMPLETS } from "./partisNoms";

// Moteur des exports CSV publiés sur data.gouv.fr (jeux « Collaborateurs
// parlementaires » et « Parlementaires français »), servis sur
// media.dataparl.fr/assets/{collab|parl}/<slug>.csv. Chaque export est décrit
// ici : entêtes + chargeur. Téléchargement réservé aux comptes DataParl'
// (verrou appliqué par servirCSV) ; périodes en cours uniquement, sauf pour
// les mouvements et les parcours croisés qui sont historiques par nature.

export type LigneExport = (string | null)[];
export type ExportDef = { entetes: string[]; charger: () => Promise<LigneExport[]> };

const CHAMBRE_LONG: Record<string, string> = { assemblee: "Assemblée nationale", senat: "Sénat", europarl: "Parlement européen" };

// : Départements → régions (Code officiel géographique) :
const REGIONS: Record<string, readonly string[]> = {
  "Auvergne-Rhône-Alpes": ["Ain", "Allier", "Ardèche", "Cantal", "Drôme", "Haute-Loire", "Haute-Savoie", "Isère", "Loire", "Puy-de-Dôme", "Rhône", "Savoie"],
  "Bourgogne-Franche-Comté": ["Côte-d'Or", "Doubs", "Haute-Saône", "Jura", "Nièvre", "Saône-et-Loire", "Territoire de Belfort", "Yonne"],
  "Bretagne": ["Côtes-d'Armor", "Finistère", "Ille-et-Vilaine", "Morbihan"],
  "Centre-Val de Loire": ["Cher", "Eure-et-Loir", "Indre", "Indre-et-Loire", "Loir-et-Cher", "Loiret"],
  "Corse": ["Corse-du-Sud", "Haute-Corse"],
  "Grand Est": ["Ardennes", "Aube", "Bas-Rhin", "Haute-Marne", "Haut-Rhin", "Marne", "Meurthe-et-Moselle", "Meuse", "Moselle", "Vosges"],
  "Hauts-de-France": ["Aisne", "Nord", "Oise", "Pas-de-Calais", "Somme"],
  "Île-de-France": ["Essonne", "Hauts-de-Seine", "Paris", "Seine-et-Marne", "Seine-Saint-Denis", "Val-d'Oise", "Val-de-Marne", "Yvelines"],
  "Normandie": ["Calvados", "Eure", "Manche", "Orne", "Seine-Maritime"],
  "Nouvelle-Aquitaine": ["Charente", "Charente-Maritime", "Corrèze", "Creuse", "Deux-Sèvres", "Dordogne", "Gironde", "Haute-Vienne", "Landes", "Lot-et-Garonne", "Pyrénées-Atlantiques", "Vienne"],
  "Occitanie": ["Ariège", "Aude", "Aveyron", "Gard", "Gers", "Haute-Garonne", "Hautes-Pyrénées", "Hérault", "Lot", "Lozère", "Pyrénées-Orientales", "Tarn", "Tarn-et-Garonne"],
  "Pays de la Loire": ["Loire-Atlantique", "Maine-et-Loire", "Mayenne", "Sarthe", "Vendée"],
  "Provence-Alpes-Côte d'Azur": ["Alpes-de-Haute-Provence", "Alpes-Maritimes", "Bouches-du-Rhône", "Hautes-Alpes", "Var", "Vaucluse"],
  "Guadeloupe": ["Guadeloupe"],
  "Martinique": ["Martinique"],
  "Guyane": ["Guyane"],
  "La Réunion": ["La Réunion"],
  "Mayotte": ["Mayotte"],
  "Français établis hors de France": ["Français établis hors de France"],
};
const DEPT_VERS_REGION: Record<string, string> = {};
for (const [region, depts] of Object.entries(REGIONS)) for (const d of depts) DEPT_VERS_REGION[d] = region;
const regionDu = (departement: string | null): string => (departement && DEPT_VERS_REGION[departement]) || "";

// : Types des données lues :
type Periode = { collab_id: string; chambre: string; elu_id: string; elu_nom: string; debut: string | null; fin: string | null; en_cours: boolean; fonction: string | null };
type Collab = { collab_id: string; prenom: string; nom: string; genre: string | null };
type Parlementaire = { elu_id: string; chambre: string; civilite: string; prenom: string; nom: string; circonscription: string | null; departement: string | null; groupe: string | null; groupe_libelle: string | null; premier_mandat: string | null; actif: boolean };
type Appartenance = { chambre: string; elu_id: string; type: string; libelle: string; fonction: string | null; debut: string | null; fin: string | null };
type Mouvement = { date_event: string; chambre: string; type: string; collab_prenom: string; collab_nom: string; elu_nom: string; elu_groupe: string | null; fonction: string | null };

const param = (o: Record<string, string>) => new URLSearchParams(o);
const enCours = (a: Appartenance) => (a.fin ?? "") === "";

// : Base commune : périodes en cours + collaborateurs + parlementaires :
type Base = {
  periodes: Periode[];
  noms: Map<string, string>;
  genres: Map<string, string>;
  elus: Map<string, Parlementaire>;
};
async function base(): Promise<Base> {
  const [periodes, collabs, parlementaires] = await Promise.all([
    dataQueryTout<Periode>("periodes", param({ select: "collab_id,chambre,elu_id,elu_nom,debut,fin,en_cours,fonction", en_cours: "eq.true" })),
    dataQueryTout<Collab>("collaborateurs", param({ select: "collab_id,prenom,nom,genre" })),
    dataQueryTout<Parlementaire>("parlementaires", param({ select: "elu_id,chambre,civilite,prenom,nom,circonscription,departement,groupe,groupe_libelle,premier_mandat,actif" })),
  ]);
  const noms = new Map(collabs.map((c) => [c.collab_id, [c.prenom, c.nom].filter(Boolean).join(" ")]));
  const genres = new Map(collabs.map((c) => [c.collab_id, c.genre ?? ""]));
  const elus = new Map(parlementaires.map((p) => [p.chambre + ":" + p.elu_id, p]));
  return { periodes, noms, genres, elus };
}

async function appartenanceEnCours(): Promise<Appartenance[]> {
  const rows = await dataQueryTout<Appartenance>("appartenances", param({ select: "chambre,elu_id,type,libelle,fonction,debut,fin" }));
  return rows.filter(enCours);
}

const nomParti = (sigle: string) => NOMS_COMPLETS[sigle] ?? sigle;
const typeCommission = new Set(["commission", "commission_enquete", "commission_speciale"]);
const estBureauCommission = (f: string) => /pr[ée]sident|vice|rapporteur/i.test(f);

// : Registre des exports « collaborateurs » (/assets/collab/<slug>.csv) :
export const EXPORTS_COLLAB: Record<string, ExportDef> = {
  an: chambre("assemblee"),
  senat: chambre("senat"),
  pe: chambre("europarl"),
  tous: {
    entetes: ["collaborateur", "elu", "fonction", "chambre", "debut"],
    charger: async () => {
      const b = await base();
      return b.periodes.map((p) => [b.noms.get(p.collab_id) ?? "", p.elu_nom, p.fonction ?? "", p.chambre, p.debut]);
    },
  },
  "par-commission": {
    entetes: ["collaborateur", "elu", "chambre", "commission", "fonction_commission", "debut"],
    charger: async () => {
      const [b, app] = await Promise.all([base(), appartenanceEnCours()]);
      const parCommission = new Map<string, Appartenance[]>();
      for (const a of app) {
        if (!typeCommission.has(a.type)) continue;
        const k = a.chambre + ":" + a.elu_id;
        (parCommission.get(k) ?? parCommission.set(k, []).get(k)!).push(a);
      }
      const lignes: LigneExport[] = [];
      for (const p of b.periodes) {
        for (const a of parCommission.get(p.chambre + ":" + p.elu_id) ?? []) {
          lignes.push([b.noms.get(p.collab_id) ?? "", p.elu_nom, p.chambre, a.libelle, a.fonction ?? "", p.debut]);
        }
      }
      return lignes.sort((x, y) => String(x[3]).localeCompare(String(y[3]), "fr"));
    },
  },
  "par-groupe": segmentation((b, p) => {
    const e = b.elus.get(p.chambre + ":" + p.elu_id);
    return [e?.groupe ?? "", b.noms.get(p.collab_id) ?? "", p.elu_nom, p.chambre, p.debut];
  }, ["groupe", "collaborateur", "elu", "chambre", "debut"], 0),
  "par-parti": segmentation((b, p) => {
    const sigle = b.elus.get(p.chambre + ":" + p.elu_id)?.groupe ?? "";
    return [sigle, nomParti(sigle), b.noms.get(p.collab_id) ?? "", p.elu_nom, p.chambre, p.debut];
  }, ["parti", "parti_nom", "collaborateur", "elu", "chambre", "debut"], 0),
  "par-departement": segmentation((b, p) => {
    const e = b.elus.get(p.chambre + ":" + p.elu_id);
    return [e?.departement ?? "", e?.circonscription ?? "", p.elu_nom, b.noms.get(p.collab_id) ?? "", p.chambre, p.debut];
  }, ["departement", "circonscription", "elu", "collaborateur", "chambre", "debut"], 0),
  "par-region": segmentation((b, p) => {
    const e = b.elus.get(p.chambre + ":" + p.elu_id);
    return [regionDu(e?.departement ?? null), e?.departement ?? "", p.elu_nom, b.noms.get(p.collab_id) ?? "", p.chambre, p.debut];
  }, ["region", "departement", "elu", "collaborateur", "chambre", "debut"], 0),
  "par-fonction": segmentation((b, p) => [p.fonction ?? "", b.noms.get(p.collab_id) ?? "", p.elu_nom, p.chambre, p.debut],
    ["fonction", "collaborateur", "elu", "chambre", "debut"], 0),
  "par-elu": segmentation((b, p) => {
    const e = b.elus.get(p.chambre + ":" + p.elu_id);
    return [p.elu_nom, p.chambre, e?.groupe ?? "", b.noms.get(p.collab_id) ?? "", p.fonction ?? "", p.debut];
  }, ["elu", "chambre", "groupe", "collaborateur", "fonction", "debut"], 0),
  "par-anciennete": {
    entetes: ["debut", "collaborateur", "elu", "chambre", "fonction"],
    charger: async () => {
      const b = await base();
      return b.periodes
        .map((p) => [p.debut ?? "", b.noms.get(p.collab_id) ?? "", p.elu_nom, p.chambre, p.fonction ?? ""])
        .sort((x, y) => String(y[0]).localeCompare(String(x[0])));
    },
  },
  mouvements: {
    entetes: ["date", "chambre", "type", "collaborateur", "elu", "groupe", "fonction"],
    charger: async () => {
      const rows = await dataQueryTout<Mouvement>("mouvements", param({ select: "date_event,chambre,type,collab_prenom,collab_nom,elu_nom,elu_groupe,fonction", source: "eq.live", order: "date_event.desc,id.asc" }));
      return rows.map((m) => [m.date_event, m.chambre, m.type, [m.collab_prenom, m.collab_nom].filter(Boolean).join(" "), m.elu_nom, m.elu_groupe ?? "", m.fonction ?? ""]);
    },
  },
  "parcours-croises": {
    entetes: ["collaborateur", "chambre", "elu", "debut", "fin", "en_poste"],
    charger: async () => {
      const [periodes, collabs] = await Promise.all([
        dataQueryTout<Periode>("periodes", param({ select: "collab_id,chambre,elu_id,elu_nom,debut,fin,en_cours,fonction", order: "collab_id,debut" })),
        dataQueryTout<Collab>("collaborateurs", param({ select: "collab_id,prenom,nom,genre" })),
      ]);
      const noms = new Map(collabs.map((c) => [c.collab_id, [c.prenom, c.nom].filter(Boolean).join(" ")]));
      const parCollab = new Map<string, Periode[]>();
      for (const p of periodes) {
        if (!parCollab.has(p.collab_id)) parCollab.set(p.collab_id, []);
        parCollab.get(p.collab_id)!.push(p);
      }
      const lignes: LigneExport[] = [];
      for (const [id, ps] of parCollab) {
        if (new Set(ps.map((p) => p.chambre + ":" + p.elu_id)).size < 2) continue;
        for (const p of ps) lignes.push([noms.get(id) ?? "", p.chambre, p.elu_nom, p.debut, p.fin, p.en_cours ? "oui" : "non"]);
      }
      return lignes;
    },
  },
  "par-genre": {
    entetes: ["collaborateur", "genre", "elu", "chambre", "debut", "femmes_equipe", "hommes_equipe", "indetermines_equipe", "part_femmes_equipe"],
    charger: async () => {
      const b = await base();
      const equipes = new Map<string, { f: number; h: number; x: number }>();
      for (const p of b.periodes) {
        const k = p.chambre + ":" + p.elu_id;
        const e = equipes.get(k) ?? { f: 0, h: 0, x: 0 };
        const g = (b.genres.get(p.collab_id) ?? "X").toUpperCase();
        if (g === "F") e.f++; else if (g === "H") e.h++; else e.x++;
        equipes.set(k, e);
      }
      return b.periodes.map((p) => {
        const e = equipes.get(p.chambre + ":" + p.elu_id)!;
        const total = e.f + e.h + e.x;
        const part = total > 0 ? Math.round((e.f / total) * 100) + " %" : "";
        return [b.noms.get(p.collab_id) ?? "", (b.genres.get(p.collab_id) ?? "X").toUpperCase(), p.elu_nom, p.chambre, p.debut, String(e.f), String(e.h), String(e.x), part];
      });
    },
  },
  "par-chambre-parti": segmentation((b, p) => {
    const sigle = b.elus.get(p.chambre + ":" + p.elu_id)?.groupe ?? "";
    return [p.chambre, sigle, nomParti(sigle), b.noms.get(p.collab_id) ?? "", p.elu_nom, p.debut];
  }, ["chambre", "parti", "parti_nom", "collaborateur", "elu", "debut"], 0),
};

function chambre(code: string): ExportDef {
  return {
    entetes: ["collaborateur", "elu", "fonction", "chambre", "debut"],
    charger: async () => {
      const b = await base();
      return b.periodes.filter((p) => p.chambre === code)
        .map((p) => [b.noms.get(p.collab_id) ?? "", p.elu_nom, p.fonction ?? "", p.chambre, p.debut]);
    },
  };
}

function segmentation(ligne: (b: Base, p: Periode) => LigneExport, entetes: string[], tri: number): ExportDef {
  return {
    entetes,
    charger: async () => {
      const b = await base();
      return b.periodes.map((p) => ligne(b, p)).sort((x, y) => String(x[tri]).localeCompare(String(y[tri]), "fr"));
    },
  };
}

// : Registre des exports « parlementaires » (/assets/parl/<slug>.csv) :
async function parlementairesTous(): Promise<Parlementaire[]> {
  return dataQueryTout<Parlementaire>("parlementaires", param({ select: "elu_id,chambre,civilite,prenom,nom,circonscription,departement,groupe,groupe_libelle,premier_mandat,actif", order: "chambre,nom.asc" }));
}
const ligneParlementaire = (p: Parlementaire): LigneExport => [
  p.chambre, p.civilite, p.prenom, p.nom, p.circonscription ?? "", p.departement ?? "",
  p.groupe ?? "", p.groupe_libelle ?? "", p.premier_mandat ?? "", p.actif ? "oui" : "non",
];
const ENTETES_PARL = ["chambre", "civilite", "prenom", "nom", "circonscription", "departement", "groupe", "groupe_libelle", "premier_mandat", "en_exercice"];

export const EXPORTS_PARL: Record<string, ExportDef> = {
  "deputes-an": { entetes: ENTETES_PARL, charger: async () => (await parlementairesTous()).filter((p) => p.chambre === "assemblee").map(ligneParlementaire) },
  senateurs: { entetes: ENTETES_PARL, charger: async () => (await parlementairesTous()).filter((p) => p.chambre === "senat").map(ligneParlementaire) },
  "deputes-pe": { entetes: ENTETES_PARL, charger: async () => (await parlementairesTous()).filter((p) => p.chambre === "europarl").map(ligneParlementaire) },
  tous: { entetes: ENTETES_PARL, charger: async () => (await parlementairesTous()).map(ligneParlementaire) },
  "par-groupe": {
    entetes: ["chambre", "groupe", "groupe_libelle", "civilite", "prenom", "nom", "circonscription", "premier_mandat", "en_exercice"],
    charger: async () => (await parlementairesTous()).map((p) => [p.chambre, p.groupe ?? "", p.groupe_libelle ?? "", p.civilite, p.prenom, p.nom, p.circonscription ?? "", p.premier_mandat ?? "", p.actif ? "oui" : "non"])
      .sort((x, y) => String(x[1]).localeCompare(String(y[1]), "fr")),
  },
  "par-parti": {
    entetes: ["chambre", "parti", "parti_nom", "civilite", "prenom", "nom", "circonscription", "en_exercice"],
    charger: async () => (await parlementairesTous()).map((p) => [p.chambre, p.groupe ?? "", nomParti(p.groupe ?? ""), p.civilite, p.prenom, p.nom, p.circonscription ?? "", p.actif ? "oui" : "non"])
      .sort((x, y) => String(x[1]).localeCompare(String(y[1]), "fr")),
  },
  "par-departement": {
    entetes: ["departement", "circonscription", "chambre", "civilite", "prenom", "nom", "groupe", "en_exercice"],
    charger: async () => (await parlementairesTous()).map((p) => [p.departement ?? "", p.circonscription ?? "", p.chambre, p.civilite, p.prenom, p.nom, p.groupe ?? "", p.actif ? "oui" : "non"])
      .sort((x, y) => String(x[0]).localeCompare(String(y[0]), "fr")),
  },
  "par-region": {
    entetes: ["region", "departement", "chambre", "civilite", "prenom", "nom", "groupe", "en_exercice"],
    charger: async () => (await parlementairesTous()).map((p) => [regionDu(p.departement), p.departement ?? "", p.chambre, p.civilite, p.prenom, p.nom, p.groupe ?? "", p.actif ? "oui" : "non"])
      .sort((x, y) => String(x[0]).localeCompare(String(y[0]), "fr")),
  },
  "par-commission": {
    entetes: ["chambre", "parlementaire", "groupe", "type", "commission", "fonction", "debut"],
    charger: async () => {
      const [parl, app] = await Promise.all([parlementairesTous(), appartenanceEnCours()]);
      const noms = new Map(parl.map((p) => [p.chambre + ":" + p.elu_id, [p.prenom, p.nom].filter(Boolean).join(" ")]));
      const groupes = new Map(parl.map((p) => [p.chambre + ":" + p.elu_id, p.groupe ?? ""]));
      return app.filter((a) => typeCommission.has(a.type))
        .map((a) => [a.chambre, noms.get(a.chambre + ":" + a.elu_id) ?? a.elu_id, groupes.get(a.chambre + ":" + a.elu_id) ?? "", a.type, a.libelle, a.fonction ?? "", a.debut])
        .sort((x, y) => String(x[4]).localeCompare(String(y[4]), "fr"));
    },
  },
  "bureaux-commissions": {
    entetes: ["chambre", "parlementaire", "commission", "fonction", "debut"],
    charger: async () => {
      const [parl, app] = await Promise.all([parlementairesTous(), appartenanceEnCours()]);
      const noms = new Map(parl.map((p) => [p.chambre + ":" + p.elu_id, [p.prenom, p.nom].filter(Boolean).join(" ")]));
      return app.filter((a) => typeCommission.has(a.type) && a.fonction && estBureauCommission(a.fonction))
        .map((a) => [a.chambre, noms.get(a.chambre + ":" + a.elu_id) ?? a.elu_id, a.libelle, a.fonction ?? "", a.debut])
        .sort((x, y) => String(x[2]).localeCompare(String(y[2]), "fr"));
    },
  },
  delegations: {
    entetes: ["chambre", "parlementaire", "delegation", "fonction", "debut"],
    charger: async () => {
      const [parl, app] = await Promise.all([parlementairesTous(), appartenanceEnCours()]);
      const noms = new Map(parl.map((p) => [p.chambre + ":" + p.elu_id, [p.prenom, p.nom].filter(Boolean).join(" ")]));
      return app.filter((a) => a.type === "delegation")
        .map((a) => [a.chambre, noms.get(a.chambre + ":" + a.elu_id) ?? a.elu_id, a.libelle, a.fonction ?? "", a.debut])
        .sort((x, y) => String(x[2]).localeCompare(String(y[2]), "fr"));
    },
  },
};

// : Réponse CSV générique : verrou compte, CORS www, BOM UTF-8 :
export async function servirCSV(req: Request, file: string, exportsDisponibles: Record<string, ExportDef>, prefixe: string): Promise<Response> {
  const user = await utilisateur(req);
  if (!user) {
    const suite = "/assets/" + prefixe + "/" + encodeURIComponent(file);
    return Response.redirect("https://www.dataparl.fr/acces-ressource?suite=" + encodeURIComponent(suite), 302);
  }
  const slug = decodeURIComponent(file).replace(/\.csv$/i, "");
  const def = exportsDisponibles[slug];
  if (!def) {
    return new Response("Export inconnu. Disponibles : " + Object.keys(exportsDisponibles).map((s) => "/assets/" + prefixe + "/" + s + ".csv").join(", "), { status: 404 });
  }
  let lignes: LigneExport[] = [];
  try { lignes = await def.charger(); } catch { return new Response("donnees indisponibles", { status: 503 }); }
  const esc = (v: string | null): string => {
    const s = String(v ?? "");
    return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const csv = "\uFEFF" + def.entetes.join(",") + "\n" + (lignes.length ? lignes.map((l) => l.map(esc).join(",")).join("\n") + "\n" : "");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "private, no-store",
      "Content-Disposition": 'inline; filename="' + slug + '.csv"',
      "Access-Control-Allow-Origin": "https://www.dataparl.fr",
    },
  });
}

export function reponseOptions(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "https://www.dataparl.fr",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export { CHAMBRE_LONG };
