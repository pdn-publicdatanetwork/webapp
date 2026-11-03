import "server-only";
import { randomUUID } from "crypto";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, initializeFirestore, type Firestore } from "firebase-admin/firestore";

// Base Firestore des offres d'emploi (projet Firebase « dataparl-jobs »).
// L'identifiant du document est l'empreinte sha256 (fingerprint) : la collecte
// GitLab écrit au même endroit, donc deux fois la même annonce ne crée jamais
// de doublon. Le champ « id » conserve l'uuid historique des URLs publiées.
// Les requêtes restent mono-champ (pas d'index composite : le compte de
// service ne peut pas en créer), le filtrage et le tri se font en mémoire.

export type Offre = Record<string, unknown>;

let base: Firestore | null = null;

function db(): Firestore {
  if (base) return base;
  const json = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!json) throw new Error("Variable d'environnement manquante : FIREBASE_SERVICE_ACCOUNT");
  const app =
    getApps().find((a) => a.name === "jobs") ??
    initializeApp({ credential: cert(JSON.parse(json)), projectId: "dataparl-jobs" }, "jobs");
  // REST plutôt que gRPC : compatible avec un déploiement Cloudflare Workers.
  try {
    base = initializeFirestore(app, { preferREST: true });
  } catch {
    base = getFirestore(app);
  }
  return base;
}

const aujourdHui = () => new Date().toISOString().slice(0, 10);

function enOffre(snap: FirebaseFirestore.DocumentSnapshot): Offre {
  const d = (snap.data() ?? {}) as Offre;
  return { ...d, id: (d.id as string) ?? snap.id, fingerprint: snap.id };
}

const parDateDesc = (champ: string) => (a: Offre, b: Offre) =>
  String(b[champ] ?? "").localeCompare(String(a[champ] ?? ""));
const parDateAsc = (champ: string) => (a: Offre, b: Offre) =>
  String(a[champ] ?? "").localeCompare(String(b[champ] ?? ""));

// Offres publiées (validées, actives, non expirées), plus récentes d'abord.
export async function offresPubliques(): Promise<Offre[]> {
  const snaps = await db().collection("job_offers").where("review_status", "==", "approved").limit(500).get();
  return snaps.docs
    .map(enOffre)
    .filter((o) => o.statut === "active" && (!o.expire_le || o.expire_le >= aujourdHui()))
    .sort(parDateDesc("publie_le"))
    .slice(0, 200);
}

// Anciennes offres : validées mais pourvues ou expirées.
export async function anciennesOffres(): Promise<Offre[]> {
  const snaps = await db().collection("job_offers").where("review_status", "==", "approved").limit(500).get();
  return snaps.docs
    .map(enOffre)
    .filter((o) => o.statut === "expiree" || o.statut === "pourvue")
    .sort(parDateDesc("publie_le"))
    .slice(0, 200);
}

// Recherche par uuid historique (champ « id ») ou par empreinte (id du doc).
async function offreParId(id: string): Promise<Offre | null> {
  const col = db().collection("job_offers");
  if (/^[0-9a-f]{64}$/i.test(id)) {
    const snap = await col.doc(id).get();
    return snap.exists ? enOffre(snap) : null;
  }
  const snaps = await col.where("id", "==", id).limit(1).get();
  return snaps.empty ? null : enOffre(snaps.docs[0]);
}

// Offre visible publiquement (détail d'une fiche).
export async function offreVisible(id: string): Promise<Offre | null> {
  const o = await offreParId(id);
  if (!o || o.review_status !== "approved" || o.statut !== "active") return null;
  if (o.expire_le && o.expire_le < aujourdHui()) return null;
  return o;
}

// Vues admin : file de revue, offres publiées, archives.
export async function fileRevue(): Promise<Offre[]> {
  const snaps = await db().collection("job_offers").where("review_status", "==", "pending").limit(500).get();
  return snaps.docs.map(enOffre).sort(parDateAsc("created_at")).slice(0, 200);
}

export async function offresActivesAdmin(): Promise<Offre[]> {
  const snaps = await db().collection("job_offers").where("review_status", "==", "approved").limit(500).get();
  return snaps.docs
    .map(enOffre)
    .filter((o) => o.statut === "active")
    .sort(parDateDesc("publie_le"))
    .slice(0, 200);
}

export async function offresArchiveesAdmin(): Promise<Offre[]> {
  const snaps = await db().collection("job_offers").where("statut", "in", ["expiree", "pourvue", "rejetee"]).limit(500).get();
  return snaps.docs.map(enOffre).sort(parDateDesc("updated_at")).slice(0, 100);
}

// Dépôt d'une offre (proposition publique ou saisie admin) : create() échoue si
// le document existe déjà, ce qui fait office de contrainte d'unicité.
export async function deposerOffre(champs: Offre, empreinte: string): Promise<"ok" | "doublon"> {
  const doc = {
    ...champs,
    id: randomUUID(),
    fingerprint: empreinte,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  try {
    await db().collection("job_offers").doc(empreinte).create(doc);
    return "ok";
  } catch (e: unknown) {
    const err = e as { code?: number; message?: string };
    if (err?.code === 6 || /already exists/i.test(String(err?.message ?? ""))) return "doublon";
    throw e;
  }
}

// Mise à jour (validation, correction, archivage) et suppression.
export async function majOffre(id: string, champs: Offre): Promise<boolean> {
  const o = await offreParId(id);
  if (!o) return false;
  await db()
    .collection("job_offers")
    .doc(o.fingerprint as string)
    .update({ ...champs, updated_at: new Date().toISOString() });
  return true;
}

export async function supprimerOffre(id: string): Promise<string | null> {
  const o = await offreParId(id);
  if (!o) return null;
  await db().collection("job_offers").doc(o.fingerprint as string).delete();
  return (o.titre as string) ?? null;
}

// Alertes e-mail : la collecte GitLab lit les abonnés actifs de la collection
// alert_subscriptions (un document par adresse, champ « actif »).
export async function inscritAlerte(email: string): Promise<void> {
  await db()
    .collection("alert_subscriptions")
    .doc(email)
    .set({ email, actif: true, created_at: new Date().toISOString() }, { merge: true });
}

export async function desinscritAlerte(email: string): Promise<void> {
  await db()
    .collection("alert_subscriptions")
    .doc(email)
    .set({ actif: false, updated_at: new Date().toISOString() }, { merge: true });
}
