import "server-only";

// Notification #mail : chaque e-mail reçu (webhook Resend, lib/webmail) est
// annoncé dans le canal Slack configuré (SLACK_MAIL_CHANNEL, défaut « mail »),
// avec un bouton Lire qui ouvre le message complet dans un modal de la
// console. Best-effort : une panne Slack ne doit jamais faire échouer le
// webhook Resend (il réessaierait de son côté).

export async function notifierRecu(m: { id: string; from: string; sujet: string; texte: string | null; pour: string }): Promise<void> {
  const bot = process.env.SLACK_BOT_TOKEN ?? "";
  if (!bot) return;
  // Les e-mails de vérification d'association (associer@) sont du bruit :
  // ils sont déjà traités automatiquement, pas besoin d'annoncer chacun.
  if (m.pour.toLowerCase().includes("associer@")) return;
  const canal = process.env.SLACK_MAIL_CHANNEL ?? "mail";
  const court = m.id.replace(/-/g, "").slice(0, 8);
  const extrait = (m.texte ?? "").trim().split("\n").filter(Boolean).slice(0, 3).join("\n").slice(0, 280);
  const blocs = [
    { type: "section", text: { type: "mrkdwn", text: "📬 *Nouveau message* de " + m.from + "\n*" + (m.sujet || "(sans objet)") + "*\nPour : " + m.pour + (extrait ? "\n> " + extrait.split("\n").join("\n> ") : "") } },
    { type: "actions", elements: [
      { type: "button", text: { type: "plain_text", text: "📖 Lire et répondre" }, style: "primary", action_id: "mail_notif_lire", value: court },
      { type: "button", text: { type: "plain_text", text: "🗑 Corbeille" }, style: "danger", action_id: "mail_supprimer_ok", value: court,
        confirm: { title: { type: "plain_text", text: "Corbeille ?" }, text: { type: "plain_text", text: "Le message sera déplacé vers la corbeille du webmail." }, confirm: { type: "plain_text", text: "Corbeille" }, deny: { type: "plain_text", text: "Annuler" }, style: "danger" } },
    ] },
  ];
  try {
    await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: { Authorization: "Bearer " + bot, "Content-Type": "application/json" },
      body: JSON.stringify({ channel: canal, text: "📬 Nouveau message : " + (m.sujet || "(sans objet)"), blocks: blocs }),
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
  } catch { /* Slack indisponible : le mail est déjà en base, rien n'est perdu */ }
}
