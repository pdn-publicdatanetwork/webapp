import { NextResponse } from "next/server";
import { CODE, destinationValide, genererCode } from "@/lib/liens";
import { authAdmin } from "@/lib/supabaseAdmin";
import { canaux, creerPost, type ModePost } from "@/lib/buffer";
import { compterDossiers, envoyerDepuisSlack, lister, lire, supprimer } from "@/lib/slackMail";
import { modalBoite, modalEnvoi, modalPost, modalRechercheCompte, ouvrirModal, publierHome, TAILLE_PAGE_MAIL, vueMessage } from "@/lib/slackHome";
import { basculeMaintenance } from "@/lib/maintenanceAdmin";
import { blocsStats, collecterStats } from "@/lib/slackStats";
import { abonnes, cles, comptes, enquete, fiche, inviterEnquete, telechargements } from "@/lib/slackData";
import { blocsAssoc, blocsCvAssoc, blocsJournalAssoc, deciderDepuisSlack } from "@/lib/slackAssoc";
import { crmCourant, ficheCrm, majCrm, modalRechercheCrm, modalSuivi } from "@/lib/slackCrm";
import { blocsPub, collecterPub, modalSaisiePub, saisirPub } from "@/lib/slackPub";
import { sources } from "@/lib/slackSources";
import { supprimerLigne } from "@/lib/slackSuppression";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Interactivity Request URL de l'app Slack (?t=<MAINTENANCE_TOKEN>) :
//  - soumissions des modals /post, /mail envoyer, maintenance, pub (Home tab) ;
//  - boutons de confirmation d'envoi et de suppression (block_actions) ;
//  - boutons du Home tab (home_*) qui ouvrent les modals : Données (listes
//    avec suppression des lignes de test), Associations (file, CV, journal,
//    décisions, suppression d'une ligne de journal), CRM (fiche, suivi,
//    suppression du suivi), Publication (posts, pub/vidéos/revenus,
//    sources de trafic).

function repondre(urlReponse: string, corps: string) {
  if (!urlReponse) return;
  fetch(urlReponse, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ response_type: "in_channel", text: corps }),
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
    let slug = (segments.at(-1) ?? "partage").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+/, "").replace(/-+$/, "").slice(0, 30);
    if (!slug) slug = "partage";
    return slug;
  } catch { return "partage"; }
}

// Petite vue de résultat affichée dans un modal après un clic bouton.
function vueResultat(texte: string) {
  return { type: "modal", callback_id: "resultat", title: { type: "plain_text", text: "Résultat" },
    close: { type: "plain_text", text: "Fermer" },
    blocks: [{ type: "section", text: { type: "mrkdwn", text: texte } }] };
}

// Vue de données (sections Données / Associations / CRM du Home tab) :
// blocs de lib/slackData, slackAssoc, slackCrm, slackPub, slackSources.
function vueDonnees(titre: string, blocs: Record<string, unknown>[]) {
  return { type: "modal", callback_id: "resultat", title: { type: "plain_text", text: titre.slice(0, 24) }, close: { type: "plain_text", text: "Fermer" }, blocks: blocs };
}

// Confirmation d'envoi : modal avec boutons, affiché dans le modal courant.
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

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Vue d'un dossier e-mail avec compteurs et page demandée (pagination).
async function modalBoitePage(dossier: string, page: number) {
  const dossiers = await compterDossiers();
  const total = dossier === "sent" ? dossiers.sent : dossier === "trash" ? dossiers.trash : dossiers.inbox;
  const messages = await lister(dossier, TAILLE_PAGE_MAIL, Math.max(0, page) * TAILLE_PAGE_MAIL);
  return modalBoite(dossier, Math.max(0, page), messages, dossiers.nonLus, total);
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
    response_url?: string; trigger_id?: string;
    user?: { name?: string; id?: string };
    actions?: { action_id?: string; value?: string }[];
  };

  // Boutons de confirmation et du Home tab (block_actions).
  if (charge.type === "block_actions") {
    const act = charge.actions?.[0];
    if (!act) return NextResponse.json({});
    const trigger = charge.trigger_id ?? "";

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
    if (act.action_id === "mail_supprimer_ok") {
      const err = await supprimer(act.value ?? "");
      if (err) {
        const echec = vueResultat("⚠️ " + err);
        if (charge.view) return NextResponse.json({ response_action: "update", view: echec });
        return NextResponse.json({ text: "⚠️ " + err, replace_original: true });
      }
      // Succès : on rafraîchit la liste au lieu d'afficher un simple message.
      let dossier = "inbox";
      let page = 0;
      try {
        const meta = JSON.parse(charge.view?.private_metadata ?? "{}") as { dossier?: string; page?: number };
        if (meta.dossier) dossier = meta.dossier;
        if (typeof meta.page === "number") page = meta.page;
      } catch { /* métadonnée illisible : boîte de réception */ }
      if (charge.view) return NextResponse.json({ response_action: "update", view: await modalBoitePage(dossier, page) });
      return NextResponse.json({ text: "🗑️ Message déplacé vers la corbeille.", replace_original: true });
    }
    if (act.action_id === "mail_supprimer_annuler") {
      if (charge.view) return NextResponse.json({ response_action: "update", view: vueResultat("Annulé : rien n'a été supprimé.") });
      return NextResponse.json({ text: "Annulé : rien n'a été supprimé.", replace_original: true });
    }

    // Suppression d'une ligne (listes de données, journal, suivi CRM) :
    // confirmation déjà donnée par le dialogue Slack du bouton.
    if (act.action_id === "supprimer_ligne") {
      const r = await supprimerLigne(charge.user?.name ?? "slack", act.value ?? "");
      const msg = r.ok ? r.message : "⚠️ " + r.erreur;
      if (charge.view) return NextResponse.json({ response_action: "update", view: vueResultat(msg) });
      return NextResponse.json({ text: msg, replace_original: true });
    }
    // Enquête : renvoyer l'invitation à une personne sans réponse.
    if (act.action_id === "enquete_inviter") {
      const r = await inviterEnquete(charge.user?.name ?? "slack", act.value ?? "");
      const msg = r.ok ? r.message : "⚠️ " + r.erreur;
      if (charge.view) return NextResponse.json({ response_action: "update", view: vueResultat(msg) });
      return NextResponse.json({ text: msg, replace_original: true });
    }

    // Home tab : boutons qui ouvrent les modals.
    if (act.action_id === "home_post") { await ouvrirModal(modalPost(), trigger); return NextResponse.json({}); }
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
      await ouvrirModal(modalEnvoi({ a, sujet, texte }), trigger);
      return NextResponse.json({});
    }
    if (act.action_id === "home_stats") {
      const s = await collecterStats();
      await ouvrirModal({ type: "modal", callback_id: "resultat", title: { type: "plain_text", text: "Statistiques" }, close: { type: "plain_text", text: "Fermer" }, blocks: blocsStats(s) }, trigger);
      return NextResponse.json({});
    }
    // Home tab : section Données (listes avec suppression des lignes de test).
    if (act.action_id === "home_data_users") { await ouvrirModal(vueDonnees("Comptes", await comptes(Number(act.value ?? "0") || 0)), trigger); return NextResponse.json({}); }
    if (act.action_id === "home_data_recherche") { await ouvrirModal(modalRechercheCompte(), trigger); return NextResponse.json({}); }
    if (act.action_id === "home_data_abonnes") { await ouvrirModal(vueDonnees("Abonnés", await abonnes("")), trigger); return NextResponse.json({}); }
    if (act.action_id === "home_data_cles") { await ouvrirModal(vueDonnees("Clés API", await cles()), trigger); return NextResponse.json({}); }
    if (act.action_id === "home_data_telechargements") { await ouvrirModal(vueDonnees("Téléchargements", await telechargements("")), trigger); return NextResponse.json({}); }
    if (act.action_id === "home_data_survey") { await ouvrirModal(vueDonnees("Enquête", await enquete("")), trigger); return NextResponse.json({}); }
    // Home tab : section Associations (file, CV associés, journal, décisions).
    if (act.action_id === "home_assoc") { await ouvrirModal(vueDonnees("Associations", await blocsAssoc()), trigger); return NextResponse.json({}); }
    if (act.action_id === "home_assoc_cv") { await ouvrirModal(vueDonnees("CV associés", await blocsCvAssoc()), trigger); return NextResponse.json({}); }
    if (act.action_id === "home_assoc_journal") { await ouvrirModal(vueDonnees("Journal", await blocsJournalAssoc()), trigger); return NextResponse.json({}); }
    if (act.action_id === "assoc_valider" || act.action_id === "assoc_refuser") {
      const action = act.action_id === "assoc_valider" ? "valider" : "refuser";
      const r = await deciderDepuisSlack(charge.user?.name ?? "slack", act.value ?? "", action);
      const msg = r.ok
        ? "✅ Demande " + (action === "valider" ? "validée" : "refusée") + " : la personne est prévenue par e-mail."
        : "⚠️ " + r.erreur;
      try {
        return NextResponse.json({ response_action: "update", view: vueDonnees("Associations", [{ type: "section", text: { type: "mrkdwn", text: msg } }, ...await blocsAssoc()]) });
      } catch {
        return NextResponse.json({ response_action: "update", view: vueResultat(msg) });
      }
    }
    if (act.action_id === "assoc_dissocier") {
      const r = await deciderDepuisSlack(charge.user?.name ?? "slack", act.value ?? "", "dissocier");
      const msg = r.ok
        ? "✅ Fiche dissociée : profil CV et photo retirés du site, personne prévenue par e-mail."
        : "⚠️ " + r.erreur;
      try {
        return NextResponse.json({ response_action: "update", view: vueDonnees("CV associés", [{ type: "section", text: { type: "mrkdwn", text: msg } }, ...await blocsCvAssoc()]) });
      } catch {
        return NextResponse.json({ response_action: "update", view: vueResultat(msg) });
      }
    }
    // Home tab : section CRM (fiche contact choisie dans une liste, puis
    // édition du suivi).
    if (act.action_id === "home_crm") { await ouvrirModal(await modalRechercheCrm(), trigger); return NextResponse.json({}); }
    if (act.action_id === "crm_editer") {
      const email = (act.value ?? "").slice(0, 200);
      if (!email) return NextResponse.json({});
      try {
        await ouvrirModal(modalSuivi(email, await crmCourant(email)), trigger);
      } catch { /* fiche illisible : rien à ouvrir */ }
      return NextResponse.json({});
    }
    // Home tab : section Publication (chiffres pub, saisies, trafic).
    if (act.action_id === "home_pub") { await ouvrirModal(vueDonnees("Pub et revenus", await blocsPub(await collecterPub())), trigger); return NextResponse.json({}); }
    if (act.action_id === "home_pub_saisir") { await ouvrirModal(modalSaisiePub(), trigger); return NextResponse.json({}); }
    if (act.action_id === "home_sources") { await ouvrirModal(vueDonnees("Sources de trafic", await sources()), trigger); return NextResponse.json({}); }
    if (act.action_id === "home_maintenance_on") {
      await ouvrirModal({ type: "modal", callback_id: "maintenance_on",
        title: { type: "plain_text", text: "Maintenance" },
        submit: { type: "plain_text", text: "Activer" }, close: { type: "plain_text", text: "Annuler" },
        blocks: [{ type: "input", optional: true, block_id: "motif", element: { type: "plain_text_input", action_id: "v", max_length: 200, placeholder: { type: "plain_text", text: "ex. mise à jour des données" } }, label: { type: "plain_text", text: "Motif (affiché aux visiteurs)" } }] }, trigger);
      return NextResponse.json({});
    }
    if (act.action_id === "home_maintenance_off") {
      await ouvrirModal({ type: "modal", callback_id: "maintenance_off",
        title: { type: "plain_text", text: "Rétablir le site" },
        submit: { type: "plain_text", text: "Rétablir" }, close: { type: "plain_text", text: "Annuler" },
        blocks: [{ type: "section", text: { type: "mrkdwn", text: "Confirmer la fin de la maintenance ? Le site redevient accessible." } }] }, trigger);
      return NextResponse.json({});
    }
    return NextResponse.json({});
  }

  if (charge.type !== "view_submission") return NextResponse.json({});
  const v = charge.view?.state?.values ?? {};
  const urlReponse = charge.response_url ?? "";
  const qui = charge.user?.name ?? "slack";
  const userId = charge.user?.id ?? "";

  // --- Données : recherche d'un compte, fiche en lecture seule ---
  if (charge.view?.callback_id === "data_recherche") {
    const q = String((v.q?.v as { value?: string })?.value ?? "").trim();
    if (!q) return NextResponse.json({ response_action: "errors", errors: { q: "Indique un e-mail ou un identifiant." } });
    try {
      return NextResponse.json({ response_action: "update", view: vueDonnees("Fiche compte", await fiche(q.slice(0, 100))) });
    } catch (e) {
      return NextResponse.json({ response_action: "errors", errors: { q: e instanceof Error ? e.message : String(e) } });
    }
  }

  // --- CRM : recherche d'une fiche contact (liste filtrable ou saisie) ---
  if (charge.view?.callback_id === "crm_recherche") {
    const choisi = String((v.liste?.v as { selected_option?: { value: string } })?.selected_option?.value ?? "").trim();
    const q = String((v.q?.v as { value?: string })?.value ?? "").trim();
    if (!choisi && !q) return NextResponse.json({ response_action: "errors", errors: { q: "Choisis un contact dans la liste ou saisis une adresse." } });
    try {
      return NextResponse.json({ response_action: "update", view: vueDonnees("Fiche contact", await ficheCrm((choisi || q).slice(0, 100))) });
    } catch (e) {
      return NextResponse.json({ response_action: "errors", errors: { q: e instanceof Error ? e.message : String(e) } });
    }
  }

  // --- CRM : enregistrement du suivi (statut, tags, note) ---
  if (charge.view?.callback_id === "crm_maj") {
    let email = "";
    try { email = String((JSON.parse(charge.view?.private_metadata ?? "{}") as { email?: string }).email ?? ""); } catch { /* métadonnée illisible */ }
    const statut = String((v.statut?.v as { selected_option?: { value: string } })?.selected_option?.value ?? "");
    const tags = String((v.tags?.v as { value?: string })?.value ?? "").split(",").map((x) => x.trim()).filter(Boolean);
    const note = String((v.note?.v as { value?: string })?.value ?? "");
    if (!email) return NextResponse.json({ response_action: "update", view: vueResultat("⚠️ Adresse illisible : relance la fiche depuis l'accueil.") });
    const r = await majCrm(qui, email, statut || undefined, tags.length ? tags : undefined, note !== "" ? note : undefined);
    return NextResponse.json({ response_action: "update", view: vueResultat(r.ok ? "✅ Suivi enregistré pour " + email : "⚠️ " + r.erreur) });
  }

  // --- Publication : saisie manuelle des chiffres pub (AppLixir, AdSense) ---
  if (charge.view?.callback_id === "pub_saisie") {
    const jour = String((v.jour?.v as { value?: string })?.value ?? "").trim();
    const applixir = String((v.applixir?.v as { value?: string })?.value ?? "").trim();
    const adsense = String((v.adsense?.v as { value?: string })?.value ?? "").trim();
    const videos = String((v.videos?.v as { value?: string })?.value ?? "").trim();
    const impressions = String((v.impressions?.v as { value?: string })?.value ?? "").trim();
    if (!jour) return NextResponse.json({ response_action: "errors", errors: { jour: "Indique le jour (format AAAA-MM-JJ)." } });
    const r = await saisirPub(qui, jour.slice(0, 10), applixir.slice(0, 20), adsense.slice(0, 20), videos.slice(0, 10), impressions.slice(0, 12));
    if (!r.ok) {
      const champ = r.erreur.startsWith("jour") ? "jour" : r.erreur.startsWith("revenus AppLixir") ? "applixir" : r.erreur.startsWith("revenus AdSense") ? "adsense" : r.erreur.startsWith("vidéos") ? "videos" : r.erreur.startsWith("impressions") ? "impressions" : "";
      if (champ) return NextResponse.json({ response_action: "errors", errors: { [champ]: r.erreur } });
      return NextResponse.json({ response_action: "update", view: vueResultat("⚠️ " + r.erreur) });
    }
    return NextResponse.json({ response_action: "update", view: vueResultat(r.message) });
  }

  // --- /mail envoyer : vérifie puis affiche la confirmation par boutons ---
  if (charge.view?.callback_id === "mail_envoi") {
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

  // --- Maintenance (Home tab) : bascule puis rafraîchit le Home ---
  if (charge.view?.callback_id === "maintenance_on") {
    const motif = String((v.motif?.v as { value?: string })?.value ?? "").trim();
    try {
      await basculeMaintenance(true, "slack:" + qui, motif);
    } catch (e) {
      return NextResponse.json({ response_action: "update", view: vueResultat("⚠️ Erreur : " + (e instanceof Error ? e.message : String(e))) });
    }
    if (userId) await publierHome(userId);
    return NextResponse.json({ response_action: "update", view: vueResultat("🔴 Maintenance activée." + (motif ? "\nMotif : " + motif : "")) });
  }
  if (charge.view?.callback_id === "maintenance_off") {
    try {
      await basculeMaintenance(false, "slack:" + qui);
    } catch (e) {
      return NextResponse.json({ response_action: "update", view: vueResultat("⚠️ Erreur : " + (e instanceof Error ? e.message : String(e))) });
    }
    if (userId) await publierHome(userId);
    return NextResponse.json({ response_action: "update", view: vueResultat("🟢 Site rétabli.") });
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

    const resultats: string[] = [];
    const canauxDispo = await canaux();
    for (const { code, suffixe } of lignes) {
      const service = suffixe === "x" ? "twitter" : "bluesky";
      const canal = canauxDispo.find((c) => c.service === service);
      const nomReseau = suffixe === "x" ? "X" : "Bluesky";
      if (!canal) {
        resultats.push("⚠️ " + nomReseau + " : aucun canal connecté dans Buffer (publish.buffer.com → Connect Channel)" + (code ? " : lien créé : https://link.dataparl.fr/" + code : ""));
        continue;
      }
      const lienCourt = code ? "https://link.dataparl.fr/" + code : "";
      const p = await creerPost(canal.id, code ? texte + "\n" + lienCourt : texte, mode);
      resultats.push(("id" in p ? "✅" : "⚠️") + " " + nomReseau + " : " + ("id" in p ? (mode === "maintenant" ? "publié" : mode === "brouillon" ? "brouillon créé dans Buffer" : "ajouté à la file Buffer") : "erreur : " + p.erreur) + (lienCourt ? " : " + lienCourt : " (sans lien tracé)"));
    }

    repondre(urlReponse, "📣 Post envoyé par " + qui + " :\n" + resultats.join("\n") + (destination ? "\nDestination : " + destination : "\n(sans lien tracé)"));
    return NextResponse.json({ response_action: "clear" });
  } catch (e) {
    repondre(urlReponse, "Erreur /post : " + (e instanceof Error ? e.message : String(e)));
    return NextResponse.json({ response_action: "errors", errors: { texte: "Erreur : " + (e instanceof Error ? e.message : String(e)) } });
  }
}
