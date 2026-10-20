import "server-only";
import { expedier } from "./mail";

// Copies de traçabilité vers les canaux Slack de l'espace DataParl'. Chaque
// canal Slack expose une adresse e-mail : tout message envoyé à cette adresse
// apparaît dans le canal. Les adresses sont configurées dans l'environnement
// (Vercel : SLACK_CONTACT, SLACK_NEW_USER, SLACK_MAINTENANCE) ; vide ou absente
// = aucune copie.

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
