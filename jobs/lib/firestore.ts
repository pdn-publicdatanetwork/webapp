
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
    base = initializeFirestore(app, { preferRest: true });
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
// « publie_le » porte la date de publication ORIGINALE de l'annonce (extraite
// de la source par la collecte), jamais le jour où on l'a scrapée.
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

// Dépôt CV Matching : on ne conserve PAS le texte du CV, seulement les
// informations de contact extraites et les compétences détectées.
export async function deposerCvInfos(champs: Record<string, unknown>): Promise<void> {
  await db()
    .collection("cv_deposits")
    .add({ ...champs, created_at: new Date().toISOString() });
}

// Back-office /admin : décision de relecture sur une offre (l'empreinte sha256
// est l'identifiant du document). Valider publie l'offre, archiver la passe en
// expirée, rejeter la retire sans publication.
export async function deciderOffre(
  empreinte: string,
  decision: "valider" | "archiver" | "rejeter",
  auteur: string
): Promise<boolean> {
  if (!/^[0-9a-f]{64}$/i.test(empreinte)) return false;
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const note = "Décision " + decision + " via back-office par " + auteur + " le " + aujourdhui;
  const champs: Record<string, unknown> = { updated_at: new Date().toISOString(), note_relecture: note };
  if (decision === "valider") {
    champs.review_status = "approved";
    champs.statut = "active";
    // Date de publication ORIGINALE de l'annonce : on ne l'écrase JAMAIS par
    // la date du jour si elle est connue (collecte/balayeur). La date du jour
    // n'est qu'un repli quand aucune date d'origine n'a pu être extraite.
    const snap = await db().collection("job_offers").doc(empreinte).get();
    const existant = (snap.data() ?? {}) as Offre;
    champs.publie_le = (existant.publie_le as string) || (existant.date_publication as string) || aujourdhui;
  } else if (decision === "archiver") {
    champs.review_status = "approved";
    champs.statut = "expiree";
  } else {
    champs.review_status = "rejected";
    champs.statut = "rejetee";
  }
  await db().collection("job_offers").doc(empreinte).set(champs, { merge: true });
  return true;
}

// Statistiques d'audience (mesure minimale, sans IP ni profilage) :
// chaque page vue et chaque clic marqué data-stat est noté dans
// jobs_evenements. Aucune donnée personnelle n'est stockée.
export async function noterEvenement(type: string, chemin: string, page = "", compte = "") {
  const jour = new Date().toISOString().slice(0, 10);
  await db().collection("jobs_evenements").add({
    type,
    chemin: chemin.slice(0, 200),
    page: page.slice(0, 200),
    compte: compte.slice(0, 200),
    jour,
    created_at: new Date().toISOString(),
  });
}

// Candidatures envoyées via DataParl' sur une fiche : clics « Envoyer ma
// candidature » enregistrés sur la page /offre/<slug> (30 derniers jours).
// Requête mono-champ (jour) + filtrage en mémoire : pas d'index composite.
export async function compterCandidatures(slug: string): Promise<number> {
  const debut = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const snap = await db().collection("jobs_evenements").where("jour", ">=", debut).limit(5000).get();
  const attendu = "/offre/" + slug;
  return snap.docs.filter((d) => {
    const v = d.data() as Record<string, unknown>;
    return (
      String(v.type ?? "") === "clic" &&
      String(v.chemin ?? "") === "clic_envoi_candidature" &&
      String(v.page ?? "") === attendu
    );
  }).length;
}

export async function lireEvenements(jours = 30): Promise<{ type: string; chemin: string; jour: string; page: string; compte: string }[]> {
  const debut = new Date(Date.now() - jours * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const snap = await db().collection("jobs_evenements").where("jour", ">=", debut).limit(5000).get();
  return snap.docs.map((d) => {
    const v = d.data() as Record<string, unknown>;
    return { type: String(v.type ?? ""), chemin: String(v.chemin ?? ""), jour: String(v.jour ?? ""), page: String(v.page ?? ""), compte: String(v.compte ?? "") };
  });
}

// Suppression des données d'un compte (demande depuis Mon compte) :
// abonnement aux alertes (un document par e-mail) et dépôts CV Matching
// (champ « compte », requête mono-champ + filtrage en mémoire). Nettoyage
// best effort : la suppression du compte auth reste la source de vérité.
export async function supprimerDonneesCompte(email: string): Promise<void> {
  const adresse = email.trim().toLowerCase();
  await db().collection("alert_subscriptions").doc(adresse).delete();
  const snaps = await db().collection("cv_deposits").where("compte", "==", adresse).limit(500).get();
  for (const doc of snaps.docs) {
    await doc.ref.delete();
  }
}
