import "server-only";
import { expedier } from "./mail";

// Copies de traçabilité vers Slack. Deux modes :
// 1. SLACK_WEBHOOK_URL (recommandé) : webhook entrant Slack
//    (api.slack.com/messaging/webhooks). Fiable, aucune adresse e-mail
//    à maintenir. Tous les événements (contact, nouveaux comptes,
//    maintenance, associations) arrivent dans le canal du webhook.
// 2. Adresses e-mail des canaux (SLACK_CONTACT, SLACK_NEW_USER,
//    SLACK_MAINTENANCE, SLACK_ASSOCIATIONS) : tout message envoyé à
//    l'adresse apparaît dans le canal. Vide ou absente = aucune copie.
//    À n'utiliser que si l'adresse du canal est vérifiée active : une
//    adresse désactivée fait partir les messages en bounce.

export const SLACK_CONTACT = process.env.SLACK_CONTACT ?? "";
export const SLACK_NEW_USER = process.env.SLACK_NEW_USER ?? "";
export const SLACK_MAINTENANCE = process.env.SLACK_MAINTENANCE ?? "";

// Copie non bloquante : un échec d'envoi n'interrompt jamais le flux du site
// (il est seulement journalisé ; l'information existe déjà dans la webmail ou
// les tables Supabase).
export async function copieSlack(
  to: string,
  p: { subject: string; titre?: string; corpsHtml: string; text: string },
): Promise<void> {
  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (webhook) {
    try {
      const r = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "*" + p.subject + "*\n" + p.text }),
      });
      if (!r.ok) console.error("copie Slack (webhook)", p.subject, r.status);
    } catch (e) {
      console.error("copie Slack (webhook)", p.subject, String(e).slice(0, 200));
    }
    return;
  }
  if (!to) return;
  try {
    const r = await expedier({
      to: [to], subject: p.subject, titre: p.titre, corpsHtml: p.corpsHtml, text: p.text, type: "alerte",
    });
    if (!r.ok) console.error("copie Slack", p.subject, r.error);
  } catch (e) {
    console.error("copie Slack", p.subject, String(e).slice(0, 200));
  }
}
