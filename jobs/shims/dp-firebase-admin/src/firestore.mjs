// firebase-admin/firestore — shim dp-firebase-admin.
// Surface utilisée par DataParl' : initializeFirestore(app,{preferRest:true}) /
// getFirestore(app) puis collection(c).where(...).limit(n).get() et
// doc(id).get()/create()/update()/delete()/set(data,{merge:true}).
// Implémentation 100 % REST v1 (runQuery + documents/{id}), signée OAuth2
// depuis le compte de service : aucune dépendance gRPC, compatible workerd.

import { jetonAcces } from "./jetons.mjs";

const BASE = "https://firestore.googleapis.com/v1/projects";
const SCOPE_FS = ["https://www.googleapis.com/auth/datastore"];

// --- Conversions valeurs JS <-> Firestore REST ---------------------------

export function versFs(valeur) {
  if (valeur === null || valeur === undefined) return { nullValue: null };
  if (typeof valeur === "string") return { stringValue: valeur };
  if (typeof valeur === "boolean") return { booleanValue: valeur };
  if (typeof valeur === "number") {
    return Number.isInteger(valeur) ? { integerValue: String(valeur) } : { doubleValue: valeur };
  }
  if (Array.isArray(valeur)) return { arrayValue: { values: valeur.map(versFs) } };
  if (valeur instanceof Date) return { timestampValue: valeur.toISOString() };
  if (typeof valeur === "object") {
    const fields = {};
    for (const [k, v] of Object.entries(valeur)) fields[k] = versFs(v);
    return { mapValue: { fields } };
  }
  throw new Error(`versFs : type non supporté (${typeof valeur})`);
}

export function depuisFs(valeur) {
  if (!valeur || typeof valeur !== "object") return null;
  if ("nullValue" in valeur) return null;
  if ("stringValue" in valeur) return valeur.stringValue;
  if ("booleanValue" in valeur) return valeur.booleanValue;
  if ("integerValue" in valeur) return Number(valeur.integerValue);
  if ("doubleValue" in valeur) return Number(valeur.doubleValue);
  if ("timestampValue" in valeur) return String(valeur.timestampValue);
  if ("arrayValue" in valeur) return (valeur.arrayValue.values ?? []).map(depuisFs);
  if ("mapValue" in valeur) return depuisChamps(valeur.mapValue.fields ?? {});
  if ("referenceValue" in valeur) return String(valeur.referenceValue);
  if ("geoPointValue" in valeur) return { latitude: valeur.geoPointValue.latitude, longitude: valeur.geoPointValue.longitude };
  if ("bytesValue" in valeur) return valeur.bytesValue;
  return null;
}

export function versChamps(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj ?? {})) fields[k] = versFs(v);
  return { fields };
}

export function depuisChamps(fields) {
  const out = {};
  for (const [k, v] of Object.entries(fields ?? {})) out[k] = depuisFs(v);
  return out;
}

// Chemins profonds a.b.c des masques de mise a jour.
export function cheminsMasque(obj, prefixe = "") {
  const out = [];
  for (const [k, v] of Object.entries(obj ?? {})) {
    const chemin = prefixe ? `${prefixe}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date)) {
      out.push(...cheminsMasque(v, chemin));
    } else {
      out.push(chemin);
    }
  }
  return out;
}

// --- Transport ------------------------------------------------------------

class ErreurFs extends Error {
  constructor(status, corps) {
    let message = `firestore ${status}`;
    try {
      const j = JSON.parse(corps);
      message = `${j?.error?.status ?? status} ${j?.error?.message ?? ""}`.trim() || message;
    } catch {}
    super(message);
    this.status = status;
    if (/ALREADY_EXISTS/i.test(message)) this.code = 6;
    else if (/NOT_FOUND/i.test(message)) this.code = 5;
  }
}

async function api(app, chemin, init = {}) {
  const sa = app?.credential?.__dpCert ? app.credential.sa : null;
  if (!sa) throw new Error("firestore : app sans credential cert() (compte de service attendu)");
  const bearer = await jetonAcces(sa, SCOPE_FS);
  const url = `${BASE}/${encodeURIComponent(sa.project_id)}/databases/(default)/documents${chemin}`;
  const r = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${bearer}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!r.ok) throw new ErreurFs(r.status, await r.text().catch(() => ""));
  return r.status === 204 ? null : r.json().catch(() => null);
}

const idDe = (nom) => nom.split("/").pop();

function snapshot(nom, fields) {
  return {
    id: idDe(nom),
    exists: true,
    data: () => depuisChamps(fields),
  };
}

// --- Requête (runQuery) -----------------------------------------------------

const OPS = {
  "==": "EQUAL",
  "!=": "NOT_EQUAL",
  "<": "LESS_THAN",
  "<=": "LESS_THAN_OR_EQUAL",
  ">": "GREATER_THAN",
  ">=": "GREATER_THAN_OR_EQUAL",
  in: "IN",
  "not-in": "NOT_IN",
  "array-contains": "ARRAY_CONTAINS",
  "array-contains-any": "ARRAY_CONTAINS_ANY",
};

class Requete {
  constructor(app, collectionId) {
    this.app = app;
    this.collectionId = collectionId;
    this.filtres = [];
    this.limite = null;
  }

  where(champ, op, valeur) {
    const opFs = OPS[op];
    if (!opFs) throw new Error(`where : opérateur non supporté par le shim (${op})`);
    this.filtres.push({ champ, opFs, valeur });
    return this;
  }

  limit(n) {
    this.limite = n;
    return this;
  }

  async get() {
    let where = null;
    if (this.filtres.length === 1) {
      const f = this.filtres[0];
      where = { fieldFilter: { field: { fieldPath: f.champ }, op: f.opFs, value: versFs(f.valeur) } };
    } else if (this.filtres.length > 1) {
      where = {
        compositeFilter: {
          op: "AND",
          filters: this.filtres.map((f) => ({
            fieldFilter: { field: { fieldPath: f.champ }, op: f.opFs, value: versFs(f.valeur) },
          })),
        },
      };
    }
    const structuredQuery = {
      from: [{ collectionId: this.collectionId }],
      ...(where ? { where } : {}),
      ...(this.limite ? { limit: this.limite } : {}),
    };
    const reponse = (await api(this.app, ":runQuery", { method: "POST", body: JSON.stringify({ structuredQuery }) })) ?? [];
    const docs = [];
    for (const ligne of reponse) {
      if (ligne?.document?.name) docs.push(snapshot(ligne.document.name, ligne.document.fields));
    }
    return { docs, empty: docs.length === 0, size: docs.length };
  }

  doc(id) {
    return nouveauDoc(this.app, this.collectionId, id);
  }
}

// --- Document ---------------------------------------------------------------

function nouveauDoc(app, collectionId, id) {
  const chemin = `/${encodeURIComponent(collectionId)}/${encodeURIComponent(id)}`;

  const lire = async () => {
    let corps;
    try {
      corps = await api(app, chemin, { method: "GET" });
    } catch (e) {
      if (e.code === 5 || e.status === 404) {
        return { id, exists: false, data: () => undefined };
      }
      throw e;
    }
    if (!corps?.name) return { id, exists: false, data: () => undefined };
    return snapshot(corps.name, corps.fields);
  };

  return {
    id,
    get: lire,

    // create : insère, échoue si le document existe (contrainte d'unicité dédiée).
    // PATCH = "updates or inserts", le prérequis currentDocument.exists=false
    // impose l'absence initiale (409 ALREADY_EXISTS sinon).
    async create(champs) {
      const q = "?currentDocument.exists=false";
      try {
        await api(app, `${chemin}${q}`, { method: "PATCH", body: JSON.stringify(versChamps(champs)) });
        return { id };
      } catch (e) {
        if (e.code === 6 || e.status === 409 || /ALREADY_EXISTS/i.test(e.message)) {
          const err = new Error("6 ALREADY_EXISTS: the document already exists");
          err.code = 6;
          throw err;
        }
        throw e;
      }
    },

    // update : PATCH + masque des champs passés (profonds inclus).
    async update(champs) {
      const params = new URLSearchParams();
      params.set("currentDocument.exists", "true");
      for (const p of cheminsMasque(champs)) params.append("updateMask.fieldPaths", p);
      await api(app, `${chemin}?${params.toString()}`, { method: "PATCH", body: JSON.stringify(versChamps(champs)) });
      return this;
    },

    // set : merge=true -> PATCH + masque (usages DataParl' uniquement merge).
    async set(champs, options = {}) {
      if (!options?.merge) {
        // Remplacement complet : PATCH sans masque (= tous les champs du corps).
        await api(app, chemin, { method: "PATCH", body: JSON.stringify(versChamps(champs)) });
        return this;
      }
      const params = new URLSearchParams();
      for (const p of cheminsMasque(champs)) params.append("updateMask.fieldPaths", p);
      await api(app, `${chemin}?${params.toString()}`, { method: "PATCH", body: JSON.stringify(versChamps(champs)) });
      return this;
    },

    async delete() {
      await api(app, chemin, { method: "DELETE" });
      return this;
    },
  };
}

// --- Fabriques ---------------------------------------------------------------

const cacheFs = new Map();

function instanceFs(app) {
  const existant = cacheFs.get(app.name);
  if (existant) return existant;
  const fs = {
    _app: app,
    collection(id) {
      return new Requete(app, id);
    },
    doc(chemin) {
      const [col, id] = String(chemin).split("/");
      if (!col || !id) throw new Error("doc : chemin collection/id attendu");
      return nouveauDoc(app, col, id);
    },
  };
  cacheFs.set(app.name, fs);
  return fs;
}

export function initializeFirestore(app, _settings) {
  return instanceFs(app);
}

export function getFirestore(app) {
  return instanceFs(app);
}
