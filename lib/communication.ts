import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Admin } from "./adminAuth";
import { nouveauJetonPreferences } from "./consent";
import { LIENS_BASE, MAIL_WEB_URL, secret } from "./env";
import { esc, texteVersHtml } from "./gabarit";
import { normalizeEmail } from "./tokens";
import { expedier, piedOptIn } from "./mail";
import { authAdmin } from "./supabaseAdmin";

// Communication sortante : communiqués de presse (carnet presse) et mailing
// aux comptes. Chaque envoi est archivé (table emails, version en ligne) et
// suivi : ouvertures par Resend, clics par le lien tracé du communiqué.
const SITE = "https://www.dataparl.fr";
const PAUSE_MS = 550; // Resend : 2 requêtes par seconde
export const MAX_DESTINATAIRES = 200; // par envoi : ~1 s par destinataire, 300 s de durée maximale

export const slugDe = (titre: string) =>
  titre.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "communique";

// Désinscription du carnet presse : lien signé, sans compte.
export function signaturePresse(email: string): string {
  return createHmac("sha256", secret("CONSENT_SALT")).update(`presse:${email.toLowerCase()}`).digest("hex").slice(0, 32);
}
export function signaturePresseValide(email: string, s: string): boolean {
  const a = Buffer.from(signaturePresse(email)), b = Buffer.from(s);
  return a.length === b.length && timingSafeEqual(a, b);
}

export type Communique = { id: string; slug: string; titre: string; chapo: string; corps: string; lien_code: string | null };

export function corpsCommunique(c: Pick<Communique, "chapo" | "corps">, lienEnLigne: string): { html: string; texte: string } {
  const html = [
    `<p style="margin:0 0 6px;font-size:12px;font-weight:bold;letter-spacing:.08em;text-transform:uppercase;color:#4A5670">Communiqué de presse</p>`,
    c.chapo ? `<p style="margin:0 0 18px;font-size:18px;line-height:1.5;font-weight:bold">${esc(c.chapo)}</p>` : "",
    texteVersHtml(c.corps),
    `<p style="margin:24px 0"><a href="${esc(lienEnLigne)}" style="display:inline-block;background:#F0444F;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:bold">Lire le communiqué en ligne</a></p>`,
    `<p style="margin:0;color:#4A5670;font-size:14px">Contact presse : <a href="mailto:presse@dataparl.fr" style="color:#164DFF">presse@dataparl.fr</a></p>`,
  ].join("\n");
  const texte = [`COMMUNIQUÉ DE PRESSE`, "", c.chapo, "", c.corps, "", `En ligne : ${lienEnLigne}`, "Contact presse : presse@dataparl.fr"].join("\n");
  return { html, texte };
}

const pause = () => new Promise((r) => setTimeout(r, PAUSE_MS));

// L'envoi est inscrit avant de partir, puis chaque destinataire au fur et à
// mesure : si l'exécution est interrompue, rien n'est perdu et une relance ne
// réécrit pas à ceux qui ont déjà reçu le message.
async function ouvrirEnvoi(a: Admin, type: "communique" | "mailing", ref: string | null, objet: string, audience: string): Promise<string> {
  const { data, error } = await authAdmin().from("envois").insert({ type, ref, objet, audience, cree_par: a.userId }).select("id").single();
  if (error) throw error;
  return data.id as string;
}
async function noter(envoiId: string, email: string, resendId: string) {
  await authAdmin().from("envois_destinataires").insert({ envoi_id: envoiId, email, resend_id: resendId });
}
async function fermerEnvoi(envoiId: string, envoyes: number, echecs: number) {
  await authAdmin().from("envois").update({ n_destinataires: envoyes, n_echecs: echecs }).eq("id", envoiId);
}

// Adresses ayant déjà reçu ce communiqué (ou ce mailing : même objet, mêmes 24 h).
export async function dejaServis(type: "communique" | "mailing", cle: { ref?: string; objet?: string }): Promise<Set<string>> {
  const db = authAdmin();
  let q = db.from("envois").select("id").eq("type", type);
  q = cle.ref ? q.eq("ref", cle.ref) : q.eq("objet", cle.objet ?? "").gte("cree_le", new Date(Date.now() - 86400_000).toISOString());
  const { data: envois } = await q;
  const out = new Set<string>();
  for (const e of envois ?? []) {
    for (let de = 0; ; de += 1000) {
      const { data } = await db.from("envois_destinataires").select("email").eq("envoi_id", e.id).range(de, de + 999);
      for (const d of data ?? []) out.add((d.email as string).toLowerCase());
      if ((data ?? []).length < 1000) break;
    }
  }
  return out;
}

// Lien tracé du communiqué (créé au premier envoi).
export async function lienDuCommunique(c: Communique, a: Admin): Promise<string> {
  const db = authAdmin();
  let code = c.lien_code;
  if (!code) {
    code = `cp-${c.slug.slice(0, 28).replace(/-$/, "")}-${randomBytes(3).toString("hex")}`;
    const { error } = await db.from("liens").insert({ code, destination: `${SITE}/presse/communiques/${c.slug}`, titre: `Communiqué : ${c.titre}`.slice(0, 120), cree_par: a.userId });
    if (error) throw error;
    await db.from("communiques").update({ lien_code: code }).eq("id", c.id);
  }
  return `${LIENS_BASE}/${code}?utm_source=communique`;
}

// Opt-out du suivi (communication_preferences.tracking_optout) : la
// personne reçoit le même message, mais avec le lien direct (non tracé) et
// sans mesure d'ouverture (ignorée côté webhook).
async function sansSuivi(email: string): Promise<boolean> {
  const { data } = await authAdmin().from("communication_preferences").select("tracking_optout").eq("email", normalizeEmail(email)).maybeSingle();
  return data?.tracking_optout === true;
}

export async function envoyerCommunique(a: Admin, c: Communique, destinataires: { email: string; prenom: string }[], test = false) {
  const lien = await lienDuCommunique(c, a);
  const lienDirect = `${SITE}/presse/communiques/${c.slug}`;
  let envoyes = 0, echecs = 0;
  const envoiId = test ? null : await ouvrirEnvoi(a, "communique", c.id, c.titre, "carnet presse");
  for (const d of destinataires.slice(0, MAX_DESTINATAIRES)) {
    const suivi = await sansSuivi(d.email);
    const { html, texte } = corpsCommunique(c, suivi ? lienDirect : lien);
    const stop = `${SITE}/api/presse/desinscription?e=${encodeURIComponent(d.email)}&s=${signaturePresse(d.email)}`;
    const r = await expedier({
      from: "presse@dataparl.fr", replyTo: "presse@dataparl.fr", to: [d.email], subject: `${test ? "[Test] " : ""}${c.titre}`, titre: c.titre,
      corpsHtml: html, text: texte, type: "communique", unsubscribeUrl: test ? undefined : stop,
      pied: test ? "Envoi de test." : `Vous recevez ce communiqué parce que vous figurez dans le carnet presse de DataParl'. <a href="${stop}" style="color:#4A5670">Ne plus recevoir nos communiqués</a>`,
    });
    if (r.ok) { envoyes += 1; if (envoiId) await noter(envoiId, d.email, r.resendId); } else echecs += 1;
    if (destinataires.length > 1) await pause();
  }
  if (envoiId) await fermerEnvoi(envoiId, envoyes, echecs);
  return { envoyes, echecs };
}

export type Audience = "abonnes" | "comptes";

// Destinataires d'un mailing. « abonnes » : personnes ayant consenti aux
// communications (désinscription dans chaque message). « comptes » : tous
// les comptes, pour un message de service (CGU, incident, changement du service).
export async function destinatairesMailing(audience: Audience): Promise<string[]> {
  const db = authAdmin();
  if (audience === "abonnes") {
    const [{ data: subs }, { data: refus }] = await Promise.all([
      db.from("newsletter_subscribers").select("email").eq("confirmed", true).is("unsubscribed_at", null).limit(5000),
      db.from("communication_preferences").select("email, newsletter_enabled, alertes_enabled"),
    ]);
    // Un seul refus (alertes ou nouvelles) suffit à écarter la personne.
    const non = new Set((refus ?? []).filter((r) => r.newsletter_enabled === false || r.alertes_enabled === false).map((r) => (r.email as string).toLowerCase()));
    return [...new Set((subs ?? []).map((s) => (s.email as string).toLowerCase()))].filter((e) => !non.has(e));
  }
  const out: string[] = [];
  for (let page = 1; page <= 100; page++) {
    const { data } = await db.auth.admin.listUsers({ page, perPage: 200 });
    const lot = data?.users ?? [];
    // Comptes confirmés et non suspendus seulement.
    out.push(...lot.filter((u) => u.email && u.email_confirmed_at && !(u as { banned_until?: string }).banned_until).map((u) => u.email!.toLowerCase()));
    if (lot.length < 200) break;
  }
  return [...new Set(out)];
}

export async function envoyerMailing(a: Admin, m: { objet: string; texte: string; audience: Audience }, destinataires: string[], test = false) {
  let envoyes = 0, echecs = 0;
  const envoiId = test ? null : await ouvrirEnvoi(a, "mailing", null, m.objet, m.audience);
  for (const email of destinataires.slice(0, MAX_DESTINATAIRES)) {
    let pied = "Message de service envoyé aux titulaires d'un compte DataParl'.";
    let stop: string | undefined;
    if (m.audience === "abonnes" && !test) {
      const jeton = await nouveauJetonPreferences(email);
      // Liens de consentement sur mail.dataparl.fr, comme pour les alertes.
      pied = piedOptIn(`${MAIL_WEB_URL}/preferences?id=${jeton}`, `${MAIL_WEB_URL}/desinscription?id=${jeton}`);
      stop = `${MAIL_WEB_URL}/api/desinscription?id=${jeton}`;
    }
    const r = await expedier({
      from: "hello@dataparl.fr", replyTo: "hello@dataparl.fr", to: [email], subject: `${test ? "[Test] " : ""}${m.objet}`, titre: m.objet,
      corpsHtml: texteVersHtml(m.texte), text: m.texte, type: "mailing", pied: test ? "Envoi de test." : pied, unsubscribeUrl: stop,
    });
    if (r.ok) { envoyes += 1; if (envoiId) await noter(envoiId, email, r.resendId); } else echecs += 1;
    if (destinataires.length > 1) await pause();
  }
  if (envoiId) await fermerEnvoi(envoiId, envoyes, echecs);
  return { envoyes, echecs };
}

// Ouvertures et clics d'envois passés.
export async function suiviEnvois(type: "communique" | "mailing", ref?: string) {
  const db = authAdmin();
  let q = db.from("envois").select("id, type, ref, objet, audience, n_destinataires, n_echecs, cree_le").eq("type", type).order("cree_le", { ascending: false }).limit(50);
  if (ref) q = q.eq("ref", ref);
  const { data: envois } = await q;
  const ids = (envois ?? []).map((e) => e.id as string);
  if (!ids.length) return [];
  const dest: { envoi_id: string; email: string; resend_id: string | null }[] = [];
  for (let de = 0; de < 20000; de += 1000) {
    const { data } = await db.from("envois_destinataires").select("envoi_id, email, resend_id").in("envoi_id", ids).range(de, de + 999);
    dest.push(...((data ?? []) as typeof dest));
    if ((data ?? []).length < 1000) break;
  }
  const resendIds = dest.map((d) => d.resend_id as string).filter(Boolean);
  const ouverts = new Map<string, string>();
  for (let i = 0; i < resendIds.length; i += 200) {
    const { data } = await db.from("emails").select("resend_id, opened_at, clicked_at").in("resend_id", resendIds.slice(i, i + 200));
    for (const e of data ?? []) if (e.opened_at || e.clicked_at) ouverts.set(e.resend_id as string, (e.opened_at ?? e.clicked_at) as string);
  }
  return (envois ?? []).map((e) => {
    // Un envoi interrompu n'a pas ses totaux : on les déduit des destinataires notés.
    e.n_destinataires = Math.max(e.n_destinataires as number, dest.filter((x) => x.envoi_id === e.id).length);
    const d = dest.filter((x) => x.envoi_id === e.id);
    return { ...e, ouvertures: d.filter((x) => ouverts.has(x.resend_id as string)).length, lecteurs: d.filter((x) => ouverts.has(x.resend_id as string)).map((x) => x.email as string) };
  });
}
