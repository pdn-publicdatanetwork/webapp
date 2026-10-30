import { NextResponse } from "next/server";
import { EXPEDITEURS, idCourt, lire, lister } from "@/lib/slackMail";
import { publierHome } from "@/lib/slackHome";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Commande Slack /mail : console e-mail (table emails de dataparl-auth,
// même base que le webmail de l'admin). À configurer comme /post :
//   https://www.dataparl.fr/api/slack/mail?t=<MAINTENANCE_TOKEN>
// Usage :
//   /mail                  10 derniers messages reçus
//   /mail entoyes          dossier envoyés
//   /mail corbeille        corbeille
//   /mail <id court>       lire un message (préfixe uuid, ex. 3f2a19b4)
//   /mail envoyer          nouveau message (confirmation par bouton)
//   /mail supprimer <id>   déplacer vers la corbeille (confirmation par bouton)

function heure(iso: string): string {
  try {
    return new Date(iso).toLocaleString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}

export async function POST(req: Request) {
  const attendu = process.env.MAINTENANCE_TOKEN ?? "";
  const u = new URL(req.url);
  const params = new URLSearchParams(await req.text());
  const recu = u.searchParams.get("t") ?? params.get("token") ?? "";
  if (!attendu || recu !== attendu) {
    return NextResponse.json({ text: "Non autorisén" }, { status: 401 });
  }
  const args = (params.get("text") ?? "").trim();
  // Publie le Home tab au passage (repli : l'événement app_home_opened
  // ne suffit pas si l'app n'est pas réinstallée après config).
  const home = await publierHome(params.get("user_id") ?? "");
  const diag = home.ok ? "" : "\n_(diag Home tab : " + home.erreur + ")_";
  const mots = args.split(/\s+/).filter(Boolean);
  const cmd = (mots[0] ?? "").toLowerCase();

  if (cmd === "aide") {
    return NextResponse.json({ text: "📬 /mail : console e-mail :\n• `/mail` : 10 derniers messages reçus\n• `/mail envoyes`, `/mail corbeille`\n• `/mail <id court>` : lire un message\n• `/mail envoyer` : nouveau message (confirmation par bouton avant l'envoi réle)\n• `/mail supprimer <id court>` : déplacer vers la corbeille (confirmation par bouton)" });
  }

  if (!cmd || ["recus", "inbox", "envoyes", "sent", "corbeille", "trash"].includes(cmd)) {
    const dossier = ["envoyes", "sent"].includes(cmd) ? "sent" : ["corbeille", "trash"].includes(cmd) ? "trash" : "inbox";
    const messages = await lister(dossier, 12);
    if (!messages.length) return NextResponse.json({ text: "📭 Dossier " + dossier + " vide." + diag });
    const lignes = messages.map((m) =>
      (m.read ? "• " : "🔴 ") + "`" + idCourt(m.id) + "` " + (dossier === "sent" ? "→ " + m.to_addr : m.from_addr) + " : *" + (m.subject || "(sans objet)") + "* (" + heure(m.date) + ")");
    return NextResponse.json({ text: "📬 " + messages.length + " derniers (" + dossier + ") :\n" + lignes.join("\n") + "\n`/mail <id court>` pour lire un message." + diag });
  }

  if (cmd === "envoyer") {
    const bot = process.env.SLACK_BOT_TOKEN ?? "";
    if (!bot) return NextResponse.json({ text: "SLACK_BOT_TOKEN absente sur Vercel : le formulaire ne peut pas s'ouvrir." });
    const trigger = params.get("trigger_id") ?? "";
    if (!trigger) return NextResponse.json({ text: "Requête invalide (trigger_id)." });
    const modal = {
      trigger_id: trigger,
      view: {
        type: "modal",
        callback_id: "mail_envoi",
        title: { type: "plain_text", text: "Nouveau message" },
        submit: { type: "plain_text", text: "Préparer" },
        close: { type: "plain_text", text: "Annuler" },
        blocks: [
          { type: "input", block_id: "from", element: { type: "static_select", action_id: "v", options: EXPEDITEURS.map((e) => ({ text: { type: "plain_text", text: e }, value: e })) }, label: { type: "plain_text", text: "Expéditeur" } },
          { type: "input", block_id: "a", element: { type: "plain_text_input", action_id: "v", placeholder: { type: "plain_text", text: "destinataire@exemple.fr (plusieurs séparés par des virgules)" } }, label: { type: "plain_text", text: "À" } },
          { type: "input", optional: true, block_id: "cc", element: { type: "plain_text_input", action_id: "v", placeholder: { type: "plain_text", text: "copie@exemple.fr (facultatif)" } }, label: { type: "plain_text", text: "Cc (facultatif)" } },
          { type: "input", block_id: "sujet", element: { type: "plain_text_input", action_id: "v", max_length: 300 }, label: { type: "plain_text", text: "Objet" } },
          { type: "input", block_id: "texte", element: { type: "plain_text_input", action_id: "v", multiline: true, max_length: 1400, placeholder: { type: "plain_text", text: "Le message : un bouton de confirmation s'affichera avant l'envoi réel" } }, label: { type: "plain_text", text: "Message" } },
        ],
      },
    };
    const r = await fetch("https://slack.com/api/views.open", {
      method: "POST",
      headers: { Authorization: "Bearer " + bot, "Content-Type": "application/json" },
      body: JSON.stringify(modal),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const j = (await r.json()) as { ok: boolean; error?: string };
    if (!j.ok) return NextResponse.json({ response_type: "ephemeral", text: "Slack : " + (j.error ?? "le formulaire n'a pas pu s'ouvrir") });
    return new Response(null, { status: 200 });
  }

  if (cmd === "supprimer" && mots[1]) {
    const r = await lire(mots[1]);
    if (!r.ok) return NextResponse.json({ response_type: "ephemeral", text: "⚠️ " + r.erreur });
    const m = r.message;
    return NextResponse.json({ response_type: "ephemeral", blocks: [
      { type: "section", text: { type: "mrkdwn", text: "*Déplacer ce message vers la corbeille ?*\nDe : " + (m.from_addr || "?") + "\nObjet : *" + (m.subject || "(sans objet)") + "* (" + heure(m.date) + ")" } },
      { type: "actions", elements: [
        { type: "button", text: { type: "plain_text", text: "Supprimer" }, style: "danger", action_id: "mail_supprimer_ok", value: m.id },
        { type: "button", text: { type: "plain_text", text: "Annuler" }, action_id: "mail_supprimer_annuler", value: "-" },
      ] },
    ] });
  }

  // Lecture d'un message
  const r = await lire(cmd);
  if (!r.ok) return NextResponse.json({ response_type: "ephemeral", text: "⚠️ " + r.erreur });
  const m = r.message;
  const corps = (m.body_text ?? "").slice(0, 1500);
  return NextResponse.json({ response_type: "ephemeral", text: "📧 *" + (m.subject || "(sans objet)") + "*\nDe : " + (m.from_addr || "?") + " → " + (m.to_addr || "?") + "\n" + heure(m.date) + "\n\n" + (corps || "(corps vide)") + ((m.body_text ?? "").length > 1500 ? "\n\n(tronqué)" : "") });
}
