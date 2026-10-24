import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { MAIL_FROM, MAIL_WEB_URL, secret, secretOptionnel } from "./env";
import { gabarit } from "./gabarit";
import { authAdmin } from "./supabaseAdmin";

export { esc, texteVersHtml } from "./gabarit";

// Point d'envoi unique. Chaque email :
//   - est habillé du gabarit DataParl' ;
//   - a une version en ligne (mail.dataparl.fr/lire/<jeton>, seul le
//     hash du jeton est stocké) ;
//   - est rangé dans la table emails (visible dans la webmail).
//
// Relais de secours : si Resend refuse ou échoue, on retente via Postmark
// (domaine vérifié dataparl.com) puis Mailgun (dataparl.info, région UE).
// La boîte d'expédition est conservée, seul le domaine change :
// @dataparl.fr = @dataparl.com (cf. politique éditoriale). Un relais dont
// le jeton n'est pas configuré est simplement sauté ; si les trois échouent,
// l'erreur agrégée est renvoyée à l'appelant.

export type TypeEnvoi = "transactionnel" | "webmail" | "auto" | "alerte" | "communique" | "mailing";

export type Message = {
  from?: string; // adresse nue ; défaut : MAIL_FROM
  nomExpediteur?: string; // nom affiché ; défaut : DataParl'
  to: string[];
  cc?: string[];
  subject: string;
  titre?: string; // titre dans la carte ; défaut : l'objet
  corpsHtml: string;
  text: string;
  pied?: string;
  replyTo?: string;
  unsubscribeUrl?: string; // communication opt-in : désinscription en un clic (RFC 8058)
  inReplyTo?: string | null;
  references?: string | null;
  headers?: Record<string, string>;
  type: TypeEnvoi;
  edition?: "Daily" | "Weekly";
  adressage?: { date: string; pour?: string };
};

export type Resultat = { ok: true; resendId: string } | { ok: false; error: string };

export const hashJeton = (t: string) => createHash("sha256").update(t).digest("hex");

type Fournisseur = "resend" | "postmark" | "mailgun";
type SortieEnvoi = { ok: true; fournisseur: Fournisseur; id: string } | { ok: false; erreur: string };

// Remplace le domaine dataparl.fr par celui vérifié chez le relais.
const fromPourDomaine = (from: string, domaine: string) =>
  from.replace(/@dataparl\.fr\b/, `@${domaine}`);

const detailErreur = async (r: Response): Promise<string> => {
  const detail = await r.text();
  try {
    const j = JSON.parse(detail) as { message?: string; Message?: string };
    const msg = j.message ?? j.Message ?? "";
    return `${r.status}${msg ? ` : ${msg}` : ""}`;
  } catch {
    /* corps non JSON */
    return String(r.status);
  }
};

const envoiResend = async (
  m: Message, from: string, headers: Record<string, string>, html: string, text: string
): Promise<SortieEnvoi> => {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${secret("RESEND_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from, to: m.to, cc: m.cc?.length ? m.cc : undefined, subject: m.subject, html, text, headers,
      ...(m.replyTo ? { reply_to: m.replyTo } : {}),
    }),
  });
  if (!r.ok) return { ok: false, erreur: `Resend ${await detailErreur(r)}` };
  return { ok: true, fournisseur: "resend", id: ((await r.json()) as { id: string }).id };
};

const envoiPostmark = async (
  m: Message, from: string, headers: Record<string, string>, html: string, text: string
): Promise<SortieEnvoi> => {
  const jeton = secretOptionnel("POSTMARK_SERVER_TOKEN");
  if (!jeton) return { ok: false, erreur: "Postmark désactivé (jeton absent)" };
  const r = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: { Accept: "application/json", "X-Postmark-Server-Token": jeton, "Content-Type": "application/json" },
    body: JSON.stringify({
      From: fromPourDomaine(from, "dataparl.com"),
      To: m.to,
      Cc: m.cc?.length ? m.cc : undefined,
      Subject: m.subject,
      HTMLBody: html,
      TextBody: text,
      ReplyTo: m.replyTo || undefined,
      MessageStream: "outbound",
      Headers: Object.entries(headers).map(([Name, Value]) => ({ Name, Value })),
    }),
  });
  if (!r.ok) return { ok: false, erreur: `Postmark ${await detailErreur(r)}` };
  return { ok: true, fournisseur: "postmark", id: ((await r.json()) as { MessageID: string }).MessageID };
};

const envoiMailgun = async (
  m: Message, from: string, headers: Record<string, string>, html: string, text: string
): Promise<SortieEnvoi> => {
  const jeton = secretOptionnel("MAILGUN_API_KEY");
  if (!jeton) return { ok: false, erreur: "Mailgun désactivé (jeton absent)" };
  const corps = new URLSearchParams({
    from: fromPourDomaine(from, "dataparl.info"),
    to: m.to.join(","),
    ...(m.cc?.length ? { cc: m.cc.join(",") } : {}),
    subject: m.subject,
    html,
    text,
  });
  for (const [k, v] of Object.entries(headers)) corps.set(`h:${k}`, v);
  if (m.replyTo) corps.set("h:Reply-To", m.replyTo);
  const r = await fetch("https://api.eu.mailgun.net/v3/dataparl.info/messages", {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`api:${jeton}`).toString("base64")}` },
    body: corps,
  });
  if (!r.ok) return { ok: false, erreur: `Mailgun ${await detailErreur(r)}` };
  return { ok: true, fournisseur: "mailgun", id: ((await r.json()) as { id: string }).id };
};

export async function expedier(m: Message): Promise<Resultat> {
  const jeton = randomBytes(20).toString("hex");
  const lireUrl = `${MAIL_WEB_URL}/lire/${jeton}`;
  const html = gabarit({ titre: m.titre ?? m.subject, corpsHtml: m.corpsHtml, lireUrl, pied: m.pied, edition: m.edition, adressage: m.adressage });
  const text = `${m.text}\n\n--\nDataParl' · version en ligne : ${lireUrl}`;
  const nom = (m.nomExpediteur ?? "DataParl'").replace(/["<>\r\n]/g, "").trim() || "DataParl'";
  const from = m.from ? `"${nom}" <${m.from}>` : MAIL_FROM;

  const headers: Record<string, string> = { ...(m.headers ?? {}) };
  if (m.unsubscribeUrl) {
    headers["List-Unsubscribe"] = `<${m.unsubscribeUrl}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }
  if (m.inReplyTo) {
    headers["In-Reply-To"] = m.inReplyTo;
    headers["References"] = [m.references, m.inReplyTo].filter(Boolean).join(" ");
  }

  const tentatives: Array<() => Promise<SortieEnvoi>> = [
    () => envoiResend(m, from, headers, html, text),
    () => envoiPostmark(m, from, headers, html, text),
    () => envoiMailgun(m, from, headers, html, text),
  ];
  const erreurs: string[] = [];
  for (const tenter of tentatives) {
    const r = await tenter();
    if (r.ok) {
      // resend_id : identifiant du message chez le fournisseur qui l'a réellement
      // accepté (Resend, Postmark ou Mailgun) ; source l'indique.
      const { error } = await authAdmin().from("emails").insert({
        direction: "out", communication_type: m.type, from_addr: m.from ?? MAIL_FROM, to_addr: m.to.join(", "),
        cc_addr: m.cc?.length ? m.cc.join(", ") : null, reply_to: m.replyTo ?? null,
        subject: m.subject, body_text: m.text, body_html: html, in_reply_to: m.inReplyTo ?? null,
        resend_id: r.id, web_token_hash: hashJeton(jeton), folder: "sent", read: true, source: r.fournisseur,
      });
      if (error) console.error("emails insert", error);
      return { ok: true, resendId: r.id };
    }
    console.error("Envoi", r.erreur);
    erreurs.push(r.erreur);
  }
  return { ok: false, error: `envoi refusé par tous les fournisseurs : ${erreurs.join(" ; ")}` };
}

export function bouton(url: string, libelle: string): string {
  const e = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
  return `<p style="margin:24px 0"><a href="${e(url)}" style="display:inline-block;background:#F0444F;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:bold">${e(libelle)}</a></p>`;
}

export function piedObligatoire(): string {
  return "Message envoyé par DataParl' suite à une action faite avec ton adresse. Si ce n'est pas toi, ignore-le : rien ne sera enregistré.";
}

export function piedOptIn(prefsUrl: string, unsubUrl: string): string {
  return `<a href="https://www.dataparl.fr/mon-compte" style="color:#4A5670">Mon compte</a> · <a href="${unsubUrl}" style="color:#4A5670">Me désinscrire des alertes</a> · <a href="${prefsUrl}" style="color:#4A5670">Mes préférences</a>`;
}
