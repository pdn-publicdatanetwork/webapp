import "server-only";
import { authAdmin } from "./supabaseAdmin";
import { dataQuery } from "./data";
import type { Collaborateur } from "./referentiel";
import { deciderManuellement } from "./association";
import { purgerPiecesDemande } from "./associationPieces";

// Console Slack « Associations » : file des demandes de rattachement d'une
// fiche collaborateur à un compte, à vérifier manuellement (contrôles non
// concluants, pièces justificatives, gels), liste des comptes dont la fiche
// est associée (avec profil CV éventuel), et journal des événements.
// Les décisions valider/refuser/dissocier sont exactement celles de l'admin
// (/admin/users/matchprofile, lib/association.ts deciderManuellement) :
// mêmes e-mails à la personne, même journal associations_journal, plus
// une trace admin_audit au nom « slack:<pseudo> ». Jamais de décision
// automatique depuis Slack : c'est un humain qui clique.
// Blocs header limités à 24 caractères (rejet Slack sinon).

type Bloc = Record<string, unknown>;

const EN_COURS = ["attente_email", "a_traiter", "piece_jointe", "gele"];
const DECIDABLES = ["a_traiter", "piece_jointe", "gele"];

const LIBELLE_STATUT: Record<string, string> = {
  attente_email: "en attente de l'e-mail de vérification",
  a_traiter: "à vérifier : contrôles non concluants",
  piece_jointe: "pièce justificative déposée, à examiner",
  gele: "gelée après 3 échecs",
};

const LIBELLE_EVENEMENT: Record<string, string> = {
  demande_creee: "demande créée",
  valide_auto: "validée automatiquement",
  a_traiter: "mise en revue manuelle",
  piece_deposee: "pièce justificative déposée",
  piece_admin: "pièce jointe par l'admin",
  gele: "gelée (3 échecs)",
  refus_domaine: "refus automatique (domaine inattendu)",
  code_expire: "code expiré",
  manuel_valider: "validée manuellement",
  manuel_refuser: "refusée manuellement",
  manuel_dissocier: "dissociée manuellement",
};

const LIBELLE_VERIFIE_PAR: Record<string, string> = {
  email_auto: "vérifiée automatiquement (e-mail professionnel)",
  manuel: "vérifiée manuellement par l'équipe",
};

function dh(iso: string | null | undefined): string {
  if (!iso) return "–";
  return new Date(iso).toLocaleString("fr-FR", {
    timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

function dj(iso: string | null | undefined): string {
  if (!iso) return "–";
  return new Date(iso).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric" });
}

// Nom affiché de la fiche (repli depuis le slug si le référentiel ne répond pas).
function nomDepuisSlug(slug: string): string {
  const base = slug.replace(/_[0-9a-f]{8}$/, "");
  const m = base.match(/^([a-z0-9]+)_([a-z0-9]+)$/i);
  if (!m) return slug;
  return m[2].charAt(0).toUpperCase() + m[2].slice(1) + " " + m[1].charAt(0).toUpperCase() + m[1].slice(1);
}

type Demande = {
  id: string; user_id: string; collab_slug: string; collab_id: string; statut: string;
  echecs: number; gel_jusqu_a: string | null; expire_le: string | null; cree_le: string; email_preuve: string | null;
};

// Nombre de demandes en cours (compteur du Home tab).
export async function compteAssoc(): Promise<number> {
  try {
    const { count } = await authAdmin().from("associations_fiches")
      .select("id", { count: "exact", head: true }).in("statut", EN_COURS);
    return count ?? 0;
  } catch { return 0; }
}

// Lectures tolérantes : une erreur ou une table absente ne casse pas la
// vue, on renvoie une carte vide.
async function fichesParId(ids: string[]): Promise<Map<string, { prenom: string | null; nom: string | null }>> {
  const carte = new Map<string, { prenom: string | null; nom: string | null }>();
  if (!ids.length) return carte;
  try {
    const params = new URLSearchParams({ select: "collab_id,prenom,nom", collab_id: "in.(" + ids.join(",") + ")" });
    const { rows } = await dataQuery<Collaborateur>("collaborateurs", params, 0);
    (rows ?? []).forEach((r) => carte.set(String(r.collab_id), { prenom: r.prenom ?? null, nom: r.nom ?? null }));
  } catch { /* repli : nom depuis le slug */ }
  return carte;
}

async function emailsComptes(userIds: string[]): Promise<Map<string, string>> {
  const carte = new Map<string, string>();
  if (!userIds.length) return carte;
  try {
    const { data } = await authAdmin().from("comptes_utilisateurs").select("user_id, email").in("user_id", userIds);
    ((data ?? []) as { user_id: string; email: string }[]).forEach((c) => carte.set(c.user_id, c.email));
  } catch { /* repli : identifiant tronqué */ }
  return carte;
}

async function slugsParId(collabIds: string[]): Promise<Map<string, string>> {
  const carte = new Map<string, string>();
  if (!collabIds.length) return carte;
  try {
    const { data } = await authAdmin().from("associations_fiches").select("collab_id, collab_slug").in("collab_id", collabIds).limit(100);
    ((data ?? []) as { collab_id: string; collab_slug: string }[]).forEach((d) => carte.set(d.collab_id, d.collab_slug));
  } catch { /* repli : identifiant brut */ }
  return carte;
}

async function cvParId(collabIds: string[]): Promise<Map<string, number>> {
  const carte = new Map<string, number>();
  if (!collabIds.length) return carte;
  try {
    const { data } = await authAdmin().from("collab_declarations").select("collab_id, supprime_le").in("collab_id", collabIds).limit(500);
    ((data ?? []) as { collab_id: string; supprime_le: string | null }[]).filter((d) => !d.supprime_le)
      .forEach((d) => carte.set(d.collab_id, (carte.get(d.collab_id) ?? 0) + 1));
  } catch { /* pas de déclaration lisible : affiché sans CV */ }
  return carte;
}

// File des demandes en cours, avec boutons de décision par demande.
export async function blocsAssoc(): Promise<Bloc[]> {
  const db = authAdmin();
  const { data, error } = await db.from("associations_fiches")
    .select("id, user_id, collab_slug, collab_id, statut, echecs, gel_jusqu_a, expire_le, cree_le, email_preuve")
    .in("statut", EN_COURS).order("cree_le", { ascending: false }).limit(25);
  if (error) throw new Error("associations_fiches : " + error.message);
  const demandes = (data ?? []) as Demande[];
  if (!demandes.length) {
    return [
      { type: "header", text: { type: "plain_text", text: "Associations", emoji: true } },
      { type: "section", text: { type: "mrkdwn", text: "Aucune demande en cours." } },
      { type: "context", elements: [{ type: "mrkdwn", text: "Une demande arrive ici dès qu'un contrôle automatique n'est pas concluant, ou quand une pièce justificative est déposée. Historique complet : bouton Journal." }] },
    ];
  }
  const ids = [...new Set(demandes.map((d) => d.collab_id))];
  const userIds = [...new Set(demandes.map((d) => d.user_id))];
  const [emailDe, fiches] = await Promise.all([
    emailsComptes(userIds),
    fichesParId(ids),
  ]);
  const blocs: Bloc[] = [
    { type: "header", text: { type: "plain_text", text: "Associations", emoji: true } },
    { type: "section", text: { type: "mrkdwn", text: "*" + demandes.length + " demande(s) en cours*" } },
  ];
  demandes.forEach((d) => {
    const f = fiches.get(d.collab_id);
    const nom = f && (f.prenom || f.nom) ? [f.prenom, f.nom].filter(Boolean).join(" ") : nomDepuisSlug(d.collab_slug);
    const preuve = d.email_preuve ? ", preuve : \`" + d.email_preuve + "\`" : "";
    const gel = d.gel_jusqu_a ? ", gel jusqu'au " + d.gel_jusqu_a.slice(0, 10) : "";
    blocs.push({
      type: "section",
      text: { type: "mrkdwn", text: "*" + nom + "* : " + (LIBELLE_STATUT[d.statut] ?? d.statut) + "\nCompte : " + (emailDe.get(d.user_id) ?? d.user_id.slice(0, 8)) + ", demande du " + dh(d.cree_le) + ", " + d.echecs + " échec(s)" + preuve + gel },
    });
    if (DECIDABLES.includes(d.statut)) {
      blocs.push({ type: "actions", elements: [
        { type: "button", text: { type: "plain_text", text: "✅ Valider" }, style: "primary", action_id: "assoc_valider", value: d.id },
        { type: "button", text: { type: "plain_text", text: "❌ Refuser" }, style: "danger", action_id: "assoc_refuser", value: d.id },
      ] });
    }
  });
  blocs.push({ type: "context", elements: [{ type: "mrkdwn", text: "Valider rattache la fiche au compte et prévient la personne par e-mail. Refuser informe la personne de la marche à suivre. Les pièces justificatives sont purgées après la décision." }] });
  return blocs;
}

// Liste des comptes dont la fiche est associée (statut verifie), avec le
// profil CV éventuellement publié par la personne (collab_declarations
// non supprimées) et un bouton de dissociation.
export async function blocsCvAssoc(): Promise<Bloc[]> {
  const db = authAdmin();
  const { data, error } = await db.from("associations_fiches")
    .select("id, user_id, collab_slug, collab_id, verifie_le, verifie_par")
    .eq("statut", "verifie").order("verifie_le", { ascending: false }).limit(25);
  if (error) throw new Error("associations_fiches : " + error.message);
  const verifiees = (data ?? []) as { id: string; user_id: string; collab_slug: string; collab_id: string; verifie_le: string | null; verifie_par: string | null }[];
  if (!verifiees.length) {
    return [
      { type: "header", text: { type: "plain_text", text: "CV associés", emoji: true } },
      { type: "section", text: { type: "mrkdwn", text: "Aucune fiche n'est encore associée à un compte." } },
      { type: "context", elements: [{ type: "mrkdwn", text: "Les associations validées apparaissent ici, avec le profil CV que la personne a éventuellement publié depuis « Ma fiche »." }] },
    ];
  }
  const ids = [...new Set(verifiees.map((v) => v.collab_id))];
  const userIds = [...new Set(verifiees.map((v) => v.user_id))];
  const [emailDe, fiches, cvDe] = await Promise.all([
    emailsComptes(userIds),
    fichesParId(ids),
    cvParId(ids),
  ]);
  const blocs: Bloc[] = [
    { type: "header", text: { type: "plain_text", text: "CV associés", emoji: true } },
    { type: "section", text: { type: "mrkdwn", text: "*" + verifiees.length + " compte(s) avec fiche associée*" } },
  ];
  verifiees.forEach((v) => {
    const f = fiches.get(v.collab_id);
    const nom = f && (f.prenom || f.nom) ? [f.prenom, f.nom].filter(Boolean).join(" ") : nomDepuisSlug(v.collab_slug);
    const cv = cvDe.get(v.collab_id) ?? 0;
    const mode = v.verifie_par ? (LIBELLE_VERIFIE_PAR[v.verifie_par] ?? v.verifie_par) : "";
    blocs.push({
      type: "section",
      text: { type: "mrkdwn", text: "*" + nom + "* (fiche \`" + v.collab_slug + "\`)\nCompte : " + (emailDe.get(v.user_id) ?? v.user_id.slice(0, 8)) + ", associée le " + dj(v.verifie_le) + (mode ? ", " + mode : "") + "\n" + (cv ? "📄 Profil CV : " + cv + " élément(s) publié(s)" : "_Pas encore de profil CV publié_") },
    });
    blocs.push({ type: "actions", elements: [
      { type: "button", text: { type: "plain_text", text: "❌ Dissocier" }, style: "danger", action_id: "assoc_dissocier", value: v.id },
    ] });
  });
  blocs.push({ type: "context", elements: [{ type: "mrkdwn", text: "La dissociation retire immédiatement le profil CV et la photo du site, prévient la personne par e-mail et conserve le contenu en sauvegarde interne (restaurable sur demande)." }] });
  return blocs;
}

// 20 derniers événements du journal des associations, avec le nom du
// collaborateur, la fiche et l'e-mail du compte (et l'adresse de preuve
// quand l'événement en porte une).
export async function blocsJournalAssoc(): Promise<Bloc[]> {
  const db = authAdmin();
  const { data, error } = await db.from("associations_journal")
    .select("user_id, collab_id, evenement, detail, le").order("le", { ascending: false }).limit(20);
  if (error) throw new Error("associations_journal : " + error.message);
  const lignes = (data ?? []) as { user_id: string; collab_id: string; evenement: string; detail: Record<string, unknown> | null; le: string }[];
  const userIds = [...new Set(lignes.map((l) => l.user_id))];
  const collabIds = [...new Set(lignes.map((l) => l.collab_id))];
  const [emailDe, fiches, slugDe] = await Promise.all([
    emailsComptes(userIds),
    fichesParId(collabIds),
    slugsParId(collabIds),
  ]);
  const texte = lignes.map((l) => {
    const f = fiches.get(l.collab_id);
    const nom = f && (f.prenom || f.nom) ? [f.prenom, f.nom].filter(Boolean).join(" ") : nomDepuisSlug(slugDe.get(l.collab_id) ?? l.collab_id);
    const slug = slugDe.get(l.collab_id);
    const detail = (l.detail ?? {}) as Record<string, unknown>;
    const from = typeof detail.from === "string" ? ", depuis \`" + detail.from + "\`" : typeof detail.par === "string" ? ", par " + detail.par : "";
    return "• " + dh(l.le) + " : " + (LIBELLE_EVENEMENT[l.evenement] ?? l.evenement) + " : *" + nom + "*" + (slug ? " (fiche \`" + slug + "\`)" : "") + ", compte " + (emailDe.get(l.user_id) ?? l.user_id.slice(0, 8)) + from;
  }).join("\n") || "Aucun événement.";
  return [
    { type: "header", text: { type: "plain_text", text: "Journal", emoji: true } },
    { type: "section", text: { type: "mrkdwn", text: texte } },
    { type: "context", elements: [{ type: "mrkdwn", text: "20 derniers événements, toutes décisions confondues (automatiques et manuelles)." }] },
  ];
}

// Décision manuelle depuis Slack : mêmes effets que l'admin (e-mail à la
// personne, journal, retrait du profil CV pour une dissociation), auditée
// au nom slack:<pseudo>.
export async function deciderDepuisSlack(
  qui: string, id: string, action: "valider" | "refuser" | "dissocier",
): Promise<{ ok: true } | { ok: false; erreur: string }> {
  if (!id) return { ok: false, erreur: "demande inconnue" };
  const r = await deciderManuellement({ userId: "slack:" + qui }, id, action);
  if (!r.ok) return { ok: false, erreur: r.error ?? "erreur" };
  if (action !== "dissocier") await purgerPiecesDemande(id).catch(() => {});
  try {
    await authAdmin().from("admin_audit").insert({ github_login: "slack:" + qui, action: "association." + action, cible: id });
  } catch { /* audit best-effort, la décision est déjà journalisée */ }
  return { ok: true };
}
