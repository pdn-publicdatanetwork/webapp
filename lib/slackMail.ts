import "server-only";
import { authAdmin } from "@/lib/supabaseAdmin";
import { gabarit, texteVersHtml } from "@/lib/gabarit";

// Console Slack /mail : lecture, envoi et suppression des e-mails de la
// table emails (dataparl-auth) — même base que le webmail de l'admin.
// Authentifiée par MAINTENANCE_TOKEN (?t=…), pas par une session admin.
// Envoi réel : Resend + gabarit officiel DataParl' (lib/gabarit.ts), puis
// rangement dans emails et trace d'audit.

export const EXPEDITEURS = ["hello@dataparl.fr", "contact@dataparl.fr", "presse@dataparl.fr", "rgpd@dataparl.fr", "support@dataparl.fr", "it@dataparl.fr"];

export type MessageCourt = { id: string; from_addr: string; to_addr: string; subject: string; date: string; read: boolean };
type Message = MessageCourt & { direction: string; cc_addr: string | null; body_text: string | null; attachments: unknown };

export function idCourt(id: string): string {
  return id.replace(/-/g, "").slice(0, 8);
}

async function chercher(prefixe: string): Promise<{ ok: true; message: Message } | { ok: false; erreur: string }> {
  const p = prefixe.replace(/-/g, "").toLowerCase();
  if (!/^[0-9a-f]{4,12}$/.test(p)) return { ok: false, erreur: "id invalide (4 à 12 caractères hexadécimaux, ex. 3f2a19b4)" };
  const { data } = await authAdmin().from("emails")
    .select("id, direction, from_addr, to_addr, cc_addr, subject, date, read, body_text, attachments")
    .ilike("id", p + "%").limit(2);
  const rows = (data ?? []) as Message[];
  if (!rows.length) return { ok: false, erreur: "message introuvable — /mail pour la liste" };
  if (rows.length > 1) return { ok: false, erreur: "id ambigu — ajoute des caractères" };
  return { ok: true, message: rows[0] };
}

export async function lister(dossier: string, limite: number): Promise<MessageCourt[]> {
  const { data } = await authAdmin().from("emails")
    .select("id, from_addr, to_addr, subject, date, read")
    .eq("folder", dossier).eq("deleted", false)
    .order("date", { ascending: false }).limit(limite);
  return (data ?? []) as MessageCourt[];
}

// Lit un message (le marque lu) ; prefixe = début de l'uuid sans tirets.
export async function lire(prefixe: string): Promise<{ ok: true; message: Message } | { ok: false; erreur: string }> {
  const r = await chercher(prefixe);
  if (!r.ok) return r;
  if (!r.message.read) await authAdmin().from("emails").update({ read: true }).eq("id", r.message.id);
  return { ok: true, message: { ...r.message, read: true } };
}

// Déplace vers la corbeille (folder=trash, même comportement que le webmail).
export async function supprimer(prefixe: string): Promise<string | null> {
  const r = await chercher(prefixe);
  if (!r.ok) return r.erreur;
  const { error } = await authAdmin().from("emails").update({ folder: "trash" }).eq("id", r.message.id);
  return error ? error.message : null;
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Envoi réel (après confirmation par bouton) : Resend + gabarit officiel.
export async function envoyerDepuisSlack(qui: string, b: { from: string; a: string[]; cc?: string[]; sujet: string; texte: string }): Promise<{ ok: true } | { ok: false; erreur: string }> {
  const from = b.from.toLowerCase();
  if (!EXPEDITEURS.includes(from)) return { ok: false, erreur: "adresse d'expédition non autorisée" };
  const cc = (b.cc ?? []).map((x) => x.trim().toLowerCase()).filter((x) => EMAIL_RE.test(x));
  const key = process.env.RESEND_API_KEY ?? "";
  if (!key) return { ok: false, erreur: "RESEND_API_KEY absente sur Vercel" };
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: '"DataParl\'" <' + from + ">",
      to: b.a, cc: cc.length ? cc : undefined, subject: b.sujet,
      html: gabarit({ titre: b.sujet, corpsHtml: texteVersHtml(b.texte) }), text: b.texte,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) {
    let msg = "";
    try { msg = ((await r.json()) as { message?: string }).message ?? ""; } catch { /* corps non JSON */ }
    return { ok: false, erreur: "envoi refusé par Resend" + (msg ? " : " + msg : "") };
  }
  const resendId = ((await r.json()) as { id: string }).id;
  await authAdmin().from("emails").insert({
    direction: "out", communication_type: "webmail", from_addr: from, to_addr: b.a.join(", "),
    cc_addr: cc.length ? cc.join(", ") : null, subject: b.sujet, body_text: b.texte,
    body_html: gabarit({ titre: b.sujet, corpsHtml: texteVersHtml(b.texte) }),
    folder: "sent", read: true, source: "resend", date: new Date().toISOString(),
  });
  try {
    await authAdmin().from("admin_audit").insert({ github_login: "slack:" + qui, action: "webmail.slack_envoi", cible: resendId, details: { from, to: b.a, cc, subject: b.sujet } });
  } catch { /* audit facultatif : ne pas bloquer l'envoi */ }
  return { ok: true };
}
