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
// Relais de secours : si Resend refuse ou échoue, on retente via Cloudflare
// Email Service (zone dataparl.com, même compte Cloudflare que le site).
// La boîte d'expédition est conservée, seul le domaine change :
// @dataparl.fr = @dataparl.com (cf. politique éditoriale). Un relais non
// configuré est simplement sauté ; si les deux échouent, l'erreur agrégée
// est renvoyée à l'appelant.

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

type Fournisseur = "resend" | "cloudflare";
type SortieEnvoi = { ok: true; fournisseur: Fournisseur; id: string } | { ok: false; erreur: string };

// Remplace le domaine dataparl.fr par celui vérifié chez le relais.
const fromPourDomaine = (from: string, domaine: string) =>
  from.replace(/@dataparl\.fr\b/, `@${domaine}`);

const detailErreur = async (r: Response): Promise<string> => {
  const detail = await r.text();
  try {
    const j = JSON.parse(detail) as { message?: string; Message?: string; errors?: { message?: string }[] };
    const msg = j.message ?? j.Message ?? j.errors?.[0]?.message ?? "";
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

// "Nom" <adresse> → { address, name } pour l'API Cloudflare (texte nu
// accepté, objet requis pour les adresses nommées).
const analyseAdresse = (a: string): string | { address: string; name?: string } => {
  const r = a.match(/^\s*(?:"([^"]*)"|([^<>"']*?))\s*<\s*([^>]+)\s*>\s*$/);
  if (!r) return a.trim();
  const nom = (r[1] ?? r[2] ?? "").trim();
  const adresse = r[3].trim();
  return nom ? { address: adresse, name: nom } : adresse;
};

// Cloudflare Email Service (bêta) : envoi transactionnel REST sur le domaine
// dataparl.com (zone du même compte Cloudflare que le site). Inactif tant
// que CF_ACCOUNT_ID et CF_EMAIL_SENDING_TOKEN ne sont pas posés sur le
// Worker : le relais est simplement sauté.
const envoiCloudflare = async (
  m: Message, from: string, headers: Record<string, string>, html: string, text: string
): Promise<SortieEnvoi> => {
  const accountId = secretOptionnel("CF_ACCOUNT_ID");
  const jeton = secretOptionnel("CF_EMAIL_SENDING_TOKEN");
  if (!accountId || !jeton) return { ok: false, erreur: "Cloudflare désactivé (jeton absent)" };
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/email/sending/send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${jeton}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      to: m.to.map(analyseAdresse),
      cc: m.cc?.length ? m.cc.map(analyseAdresse) : undefined,
      from: analyseAdresse(fromPourDomaine(from, "dataparl.com")),
      subject: m.subject, html, text, headers,
      ...(m.replyTo ? { replyTo: m.replyTo } : {}),
    }),
  });
  if (!r.ok) return { ok: false, erreur: `Cloudflare ${await detailErreur(r)}` };
  const d = await r.json().catch(() => ({}) as { success?: boolean; errors?: { message?: string }[]; result?: { message_id?: string } });
  if (!d.success) {
    const msg = d.errors?.[0]?.message ?? "envoi refusé";
    return { ok: false, erreur: `Cloudflare : ${msg}` };
  }
  return { ok: true, fournisseur: "cloudflare", id: d.result?.message_id ?? "" };
};

export async function expedier(m: Message): Promise<Resultat> {
  const jeton = randomBytes(20).toString("hex");
  const lireUrl = `${MAIL_WEB_URL}/lire/${jeton}`;
  const html = gabarit({ titre: m.titre ?? m.subject, corpsHtml: m.corpsHtml, lireUrl, pied: m.pied, edition: m.edition, adressage: m.adressage });
  const text = `${m.text}\n\n--\nDataParl', version en ligne : ${lireUrl}`;
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
    () => envoiCloudflare(m, from, headers, html, text),
  ];
  const erreurs: string[] = [];
  for (const tenter of tentatives) {
    const r = await tenter();
    if (r.ok) {
      // resend_id : identifiant du message chez le fournisseur qui l'a réellement
      // accepté (Resend ou Cloudflare Email Service) ; source l'indique.
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

// Bouton d'action : navy, arrondi 8px, hauteur confortable (mobile).
export function bouton(url: string, libelle: string): string {
  const e = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
  return `<p style="margin:24px 0"><a href="${e(url)}" style="display:inline-block;background:#0F172A;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 24px;border-radius:8px">${e(libelle)}</a></p>`;
}

export function piedObligatoire(): string {
  return "Message envoyé par DataParl' suite à une action faite avec ton adresse. Si ce n'est pas toi, ignore-le : rien ne sera enregistré.";
}

export function piedOptIn(prefsUrl: string, unsubUrl: string): string {
  return `<a href="https://www.dataparl.fr/mon-compte" style="color:#4A5670">Mon compte</a>, <a href="${unsubUrl}" style="color:#4A5670">Me désinscrire des alertes</a>, <a href="${prefsUrl}" style="color:#4A5670">Mes préférences</a>`;
}
