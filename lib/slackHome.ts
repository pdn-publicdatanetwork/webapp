import "server-only";
import { lireMaintenance } from "./maintenanceAdmin";
import { EXPEDITEURS, compterDossiers, lister, idCourt } from "./slackMail";
import type { MessageComplet, MessageCourt } from "./slackMail";
import { compteAssoc } from "./slackAssoc";

// Home tab de l'app Slack « DataParl' Console » : une vraie interface avec
// des sections (Site, Données, Associations, CRM, Publication, E-mail) et
// des boutons, à la place des seules slash commands. Publiée par views.publish
// à l'ouverture (événement app_home_opened → /api/slack/events) et rafraîchie
// après chaque action.
// Le lecteur e-mail : dossiers reçus/envoyés/corbeille avec non-lus et
// pagination, message complet avec répondre/transférer pré-rempli.

type Bloc = Record<string, unknown>;

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

// Modal d'envoi : pré-remplissable (répondre, transférer depuis le lecteur).
export function modalEnvoi(prefill?: { from?: string; a?: string; sujet?: string; texte?: string }): Record<string, unknown> {
  const a = (prefill?.a ?? "").trim().slice(0, 150);
  const sujet = (prefill?.sujet ?? "").trim().slice(0, 300);
  const texte = (prefill?.texte ?? "").trim().slice(0, 1400);
  const options = EXPEDITEURS.map((e) => ({ text: { type: "plain_text", text: e }, value: e }));
  const fromInit = prefill?.from && EXPEDITEURS.includes(prefill.from)
    ? { initial_option: { text: { type: "plain_text", text: prefill.from }, value: prefill.from } }
    : {};
  const texteElement: Record<string, unknown> = { type: "plain_text_input", action_id: "v", multiline: true, max_length: 1400, placeholder: { type: "plain_text", text: "Le message : une confirmation s'affichera avant l'envoi réel" } };
  if (texte) texteElement.initial_value = texte;
  const aElement: Record<string, unknown> = { type: "plain_text_input", action_id: "v", placeholder: { type: "plain_text", text: "destinataire@exemple.fr (plusieurs séparés par des virgules)" } };
  if (a) aElement.initial_value = a;
  const sujetElement: Record<string, unknown> = { type: "plain_text_input", action_id: "v", max_length: 300 };
  if (sujet) sujetElement.initial_value = sujet;
  return {
    type: "modal", callback_id: "mail_envoi",
    title: { type: "plain_text", text: a ? "Répondre / transférer" : "Nouveau message" },
    submit: { type: "plain_text", text: "Préparer" },
    close: { type: "plain_text", text: "Annuler" },
    blocks: [
      { type: "input", block_id: "from", element: { type: "static_select", action_id: "v", options, ...fromInit }, label: { type: "plain_text", text: "Expéditeur" } },
      { type: "input", block_id: "a", element: aElement, label: { type: "plain_text", text: "À" } },
      { type: "input", optional: true, block_id: "cc", element: { type: "plain_text_input", action_id: "v", placeholder: { type: "plain_text", text: "copie@exemple.fr (facultatif, virgules acceptées)" } }, label: { type: "plain_text", text: "Cc (facultatif)" } },
      { type: "input", block_id: "sujet", element: sujetElement, label: { type: "plain_text", text: "Objet" } },
      { type: "input", block_id: "texte", element: texteElement, label: { type: "plain_text", text: "Message" } },
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

export const TAILLE_PAGE_MAIL = 10;

const LIBELLE_DOSSIER: Record<string, string> = { inbox: "Boîte de réception", sent: "Envoyés", trash: "Corbeille" };

// Vue d'un dossier : messages avec non-lus, bouton Lire par ligne,
// pagination. total = nombre de messages du dossier (pour les pages).
export function modalBoite(dossier: string, page: number, messages: MessageCourt[], nonLus: number, total: number): Record<string, unknown> {
  const pages = Math.max(1, Math.ceil(total / TAILLE_PAGE_MAIL));
  const blocs: Bloc[] = [
    { type: "header", text: { type: "plain_text", text: LIBELLE_DOSSIER[dossier] ?? dossier, emoji: true } },
    { type: "section", text: { type: "mrkdwn", text: (dossier === "inbox" && nonLus ? "🔴 " + nonLus + " non lu(s) — " : "") + total.toLocaleString("fr-FR") + " message(s)" } },
  ];
  if (!messages.length) {
    blocs.push({ type: "section", text: { type: "mrkdwn", text: "📭 Ce dossier est vide." } });
  }
  messages.forEach((m) => {
    const exp = dossier === "sent" ? "→ " + m.to_addr : m.from_addr;
    const etat = m.read ? "• " : "🔴 ";
    blocs.push({ type: "section", text: { type: "mrkdwn", text: etat + "`" + idCourt(m.id) + "` " + exp + " : *" + (m.subject || "(sans objet)") + "* (" + heure(m.date) + ")" } });
    blocs.push({ type: "actions", elements: [
      { type: "button", text: { type: "plain_text", text: "📖 Lire" }, action_id: "mail_lire", value: idCourt(m.id) },
      { type: "button", text: { type: "plain_text", text: "🗑" }, style: "danger", action_id: "mail_supprimer_ok", value: idCourt(m.id),
        confirm: { title: { type: "plain_text", text: "Corbeille ?" }, text: { type: "plain_text", text: "Le message sera déplacé vers la corbeille du webmail." }, confirm: { type: "plain_text", text: "Corbeille" }, deny: { type: "plain_text", text: "Annuler" }, style: "danger" } },
    ] });
  });
  if (pages > 1) {
    const elements: Bloc[] = [];
    if (page > 0) elements.push({ type: "button", text: { type: "plain_text", text: "◀️ Page " + page }, action_id: "mail_page", value: dossier + ":" + (page - 1) });
    if (page < pages - 1) elements.push({ type: "button", text: { type: "plain_text", text: "Page " + (page + 2) + " ▶️" }, action_id: "mail_page", value: dossier + ":" + (page + 1) });
    if (elements.length) blocs.push({ type: "actions", elements: elements as unknown[] });
  }
  blocs.push({ type: "context", elements: [{ type: "mrkdwn", text: "Page " + (page + 1) + "/" + pages + ". Le bouton Lire marque le message comme lu (même base que le webmail de l'admin)." }] });
  return { type: "modal", callback_id: "boite_mail", private_metadata: JSON.stringify({ dossier, page }), title: { type: "plain_text", text: (LIBELLE_DOSSIER[dossier] ?? dossier).slice(0, 24) }, close: { type: "plain_text", text: "Fermer" }, blocks: blocs };
}

// Vue d'un message complet : en-têtes, corps, pièces jointes, actions
// répondre / transférer / corbeille.
export function vueMessage(m: MessageComplet): Record<string, unknown> {
  const echappe = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const corpsBrut = (m.body_text ?? "").trim();
  const tronque = corpsBrut.length > 2400;
  const corps = corpsBrut ? echappe(corpsBrut.slice(0, 2400)) + (tronque ? "\n\n(corps tronqué : version complète dans le webmail de l'admin)" : "") : "_Corps indisponible pour l'instant (rappel Resend non récupéré). Version complète dans le webmail de l'admin._";
  const pieces = (m.attachments ?? []).map((p) => (p.filename ?? "pièce jointe")).slice(0, 5).join(", ");
  const blocs: Bloc[] = [
    { type: "header", text: { type: "plain_text", text: "Message", emoji: true } },
    { type: "section", text: { type: "mrkdwn", text: "*" + echappe(m.subject || "(sans objet)") + "*\n" + (m.direction === "in" ? "De : " + m.from_addr + "\nPour : " + m.to_addr : "De : " + m.from_addr + " → " + m.to_addr) + (m.cc_addr ? "\nCc : " + m.cc_addr : "") + "\n" + heure(m.date) + (pieces ? "\n📎 " + pieces : "") } },
    { type: "section", text: { type: "mrkdwn", text: corps } },
    { type: "actions", elements: [
      { type: "button", text: { type: "plain_text", text: "↩️ Répondre" }, style: "primary", action_id: "mail_repondre", value: idCourt(m.id) },
      { type: "button", text: { type: "plain_text", text: "↪️ Transférer" }, action_id: "mail_transferer", value: idCourt(m.id) },
      { type: "button", text: { type: "plain_text", text: "🗑 Corbeille" }, style: "danger", action_id: "mail_supprimer_ok", value: idCourt(m.id),
        confirm: { title: { type: "plain_text", text: "Corbeille ?" }, text: { type: "plain_text", text: "Le message sera déplacé vers la corbeille du webmail." }, confirm: { type: "plain_text", text: "Corbeille" }, deny: { type: "plain_text", text: "Annuler" }, style: "danger" } },
    ] },
    { type: "context", elements: [{ type: "mrkdwn", text: "Ouvert depuis la console Slack : marqué lu, partagé avec le webmail de l'admin. `" + idCourt(m.id) + "` pour /mail." }] },
  ];
  return { type: "modal", callback_id: "resultat", title: { type: "plain_text", text: "Message" }, close: { type: "plain_text", text: "Fermer" }, blocks: blocs };
}

// Publie (ou rafraîchit) le Home tab de l'utilisateur. L'e-mail affiche le
// compteur de non-lus (rafraîchi à chaque ouverture de l'onglet).
export async function publierHome(userId: string): Promise<{ ok: boolean; erreur: string }> {
  const bot = process.env.SLACK_BOT_TOKEN ?? "";
  if (!bot || !userId) return { ok: false, erreur: "SLACK_BOT_TOKEN ou user_id absent" };
  const etat = await lireMaintenance().catch(() => null);
  const nAssoc = await compteAssoc().catch(() => 0);
  const dossiers = await compterDossiers().catch(() => null);
  const boutonsSite: Record<string, unknown>[] = etat?.active
    ? [{ type: "button", text: { type: "plain_text", text: "🟢 Rétablir le site" }, style: "primary", action_id: "home_maintenance_off" }]
    : [{ type: "button", text: { type: "plain_text", text: "🔴 Basculer en maintenance" }, style: "danger", action_id: "home_maintenance_on" }];
  const texteMail = dossiers
    ? (dossiers.nonLus ? "🔴 " + dossiers.nonLus.toLocaleString("fr-FR") + " non lu(s)" : "Aucun message non lu") + "\n" + dossiers.inbox.toLocaleString("fr-FR") + " reçu(s), " + dossiers.sent.toLocaleString("fr-FR") + " envoyé(s), corbeille " + dossiers.trash.toLocaleString("fr-FR")
    : "Dossiers momentanément indisponibles";
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
      { type: "section", text: { type: "mrkdwn", text: "*✉️ E-mail*\n" + texteMail } },
      { type: "actions", elements: [
        { type: "button", text: { type: "plain_text", text: "📥 Reçus" }, style: "primary", action_id: "home_mail_inbox" },
        { type: "button", text: { type: "plain_text", text: "✍️ Nouveau message" }, action_id: "home_mail_nouveau" },
      ] },
      { type: "actions", elements: [
        { type: "button", text: { type: "plain_text", text: "📤 Envoyés" }, action_id: "home_mail_envoyes" },
        { type: "button", text: { type: "plain_text", text: "🗑 Corbeille" }, action_id: "home_mail_corbeille" },
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
