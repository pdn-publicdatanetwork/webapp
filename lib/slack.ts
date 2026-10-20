import "server-only";
import { expedier } from "./mail";

// Copies de traçabilité vers les canaux Slack de l'espace DataParl'. Chaque
// canal Slack expose une adresse e-mail : tout message envoyé à cette adresse
// apparaît dans le canal. Les adresses sont surchargeables par l'environnement
// (Vercel) ; vide = aucune copie.

export const SLACK_CONTACT = process.env.SLACK_CONTACT ?? "contact-aaaawph43zrpkhqvpphzk37lyi@dataparl.slack.com";
export const SLACK_NEW_USER = process.env.SLACK_NEW_USER ?? "new-user-aaaawpoeh27fm2ywhviv7e33cq@dataparl.slack.com";
export const SLACK_MAINTENANCE = process.env.SLACK_MAINTENANCE ?? "inscription-maintenan-aaaawove3uomplj34xm3guiguq@dataparl.slack.com";

// Copie non bloquante : un échec d'envoi n'interrompt jamais le flux du site
// (il est seulement journalisé ; l'information existe déjà dans la webmail ou
// les tables Supabase).
export async function copieSlack(
  to: string,
  p: { subject: string; titre?: string; corpsHtml: string; text: string },
): Promise<void> {
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
