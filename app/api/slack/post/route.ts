import { NextResponse } from "next/server";
import { publierHome } from "@/lib/slackHome";

export const dynamic = "force-dynamic";

// Commande Slack /post : ouvre un formulaire (modal) qui demande tout —
// destination (facultative), texte, réseaux, mode de publication. À
// configurer comme /maintenance et /stats, même token :
//   https://www.dataparl.fr/api/slack/post?t=<MAINTENANCE_TOKEN>
// Nécessite SLACK_BOT_TOKEN (Bot User OAuth Token de l'app, xoxb-…)
// pour ouvrir le modal, et une Interactivity Request URL :
//   https://www.dataparl.fr/api/slack/interactions?t=<MAINTENANCE_TOKEN>

export async function POST(req: Request) {
  const attendu = process.env.MAINTENANCE_TOKEN ?? "";
  const u = new URL(req.url);
  const params = new URLSearchParams(await req.text());
  const recu = u.searchParams.get("t") ?? params.get("token") ?? "";
  if (!attendu || recu !== attendu) {
    return NextResponse.json({ text: "Non autorisé." }, { status: 401 });
  }
  const bot = process.env.SLACK_BOT_TOKEN ?? "";
  if (!bot) {
    return NextResponse.json({ text: "SLACK_BOT_TOKEN absente sur Vercel : le formulaire /post ne peut pas s'ouvrir." });
  }
  const trigger = params.get("trigger_id") ?? "";
  if (!trigger) return NextResponse.json({ text: "Requête invalide (trigger_id)." });
  // Publie le Home tab au passage (repli sans événement app_home_opened).
  publierHome(params.get("user_id") ?? "").catch(() => {});

  const modal = {
    trigger_id: trigger,
    view: {
      type: "modal",
      callback_id: "post_publication",
      title: { type: "plain_text", text: "Publier sur les réseaux" },
      submit: { type: "plain_text", text: "Publier" },
      close: { type: "plain_text", text: "Annuler" },
      blocks: [
        { type: "input", optional: true, block_id: "destination", element: { type: "plain_text_input", action_id: "v", placeholder: { type: "plain_text", text: "https://www.dataparl.fr/… (vide = texte seul)" } }, label: { type: "plain_text", text: "Page à partager (facultatif — crée les liens tracés)" } },
        { type: "input", block_id: "texte", element: { type: "plain_text_input", action_id: "v", multiline: true, max_length: 500, placeholder: { type: "plain_text", text: "Le texte du post — le lien court est ajouté automatiquement si une page est fournie" } }, label: { type: "plain_text", text: "Texte du post" } },
        { type: "input", block_id: "reseaux", element: { type: "checkboxes", action_id: "v", options: [
          { text: { type: "plain_text", text: "X (Twitter)" }, value: "x" },
          { text: { type: "plain_text", text: "Bluesky" }, value: "bsky" },
        ] }, label: { type: "plain_text", text: "Réseaux (un lien court dédié par réseau est généré si une page est fournie)" } },
        { type: "input", block_id: "mode", element: { type: "radio_buttons", action_id: "v", options: [
          { text: { type: "plain_text", text: "File Buffer (publié selon ton planning)" }, value: "file" },
          { text: { type: "plain_text", text: "Publier immédiatement" }, value: "maintenant" },
          { text: { type: "plain_text", text: "Brouillon dans Buffer (à valider dans Buffer)" }, value: "brouillon" },
        ], initial_option: { text: { type: "plain_text", text: "File Buffer (publié selon ton planning)" }, value: "file" } }, label: { type: "plain_text", text: "Publication" } },
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
  // Réponse vide (corps HTTP vide) : un { text: "" } déclenche
  // « invalid_command_response » côté Slack.
  return new Response(null, { status: 200 });
}
