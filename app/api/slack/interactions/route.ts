import { NextResponse } from "next/server";
import { CODE, destinationValide, genererCode } from "@/lib/liens";
import { authAdmin } from "@/lib/supabaseAdmin";
import { canaux, creerPost, type ModePost } from "@/lib/buffer";
import { envoyerDepuisSlack, supprimer } from "@/lib/slackMail";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Interactivity Request URL de l'app Slack (configurée avec
// ?t=<MAINTENANCE_TOKEN>). Trois usages :
//  - soumission du modal /post (callback post_publication) : codes courts
//    par réseau, liens tracés, posts Buffer, confirmation ;
//  - soumission du modal /mail envoyer (callback mail_envoi) : affiche une
//    confirmation par boutons — l'envoi réel n'a lieu qu'au clic sur
//    « Envoyer · (block_actions) ;
//  - boutons de confirmation suppression mail (block_actions).

function repondre(urlReponse: string, texte: string) {
  if (!urlReponse) return;
  fetch(urlReponse, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ response_type: "in_channel", text: texte }),
    cache: "no-store",
  }).catch(() => {});
}

function valeur(bloc: Record<string, unknown>, action: string): string {
  const e = (bloc as { [k: string]: { value?: string } | undefined })[action];
  return e?.value ?? "";
}

// L'élément d'action (checkboxes) est passé directement : selected_options
// se lit sur lui, pas sur bloc["v"] une seconde fois.
function valeursCochees(element: Record<string, unknown>): string[] {
  const sel = (element as { selected_options?: { value: string }[] }).selected_options;
  return (sel ?? []).map((o) => o.value);
}

// Slug lisible depuis la destination (dernier segment du chemin).
function slugDe(destination: string): string {
  try {
    const chemin = new URL(destination).pathname.replace(/\/$/, "");
    const segments = chemin.split("/").filter(Boolean);
    let slug = (segments.at(-1) ?? "partage").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30);
    if (!slug) slug = "partage";
    return slug;
  } catch { return "partage"; }
}

export async function POST(req: Request) {
  const attendu = process.env.MAINTENANCE_TOKEN ?? "";
  const u = new URL(req.url);
  if (!attendu || u.searchParams.get("t") !== attendu) {
    return NextResponse.json({ text: "Non autorisé." }, { status: 401 });
  }
  const corps = new URLSearchParams(await req.text());
  const charge = JSON.parse(corps.get("payload") ?? "{}") as {
    type?: string;
    view?: { callback_id?: string; state?: { values?: Record<string, Record<string, unknown>> } };
    response_url?: string;
    user?: { name?: string };
    actions?: { action_id?: string; value?: string }[];
  };

  // Boutons de confirmation (mail) : c'est ici que l'action réelle a lieu.
  if (charge.type === "block_actions") {
    const act = charge.actions?.[0];
    if (!act) return NextResponse.json({});
    if (act.action_id === "mail_envoyer_ok") {
      let d: { f?: string; a?: string[]; s?: string; t?: string } = {};
      try { d = JSON.parse(act.value ?? "{}"); } catch { return NextResponse.json({ text: "Brouillon illisible — annulé.", replace_original: true }); }
      const r = await envoyerDepuisSlack(charge.user?.name ?? "slack", { from: d.f ?? "", a: d.a ?? [], sujet: d.s ?? "", texte: d.t ?? "" });
      return NextResponse.json({ text: r.ok ? "✅ Envoyé à " + (d.a ?? []).join(", ") : "⚠️ " + r.erreur, replace_original: true });
    }
    if (act.action_id === "mail_envoyer_annuler") return NextResponse.json({ text: "Annulé — rien n'a été envoyé.", replace_original: true });
    if (act.action_id === "mail_supprimer_ok") {
      const err = await supprimer(act.value ?? "");
      return NextResponse.json({ text: err ? "⚠️ " + err : "🗑️ Message déplacé vers la corbeille.", replace_original: true });
    }
    if (act.action_id === "mail_supprimer_annuler") return NextResponse.json({ text: "Annulé — rien n'a été supprimé.", replace_original: true });
    return NextResponse.json({});
  }

  if (charge.type !== "view_submission") return NextResponse.json({});
  const v = charge.view?.state?.values ?? {};
  const urlReponse = charge.response_url ?? "";
  const qui = charge.user?.name ?? "slack";

  // --- /mail envoyer : vérifie puis affiche la confirmation par boutons ---
  if (charge.view?.callback_id === "mail_envoi") {
    const from = String((v.from?.v as { selected_option?: { value: string } })?.selected_option?.value ?? "");
    const aListe = String((v.a?.v as { value?: string })?.value ?? "").split(/[;,]/).map((x) => x.trim()).filter(Boolean);
    const sujet = String((v.sujet?.v as { value?: string })?.value ?? "").trim().slice(0, 300);
    const texte = String((v.texte?.v as { value?: string })?.value ?? "").trim();
    const erreurs: Record<string, string> = {};
    if (!from) erreurs.from = "Choisis un expéditeur.";
    if (!aListe.length) erreurs.a = "Au moins un destinataire.";
    if (!aListe.every((x) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x))) erreurs.a = "Destinataire invalide.";
    if (!sujet) erreurs.sujet = "L'objet est vide.";
    if (!texte) erreurs.texte = "Le message est vide.";
    if (Object.keys(erreurs).length) return NextResponse.json({ response_action: "errors", errors: erreurs });

    const draft = JSON.stringify({ f: from, a: aListe, s: sujet, t: texte.slice(0, 1400) });
    if (draft.length > 2000) return NextResponse.json({ response_action: "errors", errors: { texte: "Message trop long pour la confirmation Slack." } });
    if (urlReponse) {
      fetch(urlReponse, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          response_type: "ephemeral",
          blocks: [
            { type: "section", text: { type: "mrkdwn", text: "*Confirmer l'envoi ?*\nDe : `" + from + "`\nÀ : " + aListe.join(", ") + "\nObjet : *" + sujet + "*" } },
            { type: "section", text: { type: "mrkdwn", text: "```" + texte.slice(0, 800) + (texte.length > 800 ? "\n…" : "") + "```" } },
            { type: "actions", elements: [
              { type: "button", text: { type: "plain_text", text: "Envoyer ✅" }, style: "primary", action_id: "mail_envoyer_ok", value: draft },
              { type: "button", text: { type: "plain_text", text: "Annuler" }, action_id: "mail_envoyer_annuler", value: "-" },
            ] },
          ],
        }),
        cache: "no-store",
      }).catch(() => {});
    }
    return NextResponse.json({ response_action: "clear" });
  }

  if (charge.view?.callback_id !== "post_publication") {
    return NextResponse.json({});
  }

  // --- /post : publication réseaux ---
  const destinationBrut = String((v.destination?.v as { value?: string })?.value ?? "").trim();
  const destination = destinationBrut ? destinationValide(destinationBrut) : null;
  const texte = String((v.texte?.v as { value?: string })?.value ?? "").trim();
  const reseaux = valeursCochees((v.reseaux?.v ?? {}) as Record<string, unknown>);
  const mode = (valeur((v.mode?.v ?? {}) as Record<string, unknown>, "v") || "file") as ModePost;

  if (destinationBrut && !destination) {
    return NextResponse.json({ response_action: "errors", errors: { destination: "Adresse https invalide." } });
  }
  if (!texte) {
    return NextResponse.json({ response_action: "errors", errors: { texte: "Le texte du post est vide." } });
  }
  if (!reseaux.length) {
    return NextResponse.json({ response_action: "errors", errors: { reseaux: "Choisis au moins un réseau." } });
  }

  // Code court par réseau : <slug>-x, <slug>-bsky (déjà suivi si collision).
  // Sans destination, aucun lien n'est créé (post texte seul).
  const db = authAdmin();
  const base = destination ? slugDe(destination) : "";
  const codeDe = async (suffixe: string) => {
    for (let i = 0; i < 5; i++) {
      const code = (base + "-" + suffixe + (i ? "-" + genererCode(3) : "")).slice(0, 40);
      if (!CODE.test(code)) continue;
      const { data: existe } = await db.from("liens").select("code").eq("code", code).maybeSingle();
      if (!existe) return code;
    }
    return base + "-" + suffixe + "-" + genererCode(6);
  };

  try {
    const lignes: { code: string | null; suffixe: string }[] = [];
    for (const r of reseaux) {
      if (!destination) {
        lignes.push({ code: null, suffixe: r });
        continue;
      }
      const code = await codeDe(r);
      const { error } = await db.from("liens").insert({ code, destination, titre: texte.slice(0, 200), actif: true });
      if (error) throw new Error("Table liens : " + error.message);
      lignes.push({ code, suffixe: r });
    }

    // Buffer : un post par réseau, avec SON lien court (tracking dédié).
    const resultats: string[] = [];
    const canauxDispo = await canaux();
    for (const { code, suffixe } of lignes) {
      const service = suffixe === "x" ? "twitter" : "bluesky";
      const canal = canauxDispo.find((c) => c.service === service);
      const nomReseau = suffixe === "x" ? "X" : "Bluesky";
      if (!canal) {
        resultats.push("⚠️ " + nomReseau + " : aucun canal connecté dans Buffer (publish.buffer.com → Connect Channel)" + (code ? " — lien créé : https://link.dataparl.fr/" + code : ""));
        continue;
      }
      const lienCourt = code ? "https://link.dataparl.fr/" + code : "";
      const p = await creerPost(canal.id, code ? texte + "\n" + lienCourt : texte, mode);
      resultats.push(("id" in p ? "✅" : "⚠️") + " " + nomReseau + " : " + ("id" in p ? (mode === "maintenant" ? "publié" : mode === "brouillon" ? "brouillon créé dans Buffer" : "ajouté à la file Buffer") : "erreur : " + p.erreur) + (lienCourt ? " — " + lienCourt : " (sans lien tracé)"));
    }

    repondre(urlReponse, "📣 Post envoyé par " + qui + " :\n" + resultats.join("\n") + (destination ? "\nDestination : " + destination : "\n(sans lien tracé)"));
    return NextResponse.json({ response_action: "clear" });
  } catch (e) {
    repondre(urlReponse, "Erreur /post : " + (e instanceof Error ? e.message : String(e)));
    return NextResponse.json({ response_action: "errors", errors: { texte: "Erreur : " + (e instanceof Error ? e.message : String(e)) } });
  }
}
