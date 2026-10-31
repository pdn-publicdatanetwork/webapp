import "server-only";
import { compterDossiers, idCourt, lister, type MessageCourt } from "./slackMail";

// Home tab de l'app dédiée « DataParl Mail » : uniquement la messagerie
// @dataparl.fr, avec compteurs par dossier et les derniers non lus.

type Bloc = Record<string, unknown>;

function homeMail(dossiers: { inbox: number; sent: number; trash: number; nonLus: number }, derniers: MessageCourt[]): Record<string, unknown> {
  const blocs: Bloc[] = [
    { type: "header", text: { type: "plain_text", text: "✉️ DataParl Mail", emoji: true } },
    { type: "section", text: { type: "mrkdwn", text: "Messagerie des adresses *@dataparl.fr* : lecture, réponse, transfert et envoi, sans quitter Slack." } },
    { type: "actions", elements: [
      { type: "button", text: { type: "plain_text", text: "📥 Reçus (" + dossiers.inbox.toLocaleString("fr-FR") + ")" }, style: "primary", action_id: "home_mail_inbox", value: "-" },
      { type: "button", text: { type: "plain_text", text: "📤 Envoyés (" + dossiers.sent.toLocaleString("fr-FR") + ")" }, action_id: "home_mail_envoyes", value: "-" },
      { type: "button", text: { type: "plain_text", text: "🗑 Corbeille (" + dossiers.trash.toLocaleString("fr-FR") + ")" }, action_id: "home_mail_corbeille", value: "-" },
    ] },
    { type: "actions", elements: [
      { type: "button", text: { type: "plain_text", text: "✏️ Écrire un message" }, style: "primary", action_id: "home_mail_nouveau", value: "-" },
      { type: "button", text: { type: "plain_text", text: "🔄 Rafraîchir" }, action_id: "home_refresh", value: "-" },
    ] },
    { type: "divider" },
  ];
  if (dossiers.nonLus > 0 && derniers.length) {
    blocs.push({ type: "section", text: { type: "mrkdwn", text: "*🔴 Non lus (" + dossiers.nonLus.toLocaleString("fr-FR") + ")*" } });
    derniers.slice(0, 5).forEach((m) => {
      blocs.push({ type: "section", text: { type: "mrkdwn", text: "*" + (m.subject || "(sans objet)") + "*\nDe : " + m.from_addr }, accessory: { type: "button", text: { type: "plain_text", text: "📖 Lire" }, action_id: "mail_lire", value: idCourt(m.id) } });
    });
  } else {
    blocs.push({ type: "section", text: { type: "mrkdwn", text: "📭 Aucun message non lu. Les notifications des nouveaux messages arrivent dans le canal dédié." } });
  }
  return { type: "home", blocks: blocs };
}

// Home complet avec compteurs et 5 derniers non lus (appelée à chaque
// ouverture de l'onglet et après chaque suppression).
export async function homeMailVue(): Promise<Record<string, unknown>> {
  const dossiers = await compterDossiers();
  const messages = await lister("inbox", 10, 0);
  const nonLus = messages.filter((m) => !m.read).slice(0, 5);
  return homeMail(dossiers, nonLus);
}
