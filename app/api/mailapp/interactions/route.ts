import { NextResponse } from "next/server";
import { compterDossiers, envoyerDepuisSlack, lister, lire, supprimer } from "@/lib/slackMail";
import { modalBoite, modalEnvoi, TAILLE_PAGE_MAIL, vueMessage } from "@/lib/slackHome";
import { ouvrirModal, publierHomeMail } from "@/lib/mailappClient";
import { homeMailVue } from "@/lib/mailappViews";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Interactivity Request URL de l'app dédiée « DataParl Mail »
// (?t=<MAINTENANCE_TOKEN>). Toute la messagerie @dataparl.fr : dossiers,
// lecture, réponse, transfert, corbeille (liste rafraîchie après chaque
// suppression) et envoi avec confirmation.

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function vueResultat(texte: string) {
  return { type: "modal", callback_id: "resultat", title: { type: "plain_text", text: "Résultat" },
    close: { type: "plain_text", text: "Fermer" },
    blocks: [{ type: "section", text: { type: "mrkdwn", text: texte } }] };
}

function vueConfirmation(draft: string, from: string, aListe: string[], ccListe: string[], sujet: string, texte: string) {
  const lignes = "*Confirmer l'envoi ?*\nDe : `" + from + "`\nÀ : " + aListe.join(", ") + (ccListe.length ? "\nCc : " + ccListe.join(", ") : "") + "\nObjet : *" + sujet + "*";
  return { type: "modal", callback_id: "mail_confirme",
    title: { type: "plain_text", text: "Confirmer l'envoi" },
    close: { type: "plain_text", text: "Annuler" },
    blocks: [
      { type: "section", text: { type: "mrkdwn", text: lignes } },
      { type: "section", text: { type: "mrkdwn", text: "```" + texte.slice(0, 800) + (texte.length > 800 ? "\n…" : "") + "```" } },
      { type: "actions", elements: [
        { type: "button", text: { type: "plain_text", text: "Envoyer" }, style: "primary", action_id: "mail_envoyer_ok", value: draft },
        { type: "button", text: { type: "plain_text", text: "Annuler" }, action_id: "mail_envoyer_annuler", value: "-" },
      ] },
    ] };
}

// Boîte e-mail avec compteurs et page demandée (pagination).
async function modalBoitePage(dossier: string, page: number) {
  const dossiers = await compterDossiers();
  const total = dossier === "sent" ? dossiers.sent : dossier === "trash" ? dossiers.trash : dossiers.inbox;
  const messages = await lister(dossier, TAILLE_PAGE_MAIL, Math.max(0, page) * TAILLE_PAGE_MAIL);
  return modalBoite(dossier, Math.max(0, page), messages, dossiers.nonLus, total);
}

// Dossier et page courants depuis le private_metadata de la vue ouverte.
function dossierPage(meta: string | undefined): { dossier: string; page: number } {
  try {
    const m = JSON.parse(meta ?? "{}") as { dossier?: string; page?: number };
    return { dossier: m.dossier ?? "inbox", page: typeof m.page === "number" ? m.page : 0 };
  } catch { return { dossier: "inbox", page: 0 }; }
}

// Marque un rafraîchissement du Home tab (bouton 🔄, après suppression).
async function rafraichirHome(userId: string | undefined) {
  if (!userId) return;
  await publierHomeMail(userId, await homeMailVue());
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
    view?: { callback_id?: string; private_metadata?: string; state?: { values?: Record<string, Record<string, unknown>> } };
    trigger_id?: string;
    user?: { name?: string; id?: string };
    actions?: { action_id?: string; value?: string }[];
  };

  if (charge.type === "block_actions") {
    const act = charge.actions?.[0];
    if (!act) return NextResponse.json({});
    const trigger = charge.trigger_id ?? "";

    if (act.action_id === "home_refresh") {
      await rafraichirHome(charge.user?.id);
      return NextResponse.json({});
    }
    if (act.action_id === "home_mail_nouveau") { await ouvrirModal(modalEnvoi(), trigger); return NextResponse.json({}); }
    if (act.action_id === "home_mail_inbox") { await ouvrirModal(await modalBoitePage("inbox", 0), trigger); return NextResponse.json({}); }
    if (act.action_id === "home_mail_envoyes") { await ouvrirModal(await modalBoitePage("sent", 0), trigger); return NextResponse.json({}); }
    if (act.action_id === "home_mail_corbeille") { await ouvrirModal(await modalBoitePage("trash", 0), trigger); return NextResponse.json({}); }

    if (act.action_id === "mail_page") {
      const morceaux = (act.value ?? "").split(":");
      const vue = await modalBoitePage(morceaux[0] ?? "inbox", Number(morceaux[1] ?? "0") || 0);
      if (charge.view) return NextResponse.json({ response_action: "update", view: vue });
      await ouvrirModal(vue, trigger);
      return NextResponse.json({});
    }

    if (act.action_id === "mail_lire" || act.action_id === "mail_notif_lire") {
      const r = await lire(act.value ?? "");
      if (!r.ok) {
        const echec = vueResultat("⚠️ " + r.erreur);
        if (charge.view) return NextResponse.json({ response_action: "update", view: echec });
        await ouvrirModal(echec, trigger);
        return NextResponse.json({});
      }
      const vue = vueMessage(r.message);
      const dp = dossierPage(charge.view?.private_metadata);
      vue.private_metadata = JSON.stringify(dp);
      if (charge.view) return NextResponse.json({ response_action: "update", view: vue });
      await ouvrirModal(vue, trigger);
      return NextResponse.json({});
    }

    if (act.action_id === "mail_repondre" || act.action_id === "mail_transferer") {
      const r = await lire(act.value ?? "");
      if (!r.ok) {
        const echec = vueResultat("⚠️ " + r.erreur);
        if (charge.view) return NextResponse.json({ response_action: "update", view: echec });
        await ouvrirModal(echec, trigger);
        return NextResponse.json({});
      }
      const m = r.message;
      const reponse = act.action_id === "mail_repondre";
      const a = reponse ? (m.direction === "in" ? m.from_addr : m.to_addr).slice(0, 150) : "";
      const sujetBrut = m.subject || "";
      const sujet = (reponse ? (/^re\s*:/i.test(sujetBrut) ? sujetBrut : "Re: " + sujetBrut) : (/^fwd?\s*:/i.test(sujetBrut) ? sujetBrut : "Fw: " + sujetBrut)).slice(0, 300);
      const corps = (m.body_text ?? "").trim();
      const texte = (reponse ? "" : "(transfert d'un message " + (m.direction === "in" ? "reçu" : "envoyé") + ")\n\n") + corps.slice(0, reponse ? 500 : 700);
      const vue = modalEnvoi({ a, sujet, texte });
      const dp = dossierPage(charge.view?.private_metadata);
      vue.private_metadata = JSON.stringify(dp);
      await ouvrirModal(vue, trigger);
      return NextResponse.json({});
    }

    if (act.action_id === "mail_supprimer_ok") {
      const err = await supprimer(act.value ?? "");
      if (err) {
        const echec = vueResultat("⚠️ " + err);
        if (charge.view) return NextResponse.json({ response_action: "update", view: echec });
        return NextResponse.json({ text: "⚠️ " + err, replace_original: true });
      }
      // Succès : la liste se rafraîchit immédiatement, le Home aussi.
      const dp = dossierPage(charge.view?.private_metadata);
      await rafraichirHome(charge.user?.id);
      if (charge.view) return NextResponse.json({ response_action: "update", view: await modalBoitePage(dp.dossier, dp.page) });
      return NextResponse.json({ text: "🗑️ Message déplacé vers la corbeille.", replace_original: true });
    }
    if (act.action_id === "mail_supprimer_annuler") {
      if (charge.view) return NextResponse.json({ response_action: "update", view: vueResultat("Annulé : rien n'a été supprimé.") });
      return NextResponse.json({ text: "Annulé : rien n'a été supprimé.", replace_original: true });
    }

    if (act.action_id === "mail_envoyer_ok") {
      let d: { f?: string; a?: string[]; c?: string[]; s?: string; t?: string } = {};
      try { d = JSON.parse(act.value ?? "{}"); } catch { return NextResponse.json({ response_action: "update", view: vueResultat("Brouillon illisible : annulé.") }); }
      const r = await envoyerDepuisSlack(charge.user?.name ?? "slack", { from: d.f ?? "", a: d.a ?? [], cc: d.c ?? [], sujet: d.s ?? "", texte: d.t ?? "" });
      const resultat = r.ok ? "✅ Envoyé à " + (d.a ?? []).join(", ") : "⚠️ " + r.erreur;
      if (charge.view) return NextResponse.json({ response_action: "update", view: vueResultat(resultat) });
      return NextResponse.json({ text: resultat, replace_original: true });
    }
    if (act.action_id === "mail_envoyer_annuler") {
      if (charge.view) return NextResponse.json({ response_action: "update", view: vueResultat("Annulé : rien n'a été envoyé.") });
      return NextResponse.json({ text: "Annulé : rien n'a été envoyé.", replace_original: true });
    }
    return NextResponse.json({});
  }

  if (charge.type !== "view_submission") return NextResponse.json({});
  if (charge.view?.callback_id !== "mail_envoi") return NextResponse.json({});
  const v = charge.view.state?.values ?? {};
  const from = String((v.from?.v as { selected_option?: { value: string } })?.selected_option?.value ?? "");
  const aListe = String((v.a?.v as { value?: string })?.value ?? "").split(/[;,]/).map((x) => x.trim()).filter(Boolean);
  const ccListe = String((v.cc?.v as { value?: string })?.value ?? "").split(/[;,]/).map((x) => x.trim()).filter(Boolean);
  const sujet = String((v.sujet?.v as { value?: string })?.value ?? "").trim().slice(0, 300);
  const texte = String((v.texte?.v as { value?: string })?.value ?? "").trim();
  const erreurs: Record<string, string> = {};
  if (!from) erreurs.from = "Choisis un expéditeur.";
  if (!aListe.length) erreurs.a = "Au moins un destinataire.";
  if (!aListe.every((x) => EMAIL_RE.test(x))) erreurs.a = "Destinataire invalide.";
  if (ccListe.length && !ccListe.every((x) => EMAIL_RE.test(x))) erreurs.cc = "Adresse Cc invalide.";
  if (!sujet) erreurs.sujet = "L'objet est vide.";
  if (!texte) erreurs.texte = "Le message est vide.";
  if (Object.keys(erreurs).length) return NextResponse.json({ response_action: "errors", errors: erreurs });

  const draft = JSON.stringify({ f: from, a: aListe, c: ccListe, s: sujet, t: texte.slice(0, 1400) });
  if (draft.length > 2900) return NextResponse.json({ response_action: "errors", errors: { texte: "Message trop long pour la confirmation Slack." } });
  return NextResponse.json({ response_action: "update", view: vueConfirmation(draft, from, aListe, ccListe, sujet, texte) });
}
