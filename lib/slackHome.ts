import "server-only";
import { lireMaintenance } from "./maintenanceAdmin";
import { EXPEDITEURS, lister, idCourt } from "./slackMail";
import { compteAssoc } from "./slackAssoc";

// Home tab de l'app Slack « DataParl' Console » : une vraie interface avec
// des sections (Site, Données, Associations, CRM, Publication, E-mail) et
// des boutons, à la place des seules slash commands. Publiée par views.publish
// à l'ouverture (événement app_home_opened → /api/slack/events) et rafraîchie
// après chaque action.

export function modalPost(): Record<string, unknown> {
  return {
    type: "modal", callback_id: "post_publication",
    title: { type: "plain_text", text: "Publier sur les réseaux" },
    submit: { type: "plain_text", text: "Publier" },
    close: { type: "plain_text", text: "Annuler" },
    blocks: [
      { type: "input", optional: true, block_id: "destination", element: { type: "plain_text_input", action_id: "v", placeholder: { type: "plain_text", text: "https://www.dataparl.fr/… (vide = texte seul)" } }, label: { type: "plain_text", text: "Page à partager (facultatif : crée les liens tracés)" } },
      { type: "input", block_id: "texte", element: { type: "plain_text_input", action_id: "v", multiline: true, max_length: 500, placeholder: { type: "plain_text", text: "Le texte du post : le lien court est ajouté automatiquement si une page est fournie" } }, label: { type: "plain_text", text: "Texte du post" } },
      { type: "input", block_id: "reseaux", element: { type: "checkboxes", action_id: "v", options: [
        { text: { type: "plain_text", text: "X (Twitter)" }, value: "x" },
        { text: { type: "plain_text", text: "Bluesky" }, value: "bsky" },
      ] }, label: { type: "plain_text", text: "Réseaux (un lien court dédié par réseau si une page est fournie)" } },
      { type: "input", block_id: "mode", element: { type: "radio_buttons", action_id: "v", options: [
        { text: { type: "plain_text", text: "File Buffer (publié selon ton planning)" }, value: "file" },
        { text: { type: "plain_text", text: "Publier immédiatement" }, value: "maintenant" },
        { text: { type: "plain_text", text: "Brouillon dans Buffer (à valider dans Buffer)" }, value: "brouillon" },
      ], initial_option: { text: { type: "plain_text", text: "File Buffer (publié selon ton planning)" }, value: "file" } }, label: { type: "plain_text", text: "Publication" } },
    ],
  };
}

export function modalEnvoi(): Record<string, unknown> {
  return {
    type: "modal", callback_id: "mail_envoi",
    title: { type: "plain_text", text: "Nouveau message" },
    submit: { type: "plain_text", text: "Préparer" },
    close: { type: "plain_text", text: "Annuler" },
    blocks: [
      { type: "input", block_id: "from", element: { type: "static_select", action_id: "v", options: EXPEDITEURS.map((e) => ({ text: { type: "plain_text", text: e }, value: e })) }, label: { type: "plain_text", text: "Expéditeur" } },
      { type: "input", block_id: "a", element: { type: "plain_text_input", action_id: "v", placeholder: { type: "plain_text", text: "destinataire@exemple.fr (plusieurs séparés par des virgules)" } }, label: { type: "plain_text", text: "À" } },
      { type: "input", optional: true, block_id: "cc", element: { type: "plain_text_input", action_id: "v", placeholder: { type: "plain_text", text: "copie@exemple.fr (facultatif, virgules acceptées)" } }, label: { type: "plain_text", text: "Cc (facultatif)" } },
      { type: "input", block_id: "sujet", element: { type: "plain_text_input", action_id: "v", max_length: 300 }, label: { type: "plain_text", text: "Objet" } },
      { type: "input", block_id: "texte", element: { type: "plain_text_input", action_id: "v", multiline: true, max_length: 1400, placeholder: { type: "plain_text", text: "Le message : une confirmation s'affichera avant l'envoi réel" } }, label: { type: "plain_text", text: "Message" } },
    ],
  };
}

// Modal de recherche d'un compte (Données → 🔍 Fiche compte).
export function modalRechercheCompte(): Record<string, unknown> {
  return {
    type: "modal", callback_id: "data_recherche",
    title: { type: "plain_text", text: "Fiche compte" },
    submit: { type: "plain_text", text: "Chercher" },
    close: { type: "plain_text", text: "Annuler" },
    blocks: [
      { type: "input", block_id: "q", element: { type: "plain_text_input", action_id: "v", placeholder: { type: "plain_text", text: "adresse e-mail du compte, ou son identifiant" } }, label: { type: "plain_text", text: "Compte à afficher" } },
      { type: "context", elements: [{ type: "mrkdwn", text: "Équivaut à la fiche /admin/users/<id> : clés API, connexions, téléchargements, enquête. Lecture seule." }] },
    ],
  };
}

function heure(iso: string): string {
  try {
    return new Date(iso).toLocaleString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}

// Modal « boîte de réception » : 12 derniers messages reçus.
export async function modalInbox(): Promise<Record<string, unknown>> {
  const messages = await lister("inbox", 12);
  const lignes = messages.map((m) =>
    (m.read ? "• " : "🔴 ") + "`" + idCourt(m.id) + "` " + m.from_addr + " : *" + (m.subject || "(sans objet)") + "* (" + heure(m.date) + ")");
  return {
    type: "modal", callback_id: "mail_inbox",
    title: { type: "plain_text", text: "Boîte de réception" },
    close: { type: "plain_text", text: "Fermer" },
    blocks: messages.length ? [
      { type: "section", text: { type: "mrkdwn", text: lignes.join("\n") } },
      { type: "context", elements: [{ type: "mrkdwn", text: "Lire un message : /mail <id court>, Supprimer : /mail supprimer <id court>" }] },
    ] : [{ type: "section", text: { type: "mrkdwn", text: "📭 Aucun message reçu." } }],
  };
}

// Publie (ou rafraîchit) le Home tab de l'utilisateur. Sections dans
// l'ordre d'usage courant : d'abord ce qui demande une décision (site,
// données, associations, CRM), ensuite la publication (posts, chiffres
// pub), enfin les e-mails.
export async function publierHome(userId: string): Promise<{ ok: boolean; erreur: string }> {
  const bot = process.env.SLACK_BOT_TOKEN ?? "";
  if (!bot || !userId) return { ok: false, erreur: "SLACK_BOT_TOKEN ou user_id absent" };
  const etat = await lireMaintenance().catch(() => null);
  const nAssoc = await compteAssoc().catch(() => 0);
  const boutonsSite: Record<string, unknown>[] = etat?.active
    ? [{ type: "button", text: { type: "plain_text", text: "🟢 Rétablir le site" }, style: "primary", action_id: "home_maintenance_off" }]
    : [{ type: "button", text: { type: "plain_text", text: "🔴 Basculer en maintenance" }, style: "danger", action_id: "home_maintenance_on" }];
  const view = {
    type: "home",
    blocks: [
      { type: "header", text: { type: "plain_text", text: "Console DataParl'" } },
      { type: "context", elements: [{ type: "mrkdwn", text: "Pilote le site, les données, les associations de fiches, le CRM, la publication (posts, publicité, revenus) et les e-mails : les slash commands (/maintenance, /stats, /post, /mail, /sql) restent disponibles." }] },
      { type: "section", text: { type: "mrkdwn", text: "*🛠 Site*\n" + (etat?.active ? "🔴 Maintenance en cours" + (etat.motif ? " : " + etat.motif : "") : "🟢 Site ouvert") } },
      { type: "actions", elements: [
        ...boutonsSite,
        { type: "button", text: { type: "plain_text", text: "📊 Statistiques" }, action_id: "home_stats" },
      ] },
      { type: "section", text: { type: "mrkdwn", text: "*📊 Données*\nLes lignes de test peuvent être supprimées (bouton 🗑 avec confirmation)." } },
      { type: "actions", elements: [
        { type: "button", text: { type: "plain_text", text: "👥 Comptes" }, action_id: "home_data_users" },
        { type: "button", text: { type: "plain_text", text: "🔍 Fiche compte" }, action_id: "home_data_recherche" },
        { type: "button", text: { type: "plain_text", text: "📬 Abonnés" }, action_id: "home_data_abonnes" },
      ] },
      { type: "actions", elements: [
        { type: "button", text: { type: "plain_text", text: "🔑 Clés API" }, action_id: "home_data_cles" },
        { type: "button", text: { type: "plain_text", text: "⬇️ Téléchargements" }, action_id: "home_data_telechargements" },
        { type: "button", text: { type: "plain_text", text: "📋 Enquête" }, action_id: "home_data_survey" },
      ] },
      { type: "section", text: { type: "mrkdwn", text: "*🔗 Associations de fiches*\n" + (nAssoc ? nAssoc + " demande(s) à vérifier" : "Aucune demande en cours") } },
      { type: "actions", elements: [
        { type: "button", text: { type: "plain_text", text: "📋 À vérifier" }, action_id: "home_assoc" },
        { type: "button", text: { type: "plain_text", text: "📄 CV associés" }, action_id: "home_assoc_cv" },
        { type: "button", text: { type: "plain_text", text: "🕘 Journal" }, action_id: "home_assoc_journal" },
      ] },
      { type: "section", text: { type: "mrkdwn", text: "*🎯 CRM*\nFiche 360° par e-mail : compte, messages, abonnements, suivi." } },
      { type: "actions", elements: [
        { type: "button", text: { type: "plain_text", text: "🔍 Fiche contact" }, action_id: "home_crm" },
      ] },
      { type: "section", text: { type: "mrkdwn", text: "*📣 Publication et revenus*\nPosts, vidéos AppLixir jouées, AdSense, revenus estimés, provenance du trafic." } },
      { type: "actions", elements: [
        { type: "button", text: { type: "plain_text", text: "📣 Publier (X, Bluesky)" }, style: "primary", action_id: "home_post" },
        { type: "button", text: { type: "plain_text", text: "📺 Pub et revenus" }, action_id: "home_pub" },
      ] },
      { type: "actions", elements: [
        { type: "button", text: { type: "plain_text", text: "✍️ Saisir des chiffres" }, action_id: "home_pub_saisir" },
        { type: "button", text: { type: "plain_text", text: "🔎 Sources de trafic" }, action_id: "home_sources" },
      ] },
      { type: "section", text: { type: "mrkdwn", text: "*✉️ E-mail*" } },
      { type: "actions", elements: [
        { type: "button", text: { type: "plain_text", text: "Nouveau message" }, style: "primary", action_id: "home_mail_nouveau" },
        { type: "button", text: { type: "plain_text", text: "📥 Boîte de réception" }, action_id: "home_mail_inbox" },
      ] },
    ],
  };
  try {
    const r = await fetch("https://slack.com/api/views.publish", {
      method: "POST",
      headers: { Authorization: "Bearer " + bot, "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, view }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const j = (await r.json()) as { ok: boolean; error?: string; needed?: string; provided?: string; response_metadata?: { messages?: string[] } };
    // Slack renvoie le détail exact du refus (invalid_arguments, etc.) dans
    // response_metadata.messages : invalid user_id, ou json-pointer du bloc
    // fautif (/view/blocks/3/…). On le remonte dans l'avertissement #monitoring.
    const detail = j.response_metadata?.messages?.length ? " (" + j.response_metadata.messages.join(" ; ") + ")" : "";
    return { ok: j.ok, erreur: j.ok ? "" : (j.error ?? "erreur inconnue") + detail + (j.needed ? " (scope requis : " + j.needed + ", fourni : " + (j.provided ?? "aucun") + ")" : "") };
  } catch (e) {
    return { ok: false, erreur: e instanceof Error ? e.message : String(e) };
  }
}

// Ouvre un modal depuis une action (bouton) : trigger_id du payload.
export async function ouvrirModal(view: Record<string, unknown>, triggerId: string): Promise<boolean> {
  const bot = process.env.SLACK_BOT_TOKEN ?? "";
  if (!bot || !triggerId) return false;
  try {
    const r = await fetch("https://slack.com/api/views.open", {
      method: "POST",
      headers: { Authorization: "Bearer " + bot, "Content-Type": "application/json" },
      body: JSON.stringify({ trigger_id: triggerId, view }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const j = (await r.json()) as { ok: boolean };
    return j.ok;
  } catch { return false; }
}
