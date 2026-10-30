import "server-only";
import { authAdmin } from "./supabaseAdmin";
import { collaborateurDepuisSlug } from "./referentiel";
import { normalizeEmail, sha256 } from "./tokens";
import { copieSlack, SLACK_CONTACT } from "./slack";

// Association entre un compte DataParl' et sa fiche collaborateur.
// Vérification par e-mail : depuis son compte, la personne génère un code à
// usage unique puis envoie l'e-mail prérempli (mailto) depuis son adresse
// professionnelle parlementaire. Le webhook Resend (email.received) déclenche
// traiterEmailAssociation(). Jamais de validation automatique partielle :
// tout écart va en revue manuelle côté admin (/admin/users/matchprofile).
// Fallback sans adresse parlementaire : dépôt d'une pièce justificative
// (statut piece_jointe), revue admin, purge à la décision ou sous 30 jours.
// Suivi : copie Slack de chaque événement notable (canal dédié via
// SLACK_ASSOCIATIONS, repli sur SLACK_CONTACT ; vide = pas de copie).

export const ADRESSE_ASSOCIER = "associer@dataparl.fr"; // à ajouter chez Resend (inbound)
const EXPIRATION_H = 48;
const ECHECS_MAX = 3;
const GEL_JOURS = 30;

// Domaine attendu selon la chambre de la fiche.
const DOMAINES: Record<string, string[]> = {
  an: ["clb-an.fr"], senat: ["clb.senat.fr"], europarl: ["europarl.europa.eu"],
};

// Fiches de test (slug contenant « test___ », hors référentiel officiel) :
// la vérification se fait depuis une adresse @dataparl.fr, ce qui permet de
// tester le parcours complet sans adresse parlementaire.
export function domainesAttendusFiche(slug: string, chambres: string): string[] {
  if (/test___/.test(slug)) return ["dataparl.fr"];
  return (chambres ?? "").split(" ").filter(Boolean).flatMap((ch) => DOMAINES[ch] ?? []);
}

export type DemandeAssociation = {
  id: string; collab_slug: string; collab_id: string; statut: string;
  echecs: number; gel_jusqu_a: string | null; expire_le: string | null; verifie_le: string | null;
};

function sansAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function localNettoie(email: string): string {
  return sansAccents(normalizeEmail(email).split("@")[0] ?? "").replace(/[^a-z0-9]/g, "");
}
function domaineDe(email: string): string {
  return normalizeEmail(email).split("@")[1] ?? "";
}

// Variantes plausibles de la partie locale : prenom.nom, nom.prenom, tirets,
// points et espaces ignorés, accents retirés.
function variantesLocales(prenom: string, nom: string): Set<string> {
  const p = sansAccents(prenom.toLowerCase()).replace(/[^a-z0-9]/g, "");
  const n = sansAccents(nom.toLowerCase()).replace(/[^a-z0-9]/g, "");
  return new Set([`${p}${n}`, `${n}${p}`].map((x) => x.replace(/[^a-z0-9]/g, "")));
}

// Code court non ambigu (jamais de O/0/I/1/L) : DP-XXXXX, à usage unique.
function codeCourt(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 5; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return "DP-" + s;
}

// Copie Slack des événements d'association : nouvelle demande, contrôle non
// concluant, pièce déposée, gel, validation. Best-effort, jamais bloquant.
const CANAL_ASSOCIATION = process.env.SLACK_ASSOCIATIONS ?? SLACK_CONTACT;
const LIBELLES_SLACK: Record<string, string> = {
  demande_creee: "nouvelle demande d'association",
  valide_auto: "association validée automatiquement",
  a_traiter: "demande à vérifier (contrôles non concluants)",
  piece_deposee: "pièce justificative déposée",
  piece_admin: "pièce justificative jointe par l'admin",
  gele: "demandes gelées (3 échecs)",
  refus_domaine: "refus automatique (domaine inattendu)",
  code_expire: "code expiré",
};

export async function prevenirAssociation(evenement: string, slug: string | null, detail?: string): Promise<void> {
  const libelle = LIBELLES_SLACK[evenement];
  if (!libelle) return;
  const ligne = libelle + (slug ? " — fiche " + slug : "") + (detail ? " (" + detail + ")" : "");
  await copieSlack(CANAL_ASSOCIATION, {
    subject: "Association : " + ligne,
    corpsHtml: "<p>" + ligne + "</p>",
    text: ligne,
  });
}

async function journal(user_id: string, collab_id: string, evenement: string, detail: Record<string, unknown> = {}, slug?: string): Promise<void> {
  await authAdmin().from("associations_journal").insert({ user_id, collab_id, evenement, detail });
  // Copie Slack (silencieuse si aucun canal configuré).
  const d = typeof detail?.from === "string" ? "expéditeur : " + String(detail.from) : undefined;
  await prevenirAssociation(evenement, slug ?? null, d).catch(() => {});
}

// Crée (ou relance) une demande d'association pour une fiche.
export async function creerDemande(
  userId: string, slug: string,
): Promise<{ ok: true; objet: string; code: string; expireLe: string; domaine: string } | { ok: false; error: string }> {
  const c = await collaborateurDepuisSlug(slug).catch(() => null);
  if (!c) return { ok: false, error: "fiche introuvable" };
  const db = authAdmin();
  const { data: existante } = await db.from("associations_fiches")
    .select("*").eq("user_id", userId).eq("collab_slug", slug).maybeSingle();
  if (existante?.statut === "verifie") return { ok: false, error: "fiche déjà associée à ce compte" };
  if (existante?.statut === "gele" && existante.gel_jusqu_a && new Date(existante.gel_jusqu_a).getTime() > Date.now()) {
    return { ok: false, error: "demandes suspendues jusqu'au " + existante.gel_jusqu_a.slice(0, 10) + " — écris-nous via le formulaire de contact" };
  }
  const code = codeCourt();
  const expireLe = new Date(Date.now() + EXPIRATION_H * 3600_000).toISOString();
  const row = {
    user_id: userId, collab_slug: slug, collab_id: String(c.collab_id),
    code_hash: await sha256(code), expire_le: expireLe,
    statut: "attente_email", echecs: existante?.echecs ?? 0, gel_jusqu_a: null, verifie_par: null, verifie_le: null,
  };
  await db.from("associations_fiches").upsert(row, { onConflict: "user_id,collab_slug" });
  await journal(userId, row.collab_id, "demande_creee", {}, slug);
  // Domaine attendu, affiché à la personne (jamais l'adresse dérivée).
  const domaine = domainesAttendusFiche(slug, c.chambres).join(", @");
  return { ok: true, objet: `ASSOC ${slug}`, code, expireLe, domaine };
}

export async function statutDemande(userId: string): Promise<DemandeAssociation | null> {
  const { data } = await authAdmin().from("associations_fiches")
    .select("id, collab_slug, collab_id, statut, echecs, gel_jusqu_a, expire_le, verifie_le")
    .eq("user_id", userId).order("cree_le", { ascending: false }).limit(1).maybeSingle();
  return data ?? null;
}

export async function associationVerifiee(userId: string, collabId: string): Promise<boolean> {
  const { count } = await authAdmin().from("associations_fiches")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId).eq("collab_id", collabId).eq("statut", "verifie");
  return (count ?? 0) > 0;
}

function extraireCode(texte: string | null | undefined): string | null {
  const m = (texte ?? "").toUpperCase().match(/\bDP-[A-HJKMNP-Z2-9]{5}\b/);
  return m ? m[0] : null;
}

// Traite un e-mail reçu (appelé depuis lib/webmail.importerRecu). Renvoie
// true si le message relève de l'association : dans ce cas pas d'accusé
// générique, le compte voit le résultat dans « Mon compte ».
export async function traiterEmailAssociation(m: {
  to: string[]; from: string; subject: string; text?: string | null; headers?: unknown;
}): Promise<boolean> {
  const destinataires = (m.to ?? []).map(normalizeEmail);
  if (!destinataires.some((x) => x === ADRESSE_ASSOCIER)) return false;
  // Objet attendu : « ASSOC <slug> ».
  const match = (m.subject ?? "").trim().match(/^ASSOC\s+([a-z0-9_]+)\s*$/i);
  const code = extraireCode(m.text);
  if (!match || !code || !m.text) return true; // concerne l'association, ignoré silencieusement
  const slug = match[1].toLowerCase();

  const db = authAdmin();
  const { data: demande } = await db.from("associations_fiches")
    .select("*").eq("collab_slug", slug).eq("statut", "attente_email")
    .eq("code_hash", await sha256(code)).maybeSingle();
  if (!demande) { // code ou slug inconnu : echec anonyme, pas de compte identifiable
    return true;
  }
  const expiree = new Date(demande.expire_le).getTime() < Date.now();
  const fiche = await collaborateurDepuisSlug(slug).catch(() => null);
  const attendus = new Set(domainesAttendusFiche(slug, fiche?.chambres ?? ""));
  const domaineOk = attendus.has(domaineDe(m.from));
  const nomOk = fiche ? variantesLocales(fiche.prenom, fiche.nom).has(localNettoie(m.from)) : false;
  // SPF/DKIM : en-tête Authentication-Results du domaine émetteur.
  const ar = (() => {
    try { return (m.headers as Record<string, unknown>) ?? {}; } catch { return {}; }
  })();
  const texteAR = Object.entries(ar).filter(([k]) => k.toLowerCase() === "authentication-results")
    .map(([, v]) => String(v)).join(" ");
  const spfDkimOk = /spf=pass/i.test(texteAR) && /dkim=pass/i.test(texteAR);

  if (!domaineOk) {
    // Domaine inattendu : refus automatique, avec compteur d'échecs.
    const echecs = (demande.echecs ?? 0) + 1;
    const gele = echecs >= ECHECS_MAX;
    await db.from("associations_fiches").update({
      echecs, statut: gele ? "gele" : "attente_email",
      gel_jusqu_a: gele ? new Date(Date.now() + GEL_JOURS * 86400_000).toISOString() : null, maj_le: new Date().toISOString(),
    }).eq("id", demande.id);
    await journal(demande.user_id, demande.collab_id, gele ? "gele" : "refus_domaine", { from: m.from }, slug);
    return true;
  }
  if (expiree) {
    await journal(demande.user_id, demande.collab_id, "code_expire", { from: m.from }, slug);
    return true;
  }
  if (nomOk && spfDkimOk) {
    await db.from("associations_fiches").update({
      statut: "verifie", verifie_par: "email_auto", verifie_le: new Date().toISOString(), maj_le: new Date().toISOString(),
      // Preuve d'association : l'adresse parlementaire ayant servi à la
      // vérification, conservée avec la ligne (RGPD : légitime intérêt,
      // preuve d'identité ; purge si la fiche est dissociée).
      email_preuve: normalizeEmail(m.from),
    }).eq("id", demande.id);
    await journal(demande.user_id, demande.collab_id, "valide_auto", { from: m.from }, slug);
    return true;
  }
  // Domaine bon mais nom ou SPF/DKIM non concluant : revue manuelle, jamais
  // de décision automatique partielle. L'adresse est conservée pour la
  // revue admin, la décision reste manuelle.
  await db.from("associations_fiches").update({ statut: "a_traiter", maj_le: new Date().toISOString(), email_preuve: normalizeEmail(m.from) }).eq("id", demande.id);
  await journal(demande.user_id, demande.collab_id, "a_traiter", { from: m.from, nomOk, spfDkimOk }, slug);
  return true;
}

// Décisions manuelles (admin) : valider, refuser, dissocier.
export async function deciderManuellement(
  admin: { userId: string }, demandeId: string, action: "valider" | "refuser" | "dissocier",
): Promise<{ ok: boolean; error?: string }> {
  const db = authAdmin();
  const { data: demande } = await db.from("associations_fiches").select("*").eq("id", demandeId).maybeSingle();
  if (!demande) return { ok: false, error: "demande introuvable" };
  const maj =
    action === "valider" ? { statut: "verifie", verifie_par: "manuel", verifie_le: new Date().toISOString() } :
    action === "refuser" ? { statut: "refuse" } :
    { statut: "refuse", verifie_par: null, verifie_le: null, email_preuve: null };
  await db.from("associations_fiches").update({ ...maj, maj_le: new Date().toISOString() }).eq("id", demande.id);
  await journal(demande.user_id, demande.collab_id, `manuel_${action}`, { par: admin.userId });
  return { ok: true };
}

export async function demandesATraiter(): Promise<DemandeAssociation[]> {
  const { data } = await authAdmin().from("associations_fiches")
    .select("id, collab_slug, collab_id, statut, echecs, gel_jusqu_a, expire_le, verifie_le")
    .in("statut", ["a_traiter", "gele", "piece_jointe"]).order("cree_le", { ascending: false }).limit(100);
  return data ?? [];
}
