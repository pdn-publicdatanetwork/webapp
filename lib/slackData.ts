import "server-only";
import { authAdmin, dataAdmin } from "./supabaseAdmin";
import { boutonSuppression } from "./slackSuppression";
import { bouton, expedier, hashJeton, piedObligatoire } from "./mail";
import { randomToken } from "./tokens";

// Données de l'espace admin accessibles depuis Slack (onglet Accueil →
// section Données, et commande /sql en complément) : comptes, fiche compte,
// abonnés newsletter, clés API, téléchargements Sheets, enquête
// utilisateurs. Chaque liste permet de supprimer les lignes de test
// (bouton 🗑, confirmation Slack, DELETE réel, trace admin_audit).
// Les écritures métier sensibles (révocation de clé avec historique,
// suppression d'un compte complet GoTrue) restent dans l'admin : ici, la
// suppression ne vise que le nettoyage de lignes parasites.

type Bloc = Record<string, unknown>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const PAR_PAGE = 15;

const entete = (texte: string): Bloc => ({ type: "header", text: { type: "plain_text", text: texte, emoji: true } });
const section = (texte: string): Bloc => ({ type: "section", text: { type: "mrkdwn", text: texte } });
const contexte = (texte: string): Bloc => ({ type: "context", elements: [{ type: "mrkdwn", text: texte }] });

function dh(iso: string | null | undefined): string {
  if (!iso) return "–";
  return new Date(iso).toLocaleString("fr-FR", {
    timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

// ::: Aide (commande /sql) ::::::::::::::::::::::::::::::::::

function aide(): Bloc[] {
  return [
    entete("🗃 /sql : requêtes préparées"),
    section(
      "• `/sql users [n° de page]` : comptes utilisateurs (les derniers inscrits d'abord)\n" +
      "• `/sql user <email ou id>` : fiche complète d'un compte (clés API, connexions, téléchargements, enquête)\n" +
      "• `/sql abonnes [adresse ou n° de page]` : abonnés aux alertes\n" +
      "• `/sql cles` : clés API et consommation\n" +
      "• `/sql telechargements [feuille]` : exports DataParl' Sheets\n" +
      "• `/sql survey [id]` : enquête utilisateurs (moyennes, ou le détail d'une réponse)",
    ),
    contexte("Les mêmes données sont aussi dans l'onglet Accueil de l'app, section Données. Les listes du Home tab proposent la suppression des lignes de test (bouton 🗑)."),
  ];
}

// ::: Comptes (/admin/users) :::::::::::::::::::::::::::::::::::

type Compte = { id: string; email: string; created_at: string; last_sign_in_at: string | null };

export async function comptes(page: number): Promise<Bloc[]> {
  const db = authAdmin();
  const { data, count, error } = await db
    .from("comptes_utilisateurs")
    .select("id, email, created_at, last_sign_in_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(page * PAR_PAGE, page * PAR_PAGE + PAR_PAGE - 1);
  if (error) throw new Error(`comptes_utilisateurs : ${error.message}`);
  const lignes = ((data ?? []) as Compte[]).map(
    (c) => `• ${c.email} : inscrit le ${dh(c.created_at)}, connexion ${dh(c.last_sign_in_at)}, \`${c.id.slice(0, 8)}\`\`,
  );
  const pages = Math.max(1, Math.ceil((count ?? 1) / PAR_PAGE));
  return [
    entete(`👥 Comptes : ${count ?? 0} au total`),
    section(lignes.join("\n") || "Aucun compte sur cette page."),
    contexte(`Fiche complète : bouton 🔍 Fiche compte de l'accueil, page ${page + 1}/${pages}, /sql users <n°> pour changer de page. La suppression complète d'un compte (GoTrue, dépendances) passe par l'admin : comptes_utilisateurs est une vue.`),
  ];
}

// ::: Fiche d'un compte (/admin/users/[id]) ::::::::::::::::::::

export async function fiche(q: string): Promise<Bloc[]> {
  const db = authAdmin();
  let id = q;
  if (!UUID.test(q)) {
    const { data: c, error: errCherche } = await db
      .from("comptes_utilisateurs").select("id, email").ilike("email", q).limit(1);
    if (errCherche) throw new Error(`recherche compte : ${errCherche.message}`);
    if (!c?.length) throw new Error(`Aucun compte pour « ${q} » : vérifie l'adresse ou l'identifiant.`);
    id = (c[0] as { id: string }).id;
  }
  const { data: liste } = await db
    .from("comptes_utilisateurs")
    .select("id, email, created_at, last_sign_in_at, user_metadata")
    .eq("id", id).limit(1);
  const u = (liste ?? [])[0] as
    | { id: string; email: string; created_at: string; last_sign_in_at: string | null; user_metadata: Record<string, string> | null }
    | undefined;
  if (!u) throw new Error("Compte introuvable.");
  const meta = u.user_metadata ?? {};
  const nom = [meta.prenom, meta.nom].filter(Boolean).join(" ") || meta.full_name || meta.name || "–";

  // Comptage head:true : le total est dans count, pas dans data : déstructuré
  // hors du Promise.all, sinon TypeScript le type comme un tableau.
  const { count: nbVues } = await db.from("pages_vues").select("id", { count: "exact", head: true }).eq("user_id", id);
  const [{ data: cles }, { data: connexions }, { data: enquete }] = await Promise.all([
    db.from("api_keys").select("id, nom, prefixe, quota_jour, last_used_at, revoked_at")
      .eq("user_id", id).order("last_used_at", { ascending: false, nullsFirst: false }),
    db.from("journal_connexions").select("le, ip, appareil, fournisseur")
      .eq("user_id", id).order("le", { ascending: false }).limit(5),
    db.from("survey_reponses").select("id, repondu_le, note_global")
      .eq("user_id", id).order("cree_le", { ascending: false }).limit(3),
  ]);
  const { data: telechs } = await dataAdmin()
    .from("telechargements").select("feuille, lignes, cree_le")
    .eq("user_id", id).order("cree_le", { ascending: false }).limit(5);

  const blocsCles = ((cles ?? []) as { prefixe: string; nom: string; quota_jour: number; last_used_at: string | null; revoked_at: string | null }[])
    .map((c) => `• \`${c.prefixe}…\` ${c.nom} : quota ${c.quota_jour}/j, dernier appel ${dh(c.last_used_at)}${c.revoked_at ? ", *révoquée*" : ""}`);
  const blocsConn = ((connexions ?? []) as { le: string; ip: string; appareil: string | null; fournisseur: string | null }[])
    .map((c) => `• ${dh(c.le)} : \`${c.ip}\` ${c.appareil ?? ""}${c.fournisseur ? ", " + c.fournisseur : ""}`);
  const blocsTele = ((telechs ?? []) as { feuille: string; lignes: number; cree_le: string }[])
    .map((t) => `• ${dh(t.cree_le)} : ${t.feuille} (${t.lignes} lignes)`);
  const blocsEnquete = ((enquete ?? []) as { id: string; repondu_le: string | null; note_global: number | null }[])
    .map((e) => `• ${e.repondu_le ? `répondue le ${dh(e.repondu_le)}, \`${e.id.slice(0, 8)}\`` : "invitation en attente"}${e.repondu_le && e.note_global !== null ? `, note ${e.note_global}/5` : ""}`);

  const morceaux: Bloc[] = [
    entete(`👤 ${u.email}`),
    section(`*Nom :* ${nom}\n*Créé le :* ${dh(u.created_at)}\n*Dernière connexion :* ${dh(u.last_sign_in_at)}\n*Pages vues :* ${nbVues ?? 0}\n*Id :* \`${u.id}\``),
  ];
  if (blocsCles.length) morceaux.push(section(`*🔑 Clés API*\n${blocsCles.join("\n")}`));
  if (blocsConn.length) morceaux.push(section(`*🖥 Dernières connexions*\n${blocsConn.join("\n")}`));
  if (blocsTele.length) morceaux.push(section(`*⬇️ Derniers téléchargements Sheets*\n${blocsTele.join("\n")}`));
  if (blocsEnquete.length) morceaux.push(section(`*📋 Enquête*\n${blocsEnquete.join("\n")}`));
  morceaux.push(contexte("Fiche équivalente à /admin/users/<id>, lecture seule"));
  return morceaux;
}

// ::: Abonnés (/admin/users/abonnes) ::::::::::::::::::::::::::

type Abonne = { id: string; email: string; confirmed: boolean; subscribed_at: string; unsubscribed_at: string | null };

export async function abonnes(arg: string): Promise<Bloc[]> {
  const page = /^\d+$/.test(arg) ? Number(arg) : 0;
  const q = /^\d+$/.test(arg) ? "" : arg.toLowerCase().replace(/[%,()*]/g, "");
  const db = authAdmin();
  let req = db
    .from("newsletter_subscribers")
    .select("id, email, confirmed, subscribed_at, unsubscribed_at", { count: "exact" })
    .order("subscribed_at", { ascending: false })
    .range(page * PAR_PAGE, page * PAR_PAGE + PAR_PAGE - 1);
  if (q) req = req.ilike("email", `%${q}%`);
  const { data, count, error } = await req;
  if (error) throw new Error(`newsletter_subscribers : ${error.message}`);
  const emails = ((data ?? []) as Abonne[]).map((x) => x.email);
  const { data: alertes } = emails.length
    ? await db.from("alert_subscriptions").select("email, frequence, active").in("email", emails)
    : { data: [] as { email: string; frequence: string; active: boolean }[] };
  const al = new Map((alertes ?? []).map((x) => [x.email, x]));
  const pages = Math.max(1, Math.ceil((count ?? 1) / PAR_PAGE));
  const blocs: Bloc[] = [
    entete(`📬 Abonnés : ${count ?? 0} au total`),
  ];
  if (!((data ?? []) as Abonne[]).length) {
    blocs.push(section("Aucun abonné."));
  } else {
    ((data ?? []) as Abonne[]).slice(0, 10).forEach((a) => {
      const etat = a.unsubscribed_at ? "désinscrit" : a.confirmed ? "confirmé" : "en attente";
      const alr = al.get(a.email);
      blocs.push(section(`• ${a.email} : *${etat}*, inscrit le ${dh(a.subscribed_at)}${alr ? `, alerte ${alr.active ? "" : "(inactive) "}${alr.frequence}` : ""}`));
      blocs.push(boutonSuppression("abonne", a.id));
    });
    if (((data ?? []) as Abonne[]).length > 10) blocs.push(contexte("Boutons de suppression pour les 10 premiers de la page : change de page pour les suivants."));
  }
  blocs.push(contexte(`Filtre par adresse : /sql abonnes <adresse>, page ${page + 1}/${pages}`));
  return blocs;
}

// ::: Clés API (/admin/users/api-keys) :::::::::::::::::::::::::

export async function cles(): Promise<Bloc[]> {
  const db = authAdmin();
  const { data, error } = await db
    .from("api_keys")
    .select("id, user_id, nom, prefixe, quota_jour, created_at, last_used_at, revoked_at")
    .order("created_at", { ascending: false }).limit(500);
  if (error) throw new Error(`api_keys : ${error.message}`);
  const ids = ((data ?? []) as { id: string }[]).map((c) => c.id);
  const users = [...new Set(((data ?? []) as { user_id: string }[]).map((c) => c.user_id))];
  const depuis = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  const [{ data: usage }, { data: profils }] = await Promise.all([
    ids.length
      ? db.from("api_usage").select("key_id, jour, requetes").in("key_id", ids).gte("jour", depuis)
      : Promise.resolve({ data: [] as { key_id: string; jour: string; requetes: number }[] }),
    users.length
      ? db.from("profiles").select("id, email").in("id", users)
      : Promise.resolve({ data: [] as { id: string; email: string }[] }),
  ]);
  const email = new Map((profils ?? []).map((p) => [p.id, p.email]));
  const blocs: Bloc[] = [entete(`🔑 Clés API : ${((data ?? []) as unknown[]).length}`)];
  const liste = ((data ?? []) as { id: string; user_id: string; nom: string; prefixe: string; quota_jour: number; last_used_at: string | null; revoked_at: string | null }[]);
  if (!liste.length) {
    blocs.push(section("Aucune clé."));
  } else {
    liste.slice(0, 10).forEach((c) => {
      const u = (usage ?? []).filter((x) => x.key_id === c.id);
      const aujourdhui = new Date().toISOString().slice(0, 10);
      const n30 = u.reduce((s, x) => s + x.requetes, 0);
      const nj = u.find((x) => x.jour === aujourdhui)?.requetes ?? 0;
      blocs.push(section(`• \`${c.prefixe}…\` ${c.nom} : ${email.get(c.user_id) ?? "sans compte"}, ${nj} req. aujourd'hui, ${n30} sur 30 j, quota ${c.quota_jour}/j${c.revoked_at ? ", *révoquée*" : ""}`));
      blocs.push(boutonSuppression("cle", c.id));
    });
    if (liste.length > 10) blocs.push(contexte("Boutons de suppression pour les 10 premières clés : " + liste.length + " au total (révocation durable avec historique : dans l'admin)."));
  }
  blocs.push(contexte("Supprimer retire définitivement la clé (nettoyage de tests). Révoquer temporairement ou changer un quota : admin → Utilisateurs → Clés API."));
  return blocs;
}

// ::: Téléchargements (/admin/telechargements) :::::::::::::::::

type Tele = { id: number; cree_le: string; feuille: string; lignes: number; email: string | null; ip: string | null; user_agent: string | null };

export async function telechargements(feuille: string): Promise<Bloc[]> {
  let req = dataAdmin()
    .from("telechargements")
    .select("id, cree_le, feuille, lignes, email, ip, user_agent")
    .order("cree_le", { ascending: false })
    .limit(PAR_PAGE);
  if (feuille) req = req.ilike("feuille", `%${feuille}%`);
  const { data, error } = await req;
  if (error) throw new Error(`telechargements : ${error.message}`);
  const liste = (data ?? []) as Tele[];
  const blocs: Bloc[] = [entete("⬇️ Derniers téléchargements Sheets")];
  liste.slice(0, 10).forEach((t) => {
    blocs.push(section(`• ${dh(t.cree_le)} : *${t.feuille}* (${t.lignes} lignes), ${t.email || "visiteur anonyme"}, \`${t.ip || "–"}\``));
    blocs.push(boutonSuppression("telechargement", String(t.id)));
  });
  if (!liste.length) blocs.push(section("Aucun téléchargement."));
  blocs.push(contexte("Filtre par feuille : /sql telechargements <feuille>, 15 derniers (500 dans l'admin). Suppression définitive, utile pour les téléchargements de test."));
  return blocs;
}

// ::: Enquête (/admin/content/survey) ::::::::::::::::::::::::::

type Reponse = {
  id: string; email: string; note_experience: number | null; note_contenu: number | null;
  note_global: number | null; commentaire: string | null; cree_le: string; repondu_le: string | null;
};

// Renvoie l'invitation à l'enquête : même logique que l'admin
// (POST /api/admin/content/survey) : nouvelle ligne avec un nouveau jeton,
// puis e-mail depuis enquetes@dataparl.fr. Auditée au nom slack:<pseudo>.
export async function inviterEnquete(qui: string, id: string): Promise<{ ok: true; message: string } | { ok: false; erreur: string }> {
  if (!id) return { ok: false, erreur: "invitation inconnue" };
  const db = authAdmin();
  let ligneId = id;
  if (!UUID.test(id)) {
    const { data: cherche } = await db.from("survey_reponses").select("id").ilike("id", id + "%").limit(1);
    ligneId = ((cherche ?? [])[0] as { id: string } | undefined)?.id ?? "";
    if (!ligneId) return { ok: false, erreur: "invitation introuvable" };
  }
  const { data: ligne } = await db.from("survey_reponses").select("email, user_id, repondu_le").eq("id", ligneId).limit(1);
  const r = (ligne ?? [])[0] as { email: string; user_id: string | null; repondu_le: string | null } | undefined;
  if (!r) return { ok: false, erreur: "invitation introuvable" };
  if (r.repondu_le) return { ok: false, erreur: "déjà répondue : pas besoin de renvoyer" };
  const jeton = randomToken(24);
  const { error } = await db.from("survey_reponses").insert({ user_id: r.user_id, email: r.email, jeton_hash: hashJeton(jeton) });
  if (error) return { ok: false, erreur: "survey_reponses : " + error.message };
  const url = "https://survey.dataparl.fr/?j=" + jeton;
  const res = await expedier({
    from: "enquetes@dataparl.fr", to: [r.email], subject: "Ton avis sur DataParl'", titre: "Ton avis compte",
    corpsHtml: [
      "<p>Bonjour,</p>",
      "<p>La dernière fois, notre questionnaire n'a malheureusement pas abouti à cause d'un problème de notre côté — il est corrigé depuis. Si tu as 2 minutes, ton avis nous aiderait beaucoup à améliorer DataParl'.</p>",
      bouton(url, "Donner mon avis (2 min)"),
      '<p style="color:#4A5670">Si le bouton ne fonctionne pas, copie-colle ce lien : <a href="' + url + '" style="color:#4A5670">' + url + "</a></p>",
    ].join(""),
    text: ["Bonjour,", "", "La dernière fois, notre questionnaire n'a malheureusement pas abouti à cause d'un problème de notre côté — il est corrigé depuis. Si tu as 2 minutes, ton avis nous aiderait beaucoup à améliorer DataParl'.", "", url, "", "Merci !", "L'équipe DataParl'"].join("\n"),
    type: "transactionnel", pied: piedObligatoire(),
  });
  if (!res.ok) {
    await db.from("survey_reponses").delete().eq("jeton_hash", hashJeton(jeton));
    return { ok: false, erreur: "e-mail non envoyé : " + res.error };
  }
  try {
    await db.from("admin_audit").insert({ github_login: "slack:" + qui, action: "enquete.inviter", cible: r.email });
  } catch { /* audit best-effort */ }
  return { ok: true, message: "✅ Invitation renvoyée à " + r.email + "." };
}

export async function enquete(id: string): Promise<Bloc[]> {
  const db = authAdmin();
  if (id) {
    let req = db.from("survey_reponses")
      .select("id, email, note_experience, note_contenu, note_global, commentaire, cree_le, repondu_le")
      .limit(1);
    req = UUID.test(id) ? req.eq("id", id) : req.ilike("id", `${id}%`);
    const { data, error } = await req;
    if (error) throw new Error(`survey_reponses : ${error.message}`);
    const r = (data ?? [])[0] as Reponse | undefined;
    if (!r) throw new Error("Réponse introuvable : liste complète via /sql survey ou l'accueil.");
    const NOTE = (n: number | null) => (n === null ? "–" : `${n}/5`);
    const blocs: Bloc[] = [
      entete("📋 Réponse à l'enquête"),
      section(
        `*Compte :* ${r.email}\n*Envoyée :* ${dh(r.cree_le)}\n*État :* ${r.repondu_le ? `répondue le ${dh(r.repondu_le)}` : "invitation sans réponse"}\n` +
        `*Expérience :* ${NOTE(r.note_experience)}, *Contenu :* ${NOTE(r.note_contenu)}, *Global :* ${NOTE(r.note_global)}\n` +
        (r.commentaire ? `*Commentaire :*\n> ${r.commentaire.replace(/\n/g, "\n> ")}` : "*Commentaire :* –"),
      ),
    ];
    if (!r.repondu_le) blocs.push({ type: "actions", elements: [
      { type: "button", text: { type: "plain_text", text: "✉️ Renvoyer l'invitation" }, style: "primary", action_id: "enquete_inviter", value: r.id },
    ] });
    blocs.push(boutonSuppression("enquete", r.id));
    blocs.push(contexte(`Id \`${r.id}\``));
    return blocs;
  }
  const { data, error } = await db.from("survey_reponses")
    .select("id, email, note_experience, note_contenu, note_global, commentaire, cree_le, repondu_le")
    .order("cree_le", { ascending: false }).limit(500);
  if (error) throw new Error(`survey_reponses : ${error.message}`);
  const toutes = (data ?? []) as Reponse[];
  const repondues = toutes.filter((r) => r.repondu_le);
  const attente = toutes.filter((r) => !r.repondu_le);
  const moyenne = (f: (r: Reponse) => number | null) => {
    const v = repondues.map(f).filter((x): x is number => x !== null);
    return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : "–";
  };
  const blocs: Bloc[] = [
    entete(`📋 Enquête : ${repondues.length} réponse(s)`),
    section(
      `*${attente.length}* invitation(s) sans réponse\n` +
      `Note moyenne expérience : *${moyenne((r) => r.note_experience)}*, contenu : *${moyenne((r) => r.note_contenu)}*, global : *${moyenne((r) => r.note_global)}*`,
    ),
  ];
  if (attente.length) {
    blocs.push(section("*Invitations en attente (10 dernières) :*\n" + attente.slice(0, 10).map((r) => "• " + r.email + ", envoyée le " + dh(r.cree_le) + ", `" + r.id.slice(0, 8) + "`").join("\n")));
    attente.slice(0, 5).forEach((r) => {
      blocs.push({ type: "actions", elements: [
        { type: "button", text: { type: "plain_text", text: "✉️ Inviter " + (r.email.split("@")[0] || "?").slice(0, 20) }, style: "primary", action_id: "enquete_inviter", value: r.id },
        { type: "button", text: { type: "plain_text", text: "🗑" }, style: "danger", action_id: "supprimer_ligne", value: "enquete:" + r.id,
          confirm: { title: { type: "plain_text", text: "Supprimer ?" }, text: { type: "plain_text", text: "Ligne de test ou e-mail erroné : l'invitation sera définitivement supprimée." }, confirm: { type: "plain_text", text: "Supprimer" }, deny: { type: "plain_text", text: "Annuler" }, style: "danger" } },
      ] });
    });
  }
  if (repondues.length) {
    blocs.push(section("*Dernières réponses :*\n" + repondues.slice(0, 5).map(
      (r) => `• ${dh(r.repondu_le)} : ${r.email}, exp. ${r.note_experience ?? "–"}/5, contenu ${r.note_contenu ?? "–"}/5, global ${r.note_global ?? "–"}/5, \`${r.id.slice(0, 8)}\`\`,
    ).join("\n")));
    repondues.slice(0, 5).forEach((r) => blocs.push(boutonSuppression("enquete", r.id, "🗑 " + (r.email.split("@")[0] || "?").slice(0, 15))));
  }
  const derniersCommentaires = repondues.filter((r) => r.commentaire).slice(0, 3).map(
    (r) => `> *${r.email}* : ${String(r.commentaire).slice(0, 200)}`,
  );
  if (derniersCommentaires.length) blocs.push(section(`*Derniers commentaires*\n${derniersCommentaires.join("\n>\n")}`));
  blocs.push(contexte("Détail d'une réponse : /sql survey <id> (id court accepté). Renvoyer une invitation : bouton ✉️ (nouveaux jeton et e-mail). Suppression : nettoyage des lignes de test."));
  return blocs;
}

// ::: Aiguillage (commande /sql) :::::::::::::::::::::::::::::::

export async function executerSql(texte: string): Promise<Bloc[]> {
  const morceaux = texte.trim().split(/\s+/).filter(Boolean);
  const cmd = (morceaux[0] ?? "").toLowerCase();
  const arg = morceaux.slice(1).join(" ");
  switch (cmd) {
    case "":
    case "aide":
    case "help":
      return aide();
    case "users":
    case "comptes":
      return comptes(Math.max(Number(arg) || 0, 0));
    case "user":
    case "fiche":
      if (!arg) throw new Error("Indique un e-mail ou un identifiant : `/sql user <email ou id>`");
      return fiche(arg);
    case "abonnes":
    case "abonnés":
      return abonnes(arg);
    case "cles":
    case "clés":
    case "keys":
      return cles();
    case "telechargements":
    case "sheets":
      return telechargements(arg.slice(0, 80));
    case "survey":
    case "enquete":
    case "enquête":
      return enquete(arg.slice(0, 40));
    default:
      throw new Error(`Requête inconnue « ${morceaux[0]} » : tape \`/sql\` pour la liste.`);
  }
}
