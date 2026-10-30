import "server-only";
import { headers } from "next/headers";
import { PRIVACY_VERSION, secret } from "./env";
import { bouton, expedier, piedObligatoire } from "./mail";
import { authAdmin } from "./supabaseAdmin";
import { randomToken, sha256 } from "./tokens";

// Consentement, jetons de préférences et limitation de débit (dataparl-auth).

type Action = "subscribe" | "confirm" | "unsubscribe" | "prefs_update" | "account_delete";
type Type = "newsletter" | "alertes" | "compte" | "api" | "contact";

export async function clientFingerprint(): Promise<{ ipHash: string | null; userAgent: string | null }> {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "";
  const ipHash = ip ? await sha256(`${secret("CONSENT_SALT")}:${ip}`) : null;
  return { ipHash, userAgent: h.get("user-agent")?.slice(0, 300) ?? null };
}

export async function logConsent(email: string, action: Action, type: Type): Promise<void> {
  const { ipHash, userAgent } = await clientFingerprint();
  const { error } = await authAdmin().from("communication_consents_history").insert({
    email, action, consent_type: type, privacy_version: PRIVACY_VERSION, ip_hash: ipHash, user_agent: userAgent,
  });
  if (error) console.error("consentement", error.message);
}

// Au plus `max` inscriptions par heure et par IP (hachée). Fail-open : une
// base indisponible ne doit pas casser l'inscription.
export async function tropDeTentatives(max = 5): Promise<boolean> {
  try {
    const { ipHash } = await clientFingerprint();
    if (!ipHash) return false;
    const depuis = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await authAdmin()
      .from("communication_consents_history")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .eq("action", "subscribe")
      .gte("created_at", depuis);
    return (count ?? 0) >= max;
  } catch {
    return false;
  }
}

const TTL_PREFS_JOURS = 60;

// Un seul jeton actif par email ; régénéré à chaque envoi opt-in.
export async function nouveauJetonPreferences(email: string): Promise<string> {
  const token = randomToken();
  const db = authAdmin();
  await db.from("communication_tokens").delete().eq("email", email);
  const { error } = await db.from("communication_tokens").insert({
    email,
    token_hash: await sha256(token),
    expires_at: new Date(Date.now() + TTL_PREFS_JOURS * 86400_000).toISOString(),
  });
  if (error) throw new Error(error.message);
  return token;
}

export async function emailDepuisJeton(token: string | undefined | null): Promise<string | null> {
  if (!token || token.length < 20 || token.length > 100) return null;
  const { data } = await authAdmin()
    .from("communication_tokens")
    .select("email, expires_at")
    .eq("token_hash", await sha256(token))
    .maybeSingle();
  if (!data || new Date(data.expires_at) < new Date()) return null;
  return data.email as string;
}

export async function desinscrire(email: string): Promise<void> {
  const db = authAdmin();
  const now = new Date().toISOString();
  await db.from("communication_preferences").upsert({ email, newsletter_enabled: false, alertes_enabled: false, updated_at: now });
  await db.from("alert_subscriptions").update({ active: false, updated_at: now }).eq("email", email);
  await db.from("newsletter_subscribers").update({ unsubscribed_at: now }).eq("email", email);
  await logConsent(email, "unsubscribe", "alertes");
  // Accusé de réception (comptes@dataparl.fr) : confirme l'action, y compris
  // quand elle vient du lien en un clic des webmails. Une erreur d'envoi ne
  // doit jamais faire échouer la désinscription elle-même.
  try {
    await accuserDesinscription(email);
  } catch (e) {
    console.error("accusé désinscription", e);
  }
}

// Accusé de réception de la désinscription, depuis comptes@dataparl.fr — le
// même expéditeur que les mails de compte. Confirme l'action (bonne pratique
// RGPD : preuve en cas de contestation) et sert aussi bien au clic sur le
// bouton de la page qu'au lien en un clic (RFC 8058) des webmails. Pas
// d'en-tête List-Unsubscribe : ce n'est pas un envoi en liste.
export async function accuserDesinscription(email: string): Promise<void> {
  await expedier({
    from: "comptes@dataparl.fr",
    to: [email],
    subject: "Désinscription confirmée",
    titre: "C'est noté",
    corpsHtml: [
      "<p style='margin:0 0 18px;font-size:16px;line-height:1.6'>Bonjour,</p>",
      "<p style='margin:0 0 18px;font-size:16px;line-height:1.6'>Ta désinscription est confirmée : tu ne recevras plus les alertes ni les autres messages DataParl'.</p>",
      bouton("https://www.dataparl.fr/mon-compte", "Réactiver depuis mon compte"),
      "<p style='margin:0;font-size:14px;color:#475569'>Si ce n'est pas toi qui as demandé cette désinscription, reconnecte-toi à ton compte pour l'annuler.</p>",
    ].join(""),
    text: "Bonjour,\n\nTa désinscription est confirmée : tu ne recevras plus les alertes ni les autres messages DataParl'.\n\nRéactiver depuis mon compte : https://www.dataparl.fr/mon-compte\n\nSi ce n'est pas toi qui as demandé cette désinscription, reconnecte-toi à ton compte pour l'annuler.",
    pied: piedObligatoire(),
    type: "transactionnel",
  });
}

// Accusé de réception d'un changement de préférences (comptes@dataparl.fr).
// prefsUrl : le lien signé encore valable, pour revoir les réglages.
export async function accuserPreferences(email: string, prefsUrl: string): Promise<void> {
  await expedier({
    from: "comptes@dataparl.fr",
    to: [email],
    subject: "Tes préférences sont enregistrées",
    titre: "C'est noté",
    corpsHtml: [
      "<p style='margin:0 0 18px;font-size:16px;line-height:1.6'>Bonjour,</p>",
      "<p style='margin:0 0 18px;font-size:16px;line-height:1.6'>Tes préférences d'alertes DataParl' sont enregistrées. Le prochain envoi suivra tes nouveaux réglages.</p>",
      bouton(prefsUrl, "Revoir mes préférences"),
    ].join(""),
    text: "Bonjour,\n\nTes préférences d'alertes DataParl' sont enregistrées. Le prochain envoi suivra tes nouveaux réglages.\n\nRevoir mes préférences : " + prefsUrl,
    pied: piedObligatoire(),
    type: "transactionnel",
  });
}
