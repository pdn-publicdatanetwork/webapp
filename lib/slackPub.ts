import "server-only";
import { authAdmin } from "./supabaseAdmin";

// Console Slack « Publication » : chiffres publicitaires. Les vidéos
// AppLixir (déblocages de fiches) sont comptées en base (webhook signé).
// AdSense est lu via l'API Management (OAuth refresh token) si les clés
// sont configurées sur Vercel ; AppLixir n'expose pas d'API de reporting,
// ses chiffres sont saisis à la main dans pub_saisies (même table pour
// corriger AdSense si besoin).

type Bloc = Record<string, unknown>;

const JOUR = 86400_000;
const hier = (n: number) => new Date(Date.now() - n * JOUR).toISOString().slice(0, 10);

export const eur = (n: number | null): string => n === null ? "–" : n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

async function compterDeblocages(heures: number | null): Promise<number | null> {
  try {
    let q = authAdmin().from("deblocages").select("id", { count: "exact", head: true });
    if (heures !== null) q = q.gte("cree_le", new Date(Date.now() - heures * 3600_000).toISOString());
    const { count, error } = await q;
    if (error) throw error;
    return count ?? 0;
  } catch { return null; }
}

export type Pub = {
  videos: { jour: number | null; semaine: number | null; total: number | null };
  adsense: { impressions: number | null; clics: number | null; revenus: number | null; actif: boolean } | null;
  saisies: { jour: string; applixir_eur: number | null; adsense_eur: number | null; videos: number | null; impressions: number | null }[];
};

// AdSense Management API v2 : OAuth (refresh token) puis rapport agrégé
// des 7 derniers jours. ESTIMATED_EARNINGS est renvoyé en micros d'USD.
async function adsense7j(): Promise<Pub["adsense"]> {
  const id = process.env.ADSENSE_ACCOUNT_ID ?? "";
  const cid = process.env.GOOGLE_CLIENT_ID ?? "";
  const secret = process.env.GOOGLE_CLIENT_SECRET ?? "";
  const refresh = process.env.GOOGLE_REFRESH_TOKEN ?? "";
  if (!id || !cid || !secret || !refresh) return null;
  try {
    const tr = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: cid, client_secret: secret, refresh_token: refresh, grant_type: "refresh_token" }).toString(),
      cache: "no-store", signal: AbortSignal.timeout(6000),
    });
    if (!tr.ok) return { impressions: null, clics: null, revenus: null, actif: false };
    const token = ((await tr.json()) as { access_token?: string }).access_token ?? "";
    if (!token) return { impressions: null, clics: null, revenus: null, actif: false };
    const compte = id.startsWith("accounts/") ? id : "accounts/" + id;
    const params = new URLSearchParams({ dateRange: "CUSTOM", startDate: hier(7), endDate: hier(0), metrics: "IMPRESSIONS,CLICKS,ESTIMATED_EARNINGS", languageCode: "fr" });
    const r = await fetch("https://adsense.googleapis.com/v2/" + compte + "/reports:generate?" + params.toString(), {
      headers: { Authorization: "Bearer " + token }, cache: "no-store", signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return { impressions: null, clics: null, revenus: null, actif: false };
    const j = (await r.json()) as { totals?: { metrics?: { value?: string }[] } };
    const m = j.totals?.metrics ?? [];
    if (m.length < 3) return { impressions: null, clics: null, revenus: null, actif: false };
    return {
      impressions: Number(m[0]?.value ?? "") || null,
      clics: Number(m[1]?.value ?? "") || null,
      revenus: (Number(m[2]?.value ?? "") || 0) / 1_000_000 || null,
      actif: true,
    };
  } catch { return { impressions: null, clics: null, revenus: null, actif: false }; }
}

async function lireSaisies() {
  try {
    const { data } = await authAdmin().from("pub_saisies")
      .select("jour, applixir_eur, adsense_eur, videos, impressions")
      .order("jour", { ascending: false }).limit(30);
    return (data ?? []) as Pub["saisies"];
  } catch { return [] as Pub["saisies"]; }
}

export async function collecterPub(): Promise<Pub> {
  const [jour, semaine, total, adsense, saisies] = await Promise.all([
    compterDeblocages(24),
    compterDeblocages(7 * 24),
    compterDeblocages(null),
    adsense7j(),
    lireSaisies(),
  ]);
  return { videos: { jour, semaine, total }, adsense, saisies };
}

const nf = (n: number | null) => (n === null ? "–" : n.toLocaleString("fr-FR"));
const dj = (s: string) => { try { return new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }); } catch { return s; } };

export function blocsPub(p: Pub): Bloc[] {
  const blocs: Bloc[] = [
    { type: "header", text: { type: "plain_text", text: "Publicité et vidéos", emoji: true } },
    { type: "section", text: { type: "mrkdwn", text: "*Vidéos AppLixir jouées (déblocages) :*\n• 24 h : " + nf(p.videos.jour) + "\n• 7 jours : " + nf(p.videos.semaine) + "\n• Depuis le début : " + nf(p.videos.total) } },
  ];
  if (p.adsense && p.adsense.actif) {
    blocs.push({ type: "section", text: { type: "mrkdwn", text: "*Google AdSense (API, 7 derniers jours) :*\n• Impressions : " + nf(p.adsense.impressions) + "\n• Clics : " + nf(p.adsense.clics) + "\n• Revenus estimés : " + eur(p.adsense.revenus) } });
  } else {
    blocs.push({ type: "section", text: { type: "mrkdwn", text: "*Google AdSense (API) :* non branché.\nRenseigner sur Vercel : ADSENSE_ACCOUNT_ID, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN (compte de service ou OAuth avec accès adsense.readonly)." } });
  }
  const lignes = p.saisies.slice(0, 7).map((s) =>
    "• " + dj(s.jour) + " : " + (s.applixir_eur !== null ? "AppLixir " + eur(s.applixir_eur) : "AppLixir –") + ", " + (s.adsense_eur !== null ? "AdSense " + eur(s.adsense_eur) : "AdSense –") + (s.videos !== null ? ", " + s.videos + " vidéo(s)" : "") + (s.impressions !== null ? ", " + s.impressions + " impression(s)" : "")).join("\n");
  if (lignes) blocs.push({ type: "section", text: { type: "mrkdwn", text: "*Dernières saisies manuelles :*\n" + lignes } });
  const totalSaisi = p.saisies.reduce((s, x) => s + (x.applixir_eur ?? 0) + (x.adsense_eur ?? 0), 0);
  if (p.saisies.length) blocs.push({ type: "section", text: { type: "mrkdwn", text: "*Revenus saisis sur " + p.saisies.length + " jour(s) :* " + eur(totalSaisi) } });
  blocs.push({ type: "context", elements: [{ type: "mrkdwn", text: "Vidéos comptées côté serveur (rappel signé AppLixir). Pour saisir ou corriger AppLixir/AdSense : bouton Saisir des chiffres du Home tab. AppLixir n'expose pas d'API de reporting : dashboard client.applixir.com → Reporting." }] });
  return blocs;
}

export function modalSaisiePub(): Record<string, unknown> {
  return {
    type: "modal", callback_id: "pub_saisie",
    title: { type: "plain_text", text: "Saisir des chiffres" },
    submit: { type: "plain_text", text: "Enregistrer" },
    close: { type: "plain_text", text: "Annuler" },
    blocks: [
      { type: "input", block_id: "jour", element: { type: "plain_text_input", action_id: "v", initial_value: hier(0), placeholder: { type: "plain_text", text: "AAAA-MM-JJ" } }, label: { type: "plain_text", text: "Jour concerné" } },
      { type: "input", optional: true, block_id: "applixir", element: { type: "plain_text_input", action_id: "v", placeholder: { type: "plain_text", text: "ex. 1,20 (vide = inchangé)" } }, label: { type: "plain_text", text: "Revenus AppLixir (€, dashboard AppLixir)" } },
      { type: "input", optional: true, block_id: "adsense", element: { type: "plain_text_input", action_id: "v", placeholder: { type: "plain_text", text: "ex. 0,85 (vide = inchangé)" } }, label: { type: "plain_text", text: "Revenus AdSense (€, si API non branchée)" } },
      { type: "input", optional: true, block_id: "videos", element: { type: "plain_text_input", action_id: "v", placeholder: { type: "plain_text", text: "ex. 12" } }, label: { type: "plain_text", text: "Vidéos AppLixir jouées ce jour-là" } },
      { type: "input", optional: true, block_id: "impressions", element: { type: "plain_text_input", action_id: "v", placeholder: { type: "plain_text", text: "ex. 3400" } }, label: { type: "plain_text", text: "Impressions AdSense ce jour-là" } },
    ],
  };
}

const NOMBRE = /^-?[0-9]+(?:[.,][0-9]+)?$/;

function nombre(v: string | undefined): number | null | undefined {
  if (v === undefined || v.trim() === "") return undefined;
  if (!NOMBRE.test(v.trim())) return null; // invalide
  return Number(v.trim().replace(",", "."));
}

export async function saisirPub(qui: string, jourBrut: string, applixir: string, adsense: string, videos: string, impressions: string): Promise<{ ok: true; message: string } | { ok: false; erreur: string }> {
  const jour = jourBrut.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(jour)) return { ok: false, erreur: "jour invalide : format AAAA-MM-JJ" };
  const champs: { applixir_eur?: number; adsense_eur?: number; videos?: number; impressions?: number } = {};
  const a = nombre(applixir); if (a === null) return { ok: false, erreur: "revenus AppLixir : nombre attendu (ex. 1,20)" }; if (a !== undefined) champs.applixir_eur = a;
  const s = nombre(adsense); if (s === null) return { ok: false, erreur: "revenus AdSense : nombre attendu (ex. 0,85)" }; if (s !== undefined) champs.adsense_eur = s;
  const v = nombre(videos); if (v === null) return { ok: false, erreur: "vidéos : nombre entier attendu" }; if (v !== undefined) champs.videos = Math.round(v);
  const i = nombre(impressions); if (i === null) return { ok: false, erreur: "impressions : nombre entier attendu" }; if (i !== undefined) champs.impressions = Math.round(i);
  const valeurs = { jour, maj_le: new Date().toISOString(), maj_par: "slack:" + qui, ...champs };
  const { error } = await authAdmin().from("pub_saisies").upsert(valeurs);
  if (error) return { ok: false, erreur: "pub_saisies : " + error.message };
  try {
    await authAdmin().from("admin_audit").insert({ github_login: "slack:" + qui, action: "pub.saisie", cible: jour, details: champs });
  } catch { /* audit best-effort */ }
  return { ok: true, message: "✅ Chiffres enregistrés pour le " + jour + "." };
}
