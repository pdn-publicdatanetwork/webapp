import "server-only";
import { authAdmin, dataAdmin } from "./supabaseAdmin";
import { lireMaintenance } from "./maintenanceAdmin";

// Console Slack de DataParl' : collecte des statistiques du site (usage,
// comptes, exports, chat, qualité), des fiches collaborateurs associées
// (validées, à vérifier) et des réseaux sociaux (Telegram, Bluesky, X),
// pour la commande /stats et le digest quotidien #monitoring.
// Chaque source est indépendante : une panne n'empêche pas les autres
// chiffres (valeur null = indisponible).

const HEURE = 3600_000;
const depuis = (h: number) => new Date(Date.now() - h * HEURE).toISOString();

type Db = ReturnType<typeof authAdmin>;

async function compterSur(db: Db, table: string, colonne: string, heures: number): Promise<number | null> {
  try {
    const { count, error } = await db.from(table).select("*", { count: "exact", head: true }).gte(colonne, depuis(heures));
    if (error) throw error;
    return count ?? 0;
  } catch { return null; }
}

async function compterFiltre(db: Db, table: string, filtre: Record<string, unknown>): Promise<number | null> {
  try {
    let q = db.from(table).select("*", { count: "exact", head: true });
    for (const [c, v] of Object.entries(filtre)) q = q.eq(c, v);
    const { count, error } = await q;
    if (error) throw error;
    return count ?? 0;
  } catch { return null; }
}

// ── Réseaux sociaux ──────────────────────────────────────────────────────────

async function telegramAbonnes(): Promise<number | null> {
  try {
    const r = await fetch("https://t.me/dataparl_daily", { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!r.ok) return null;
    const html = await r.text();
    const m = html.match(/([\d.,\s]+?)\s*(?:subscribers|abonnés|members)/i);
    if (!m) return null;
    const n = Number(m[1].replace(/[\s.,]/g, ""));
    return Number.isFinite(n) ? n : null;
  } catch { return null; }
}

type Bsky = { handle: string; followers: number | null; posts: number | null } | null;

async function bluesky(acteur: string): Promise<Bsky> {
  try {
    const r = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(acteur)}`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!r.ok) return null;
    const p = (await r.json()) as { handle?: string; followersCount?: number; postsCount?: number };
    return { handle: p.handle ?? acteur, followers: p.followersCount ?? null, posts: p.postsCount ?? null };
  } catch { return null; }
}

// Buffer (facultatif) : si BUFFER_API_KEY est définie et que les comptes
// sont connectés dans Buffer, c'est la source privilégiée : une seule clé
// pour tous les réseaux (X, Bluesky, Mastodon, Threads…). X et Bluesky
// n'exposent que le compteur d'abonnés courant, même via Buffer.
type BufferProfils = Map<string, number>; // service → followers

async function bufferAbonnes(): Promise<BufferProfils | null> {
  const cle = process.env.BUFFER_API_KEY ?? "";
  if (!cle) return null;
  try {
    const r = await fetch("https://api.bufferapp.com/1/profiles.json", {
      headers: { Authorization: `Bearer ${cle}` }, cache: "no-store", signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) return null;
    const profils = (await r.json()) as { service: string; statistics?: { followers?: number } }[];
    const m = new Map<string, number>();
    for (const p of profils ?? []) {
      const f = p.statistics?.followers;
      if (typeof f === "number") m.set(p.service, f);
    }
    return m.size ? m : null;
  } catch { return null; }
}

async function xAbonnes(): Promise<number | null> {
  const handle = process.env.X_HANDLE ?? "";
  if (!handle) return null;
  try {
    const r = await fetch(`https://cdn.syndication.twimg.com/widgets/followbutton/info.json?screen_name=${encodeURIComponent(handle)}`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!r.ok) return null;
    const j = (await r.json()) as { followers_count?: number }[];
    return j?.[0]?.followers_count ?? null;
  } catch { return null; }
}

// ── Collecte ─────────────────────────────────────────────────────────────────

export type Stats = Awaited<ReturnType<typeof collecterStats>>;

export async function collecterStats() {
  const auth = authAdmin();
  const data = dataAdmin() as unknown as Db;

  const [pagesJour, pagesVeille, pagesSemaine, dlJour, dlSemaine, chatJour, chatErreurs, nouveauxJour, nouveauxSemaine, actifsJour, contactJour, deblocJour, newsletterConf, alertesActives, oppositions, waActifs, assocEnCours, assocVerifiees, telegram, bsky1, bsky2, x, buffer, etat] = await Promise.all([
    compterSur(auth, "pages_vues", "le", 24),
    (async () => { try { const { count } = await auth.from("pages_vues").select("*", { count: "exact", head: true }).gte("le", depuis(48)).lt("le", depuis(24)); return count ?? null; } catch { return null; } })(),
    compterSur(auth, "pages_vues", "le", 7 * 24),
    compterSur(data, "telechargements", "cree_le", 24),
    compterSur(data, "telechargements", "cree_le", 7 * 24),
    compterSur(data, "chat_logs", "created_at", 24),
    compterFiltre(data, "chat_logs", { statut: "erreur_moteur" }),
    compterSur(auth, "comptes_utilisateurs", "created_at", 24),
    compterSur(auth, "comptes_utilisateurs", "created_at", 7 * 24),
    (async () => { try { const { count } = await auth.from("comptes_utilisateurs").select("*", { count: "exact", head: true }).gte("last_sign_in_at", depuis(24)); return count ?? null; } catch { return null; } })(),
    compterSur(auth, "contact_messages", "created_at", 24),
    compterSur(auth, "deblocages", "created_at", 24),
    compterFiltre(auth, "newsletter_subscribers", { confirmed: true }),
    compterFiltre(auth, "alert_subscriptions", { active: true }),
    compterFiltre(auth, "opposition_emails", {}),
    compterFiltre(auth, "wa_abonnes", { actif: true }),
    (async () => { try { const { count, error } = await auth.from("associations_fiches").select("*", { count: "exact", head: true }).in("statut", ["attente_email", "a_traiter", "piece_jointe", "gele"]); if (error) throw error; return count ?? null; } catch { return null; } })(),
    (async () => { try { const { count, error } = await auth.from("associations_fiches").select("*", { count: "exact", head: true }).eq("statut", "verifie"); if (error) throw error; return count ?? null; } catch { return null; } })(),
    telegramAbonnes(),
    bluesky("dataparl.fr"),
    bluesky("jobs.dataparl.fr"),
    xAbonnes(),
    bufferAbonnes(),
    lireMaintenance().catch(() => null),
  ]);

  // Top pages 24 h (échantillon de 2000 vues maximum, suffisant pour un jour).
  let top: { chemin: string; vues: number }[] = [];
  try {
    const { data: lignes } = await auth.from("pages_vues").select("chemin").gte("le", depuis(24)).limit(2000);
    const compte = new Map<string, number>();
    for (const l of (lignes ?? []) as { chemin: string }[]) compte.set(l.chemin, (compte.get(l.chemin) ?? 0) + 1);
    top = [...compte.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([chemin, vues]) => ({ chemin, vues }));
  } catch { top = []; }

  // Buffer en source privilégiée pour X (followers) et repli Bluesky.
  let xFinal = x;
  if (buffer) {
    if (typeof buffer.get("twitter") === "number") xFinal = buffer.get("twitter") ?? null;
    const bskyFollowers = buffer.get("bluesky");
    if (typeof bskyFollowers === "number") {
      for (const b of [bsky1, bsky2]) if (b && b.followers === null) b.followers = bskyFollowers;
    }
  }

  return {
    le: new Date().toISOString(),
    site: { pagesJour, pagesVeille, pagesSemaine, top, dlJour, dlSemaine, chatJour, chatErreurs, contactJour, deblocJour },
    comptes: { nouveauxJour, nouveauxSemaine, actifsJour, newsletterConf, alertesActives, oppositions, waActifs },
    associations: { enCours: assocEnCours, verifiees: assocVerifiees },
    social: { telegram, bsky: [bsky1, bsky2].filter((b): b is NonNullable<Bsky> => !!b), x: xFinal, buffer: !!buffer },
    maintenance: etat ? { active: etat.active, motif: etat.motif } : null,
  };
}

// ── Mise en forme Slack ─────────────────────────────────────────────────────

const fm = (n: number | null, suffixe = "") => (n === null ? "–" : n.toLocaleString("fr-FR") + suffixe);
const evol = (jour: number | null, veille: number | null) => {
  if (jour === null || veille === null || !veille) return "";
  const d = Math.round(((jour - veille) / veille) * 100);
  return d === 0 ? "" : ` (${d > 0 ? "+" : ""}${d} % vs veille)`;
};

export function blocsStats(s: Stats): Record<string, unknown>[] {
  const blocs: Record<string, unknown>[] = [
    { type: "header", text: { type: "plain_text", text: "📊 DataParl' : statistiques du site" } },
    { type: "section", fields: [
      { type: "mrkdwn", text: `*Pages vues 24 h :* ${fm(s.site.pagesJour)}${evol(s.site.pagesJour, s.site.pagesVeille)}\n*7 jours :* ${fm(s.site.pagesSemaine)}` },
      { type: "mrkdwn", text: `*Comptes :* ${fm(s.comptes.nouveauxJour)} nouveaux 24 h, ${fm(s.comptes.nouveauxSemaine)} / 7 j\n*Actifs 24 h :* ${fm(s.comptes.actifsJour)}, *Newsletter :* ${fm(s.comptes.newsletterConf)} confirmés` },
    ] },
    { type: "section", fields: [
      { type: "mrkdwn", text: `*Sheets :* ${fm(s.site.dlJour)} exports 24 h, ${fm(s.site.dlSemaine)} / 7 j\n*Chat :* ${fm(s.site.chatJour)} questions 24 h${s.site.chatErreurs ? ` ⚠️ ${fm(s.site.chatErreurs)} erreurs` : ""}` },
      { type: "mrkdwn", text: `*Contact :* ${fm(s.site.contactJour)} messages 24 h\n*Déblocages :* ${fm(s.site.deblocJour)}, *Oppositions :* ${fm(s.comptes.oppositions)}, *Alertes actives :* ${fm(s.comptes.alertesActives)}` },
    ] },
    { type: "section", text: { type: "mrkdwn", text: `*Fiches collaborateurs :* ${fm(s.associations.verifiees)} associée(s) à un compte${s.associations.enCours ? ` ⚠️ ${fm(s.associations.enCours)} à vérifier (Home tab → À vérifier)` : ""}` } },
    { type: "section", text: { type: "mrkdwn", text: `*Communautés :* 📨 WhatsApp ${fm(s.comptes.waActifs)} abonnés actifs` } },
    { type: "section", text: { type: "mrkdwn", text: `*Réseaux :* 🟦 Bluesky\n${s.social.bsky.map(b => `• @${b.handle} : ${fm(b.followers)} abonnés, ${fm(b.posts)} posts`).join("\n") || "–"}${s.social.x ? `\n✖️ X : ${fm(s.social.x)} abonnés` : ""}${s.social.telegram !== null ? `\n📨 Telegram : ${fm(s.social.telegram)} abonnés` : ""}` } },
  ];
  if (s.site.top.length) {
    blocs.push({ type: "section", text: { type: "mrkdwn", text: `*Top pages 24 h :*\n${s.site.top.map((t, i) => `${i + 1}. ${t.chemin} : ${fm(t.vues)} vues`).join("\n")}` } });
  }
  blocs.push({ type: "context", elements: [{ type: "mrkdwn", text: `🕒 ${new Date(s.le).toLocaleString("fr-FR")}, ${s.maintenance?.active ? "🔴 maintenance en cours" : "🟢 site ouvert"}${s.maintenance?.motif ? ` : ${s.maintenance.motif}` : ""}${s.social.buffer ? ", réseaux via Buffer" : ""}` }] });
  return blocs;
}

export function texteStats(s: Stats): string {
  return `DataParl' 24 h : ${fm(s.site.pagesJour)} pages vues${evol(s.site.pagesJour, s.site.pagesVeille)}, ${fm(s.comptes.nouveauxJour)} nouveaux comptes, ${fm(s.site.dlJour)} exports Sheets, ${fm(s.site.chatJour)} questions au chat, ${fm(s.site.contactJour)} messages contact${s.associations.verifiees !== null ? `, ${fm(s.associations.verifiees)} fiches collaborateurs associées` : ""}${s.associations.enCours ? `, ⚠️ ${fm(s.associations.enCours)} association(s) à vérifier` : ""}. Réseaux : ${s.social.bsky.map(b => `@${b.handle} ${fm(b.followers)} ab.`).join(", ")}${s.social.telegram !== null ? `, Telegram ${fm(s.social.telegram)} ab.` : ""}.`;
}

// Publication via webhook entrant Slack (SLACK_WEBHOOK_URL) ; silencieuse si
// absente. Le webhook est fourni par l'app Slack (Incoming Webhooks) et
// pointe vers #monitoring.
export async function publierSlack(payload: Record<string, unknown>): Promise<boolean> {
  const url = process.env.SLACK_WEBHOOK_URL ?? "";
  if (!url) return false;
  try {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), cache: "no-store", signal: AbortSignal.timeout(8000) });
    return r.ok;
  } catch { return false; }
}
