import "server-only";
import { authAdmin } from "./supabaseAdmin";
import { dataQuery } from "./data";
import type { Collaborateur } from "./referentiel";
import { normalizeEmail, sha256 } from "./tokens";
import { copieSlack, SLACK_CONTACT } from "./slack";
import { expedier, bouton, esc } from "./mail";
import { SITE_URL } from "./env";

// Association entre un compte DataParl' et sa fiche collaborateur.
// Vérification par e-mail : depuis son compte, la personne génère un code à
// usage unique puis envoie l'e-mail prérempli (mailto) depuis son adresse
// professionnelle parlementaire. Le webhook Resend (email.received) déclenche
// traiterEmailAssociation(). Jamais de validation automatique partielle :
// tout écart va en revue manuelle côté admin (/admin/users/matchprofile).
// Fallback sans adresse parlementaire : dépôt d'une pièce justificative
// (statut piece_jointe), revue admin, purge à la décision ou sous 30 jours.
// Suivi : copie Slack de chaque événement notable (SLACK_WEBHOOK_URL ou
// SLACK_ASSOCIATIONS, repli sur SLACK_CONTACT ; vide = pas de copie) et
// e-mail transactionnel directement à la personne à chaque aboutissement.

export const ADRESSE_ASSOCIER = "associer@dataparl.fr"; // boîte écoutée par le webhook Resend (inbound)
const FROM_ASSOCIATION = "comptes@dataparl.fr"; // expéditeur des e-mails d'association (domaine vérifié Resend)
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

// Nom affiché de la fiche : « Prenom Nom » plutôt que le slug technique
// (jamais montré tel quel à la personne). Repli à partir du slug
// « nom_prenomtest___00006779 » si la fiche n'est pas disponible.
function libelleFiche(prenom: string | null | undefined, nom: string | null | undefined, slug: string): string {
  const p = (prenom ?? "").trim();
  const n = (nom ?? "").trim();
  if (p || n) return [p, n].filter(Boolean).join(" ");
  const base = slug.replace(/_[0-9a-f]{8}$/, "");
  const m = base.match(/^([a-z0-9]+)_([a-z0-9]+)$/i);
  if (!m) return slug;
  const maj = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return maj(m[2]) + " " + maj(m[1]);
}

// Fiche fraîche (jamais mise en cache) : le contrôle d'identité de
// l'association ne doit pas dépendre d'une lecture potentiellement
// périmée (fiche renommée ou créée récemment).
async function ficheFraiche(slug: string): Promise<Collaborateur | null> {
  const m = slug.match(/([0-9a-f]{8})$/);
  if (!m) return null;
  const { rows } = await dataQuery<Collaborateur>("collaborateurs", new URLSearchParams({ select: "*", collab_id: `eq.${m[1]}`, limit: "1" }), 0);
  return rows[0] ?? null;
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
const EMOJIS_SLACK: Record<string, string> = {
  demande_creee: ":email:",
  valide_auto: ":white_check_mark:",
  a_traiter: ":mag:",
  piece_deposee: ":paperclip:",
  piece_admin: ":paperclip:",
  gele: ":snowflake:",
  refus_domaine: ":no_entry:",
  code_expire: ":hourglass:",
};

export async function prevenirAssociation(evenement: string, fiche: string | null, detail?: string): Promise<void> {
  const libelle = LIBELLES_SLACK[evenement];
  if (!libelle) return;
  const sujet = (EMOJIS_SLACK[evenement] ?? "•") + " Association · " + libelle;
  const texte = (fiche ? "Fiche : " + fiche + "\n" : "") + (detail ?? "");
  await copieSlack(CANAL_ASSOCIATION, {
    subject: sujet,
    corpsHtml: "<p><strong>" + libelle + "</strong>" + (fiche ? " — fiche " + esc(fiche) : "") + (detail ? " (" + esc(detail) + ")" : "") + "</p>",
    text: texte,
  });
}

// Adresse e-mail du compte (auth.admin : lecture service, jamais exposée).
async function adresseDe(user_id: string): Promise<string | null> {
  const { data } = await authAdmin().auth.admin.getUserById(user_id);
  return data?.user?.email ?? null;
}

// E-mails transactionnels directement à la personne : le résultat de sa
// demande et, si besoin, la marche à suivre. Best-effort, jamais bloquant.
// Expéditeur comptes@dataparl.fr, signés « L'équipe DataParl' » ; la fiche
// est désignée par son nom affiché, jamais par le slug technique.
const SIGNATURE_HTML = '<p style="margin:24px 0 0;color:#475569">L\'équipe DataParl\'</p>';
const PIED_AUTO = "Cet e-mail a été envoyé automatiquement : merci de ne pas y répondre. Une question ? <a href=\"" + SITE_URL + "/contact\" style=\"color:#164DFF\">Écris-nous via le formulaire de contact</a>.";
const PIED_AUTO_TXT = "Cet e-mail a été envoyé automatiquement : merci de ne pas y répondre.";

// Badge de statut (pilule jaune pâle) sous le titre de l'e-mail.
function badgeStatut(libelle: string): string {
  return '<p style="margin:0 0 16px"><span style="display:inline-block;background:#FEF9C3;color:#0F172A;font-size:13px;font-weight:600;border-radius:999px;padding:5px 12px">' + esc(libelle) + "</span></p>";
}

// Bloc « Fiche demandée » : surtitre discret, nom en grand.
function blocFiche(fiche: string, surtitre: string): string {
  return '<div style="background:#FEF9C3;border-left:4px solid #FFD23F;border-radius:8px;padding:14px 16px;margin:0 0 18px"><p style="margin:0 0 2px;font-size:13px;color:#475569">' + esc(surtitre) + '</p><p style="margin:0;font-size:19px;font-weight:700;color:#0F172A">' + esc(fiche) + "</p></div>";
}

async function accuseValidation(user_id: string, fiche: string): Promise<void> {
  const email = await adresseDe(user_id);
  if (!email) return;
  await expedier({
    to: [email],
    from: FROM_ASSOCIATION,
    nomExpediteur: "L'équipe DataParl'",
    subject: "Votre fiche DataParl' est associée à votre compte",
    titre: "Fiche associée",
    corpsHtml:
      badgeStatut("Fiche associée à votre compte") +
      blocFiche(fiche, "Votre fiche") +
      "<p>Votre demande d'association a été validée : cette fiche est désormais rattachée à votre compte.</p>" +
      bouton(SITE_URL + "/mon-compte/ma-fiche", "Compléter mon profil CV") +
      "<p>Vous pouvez y importer votre CV (l'IA propose une mise en forme que vous validez point par point), ajouter une photo et présenter votre parcours comme vous l'entendez.</p>" +
      SIGNATURE_HTML,
    text: "Bonne nouvelle : votre demande d'association a été validée. La fiche " + fiche + " est désormais rattachée à votre compte. Complétez votre profil CV : " + SITE_URL + "/mon-compte/ma-fiche\n\nL'équipe DataParl'\n\n" + PIED_AUTO_TXT,
    pied: PIED_AUTO,
    type: "transactionnel",
  }).catch((e) => console.error("accuse validation", String(e).slice(0, 200)));
}

async function accuseReception(user_id: string, fiche: string): Promise<void> {
  const email = await adresseDe(user_id);
  if (!email) return;
  await expedier({
    to: [email],
    from: FROM_ASSOCIATION,
    nomExpediteur: "L'équipe DataParl'",
    subject: "Votre demande d'association est en vérification",
    titre: "Vérification en cours",
    corpsHtml:
      badgeStatut("En cours · réponse sous 48 h") +
      blocFiche(fiche, "Fiche demandée") +
      "<p>Nous avons bien reçu votre demande. La vérification prend un peu plus de temps : notre équipe l'examine et vous répond sous 48 heures.</p>" +
      "<p>Vous pouvez suivre l'avancement à tout moment depuis « Mon compte ».</p>" +
      SIGNATURE_HTML,
    text: "Nous avons bien reçu votre demande pour la fiche " + fiche + ". La vérification prend un peu plus de temps : notre équipe l'examine et vous répond sous 48 heures.\n\nL'équipe DataParl'\n\n" + PIED_AUTO_TXT,
    pied: PIED_AUTO,
    type: "transactionnel",
  }).catch((e) => console.error("accuse reception", String(e).slice(0, 200)));
}

async function accuseRefus(user_id: string, fiche: string, gele: boolean): Promise<void> {
  const email = await adresseDe(user_id);
  if (!email) return;
  await expedier({
    to: [email],
    from: FROM_ASSOCIATION,
    nomExpediteur: "L'équipe DataParl'",
    subject: gele ? "Vos demandes d'association DataParl' sont suspendues" : "Votre demande d'association n'a pas abouti",
    titre: gele ? "Demandes suspendues" : "Demande non aboutie",
    corpsHtml: gele
      ? badgeStatut("Suspendues pendant 30 jours") +
        blocFiche(fiche, "Fiche demandée") +
        "<p>Après plusieurs tentatives depuis une adresse inattendue, les demandes d'association pour cette fiche sont suspendues pendant 30 jours.</p>" +
        "<p>Si vous êtes bien la personne concernée, passez par le formulaire de contact : nous vérifierons votre identité au cas par cas.</p>" +
        bouton(SITE_URL + "/contact", "Nous écrire") + SIGNATURE_HTML
      : badgeStatut("Non aboutie") +
        blocFiche(fiche, "Fiche demandée") +
        "<p>La vérification n'a pas pu aboutir : l'e-mail reçu ne correspond pas à l'adresse professionnelle attendue.</p><p>La marche à suivre :</p><ol style=\"margin:0 0 16px;padding:0 0 0 22px\"><li style=\"margin:0 0 6px\">Relancez la demande depuis la page « Associer ma fiche », puis envoyez l'e-mail prérempli <strong>depuis votre adresse professionnelle parlementaire</strong>, sans modifier l'objet ni le code.</li><li style=\"margin:0 0 6px\">Si vous n'avez plus accès à cette adresse (fin de collaboration, par exemple), la même page permet de joindre une pièce justificative (badge ou carte AN/Sénat, contrat de travail, capture de votre messagerie interne). Notre équipe vous répond sous 48 h.</li><li>En cas de blocage persistant, écrivez-nous via le formulaire de contact.</li></ol>" +
        bouton(SITE_URL + "/mon-compte/associer-fiche", "Reprendre la vérification") + SIGNATURE_HTML,
    text: gele
      ? "Après plusieurs tentatives depuis une adresse inattendue, les demandes d'association pour la fiche " + fiche + " sont suspendues pendant 30 jours. Passez par le formulaire de contact : " + SITE_URL + "/contact\n\nL'équipe DataParl'\n\n" + PIED_AUTO_TXT
      : "La vérification de la fiche " + fiche + " n'a pas pu aboutir. Relancez la demande depuis " + SITE_URL + "/mon-compte/associer-fiche et envoyez l'e-mail prérempli depuis votre adresse professionnelle parlementaire, sans modifier l'objet ni le code. Sans accès à cette adresse, joignez une pièce justificative depuis la même page (réponse sous 48 h).\n\nL'équipe DataParl'\n\n" + PIED_AUTO_TXT,
    pied: PIED_AUTO,
    type: "transactionnel",
  }).catch((e) => console.error("accuse refus", String(e).slice(0, 200)));
}

// Confirmation de dépôt d'une pièce justificative.
export async function accuserPiece(user_id: string, slug: string): Promise<void> {
  const f = await ficheFraiche(slug).catch(() => null);
  await accuseReception(user_id, libelleFiche(f?.prenom, f?.nom, slug));
}

async function journal(user_id: string, collab_id: string, evenement: string, detail: Record<string, unknown> = {}, fiche?: string): Promise<void> {
  await authAdmin().from("associations_journal").insert({ user_id, collab_id, evenement, detail });
  // Copie Slack (silencieuse si aucun canal configuré).
  const d = typeof detail?.from === "string" ? "Expéditeur : " + String(detail.from) : undefined;
  await prevenirAssociation(evenement, fiche ?? null, d).catch(() => {});
}

// Crée (ou relance) une demande d'association pour une fiche.
export async function creerDemande(
  userId: string, slug: string,
): Promise<{ ok: true; objet: string; code: string; expireLe: string; domaine: string } | { ok: false; error: string }> {
  const c = await ficheFraiche(slug).catch(() => null);
  if (!c) return { ok: false, error: "fiche introuvable" };
  const libelle = libelleFiche(c.prenom, c.nom, slug);
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
  await journal(userId, row.collab_id, "demande_creee", {}, libelle);
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
// générique, le compte voit le résultat dans « Mon compte » et reçoit un
// e-mail transactionnel à chaque aboutissement.
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
  const fiche = await ficheFraiche(slug).catch(() => null);
  const libelle = libelleFiche(fiche?.prenom, fiche?.nom, slug);
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
    await journal(demande.user_id, demande.collab_id, gele ? "gele" : "refus_domaine", { from: m.from }, libelle);
    if (gele) await accuseRefus(demande.user_id, libelle, true);
    return true;
  }
  if (expiree) {
    await journal(demande.user_id, demande.collab_id, "code_expire", { from: m.from }, libelle);
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
    await journal(demande.user_id, demande.collab_id, "valide_auto", { from: m.from }, libelle);
    await accuseValidation(demande.user_id, libelle);
    return true;
  }
  // Domaine bon mais nom ou SPF/DKIM non concluant : revue manuelle, jamais
  // de décision automatique partielle. L'adresse est conservée pour la
  // revue admin, la décision reste manuelle.
  await db.from("associations_fiches").update({ statut: "a_traiter", maj_le: new Date().toISOString(), email_preuve: normalizeEmail(m.from) }).eq("id", demande.id);
  await journal(demande.user_id, demande.collab_id, "a_traiter", { from: m.from, nomOk, spfDkimOk }, libelle);
  await accuseReception(demande.user_id, libelle);
  return true;
}

// Décisions manuelles (admin) : valider, refuser, dissocier.
export async function deciderManuellement(
  admin: { userId: string }, demandeId: string, action: "valider" | "refuser" | "dissocier",
): Promise<{ ok: boolean; error?: string }> {
  const db = authAdmin();
  const { data: demande } = await db.from("associations_fiches").select("*").eq("id", demandeId).maybeSingle();
  if (!demande) return { ok: false, error: "demande introuvable" };
  const f = await ficheFraiche(demande.collab_slug).catch(() => null);
  const libelle = libelleFiche(f?.prenom, f?.nom, demande.collab_slug);
  const maj =
    action === "valider" ? { statut: "verifie", verifie_par: "manuel", verifie_le: new Date().toISOString() } :
    action === "refuser" ? { statut: "refuse" } :
    { statut: "refuse", verifie_par: null, verifie_le: null, email_preuve: null };
  await db.from("associations_fiches").update({ ...maj, maj_le: new Date().toISOString() }).eq("id", demande.id);
  await journal(demande.user_id, demande.collab_id, `manuel_${action}`, { par: admin.userId }, libelle);
  if (action === "valider") await accuseValidation(demande.user_id, libelle);
  if (action === "refuser") await accuseRefus(demande.user_id, libelle, false);
  return { ok: true };
}

export async function demandesATraiter(): Promise<DemandeAssociation[]> {
  const { data } = await authAdmin().from("associations_fiches")
    .select("id, collab_slug, collab_id, statut, echecs, gel_jusqu_a, expire_le, verifie_le")
    .in("statut", ["a_traiter", "gele", "piece_jointe"]).order("cree_le", { ascending: false }).limit(100);
  return data ?? [];
}
