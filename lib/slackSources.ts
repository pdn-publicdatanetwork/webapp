import "server-only";
import { authAdmin, dataAdmin } from "./supabaseAdmin";

// Console Slack « Sources de trafic » : d'où viennent les visiteurs, d'après
// les clics sur les liens tracés (link.dataparl.fr, table liens_clics :
// utm_source, sinon le domaine du site d'origine) sur les 30 derniers
// jours : sources principales (Google, LinkedIn, X, WhatsApp…), appareils,
// pays et liens les plus cliqués.
// Le chat IA (dpchat) ne journalise pas les sources qu'il consulte
// (question, réponse, durée et statut seulement) : on affiche son volume
// de questions, sans provenance.

type Bloc = Record<string, unknown>;

const JOUR = 86400_000;

function domaine(url: string | null | undefined): string {
  if (!url) return "";
  try {
    const h = new URL(url).hostname.replace(/^www\./, "");
    return h || "";
  } catch { return ""; }
}

function liberelle(s: string): string {
  const m: Record<string, string> = {
    google: "🔍 Google", linkedin: "💼 LinkedIn", x: "✖️ X", twitter: "✖️ X",
    bluesky: "🟦 Bluesky", facebook: "📘 Facebook", mastodon: "🐘 Mastodon",
    whatsapp: "💬 WhatsApp", telegram: "📨 Telegram", email: "✉️ E-mail",
    newsletter: "✉️ Newsletter", cp: "📣 Communiqué", communique: "📣 Communiqué",
  };
  const cle = s.toLowerCase().replace(/[^a-z]/g, "");
  return m[cle] ?? s;
}

export async function sources(): Promise<Bloc[]> {
  const depuis = new Date(Date.now() - 30 * JOUR).toISOString();
  type Clic = { source: string | null; referent: string | null; appareil: string | null; pays: string | null; code: string };
  let clics: Clic[] = [];
  let total = 0;
  try {
    const { data, count } = await authAdmin().from("liens_clics")
      .select("source, referent, appareil, pays, code", { count: "exact" })
      .gte("le", depuis).limit(5000);
    clics = (data ?? []) as Clic[];
    total = count ?? clics.length;
  } catch { /* table absente : modal vide mais valide */ }

  const parSource = new Map<string, number>();
  const parAppareil = new Map<string, number>();
  const parPays = new Map<string, number>();
  const parCode = new Map<string, number>();
  clics.forEach((c) => {
    const s = (c.source ?? "").trim() || domaine(c.referent) || "direct/inconnu";
    parSource.set(s, (parSource.get(s) ?? 0) + 1);
    const ap = (c.appareil ?? "").trim() || "–";
    parAppareil.set(ap, (parAppareil.get(ap) ?? 0) + 1);
    if (c.pays) parPays.set(c.pays, (parPays.get(c.pays) ?? 0) + 1);
    if (c.code) parCode.set(c.code, (parCode.get(c.code) ?? 0) + 1);
  });
  const top = (m: Map<string, number>, n: number) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
  const pct = (x: number) => (total ? Math.round((x / total) * 100) : 0);

  let chat30 = null as number | null;
  try {
    const { count } = await dataAdmin().from("chat_logs")
      .select("id", { count: "exact", head: true }).gte("created_at", depuis);
    chat30 = count ?? 0;
  } catch { /* data DB indisponible : champ masqué */ }

  const blocs: Bloc[] = [
    { type: "header", text: { type: "plain_text", text: "Sources de trafic", emoji: true } },
    { type: "section", text: { type: "mrkdwn", text: "*" + total.toLocaleString("fr-FR") + " clics tracés sur 30 jours*" + (total >= 5000 ? " (échantillon : 5 000)" : "") } },
  ];
  const lignesSources = top(parSource, 10).map(([s, n]) => "• " + liberelle(s) + " : " + n.toLocaleString("fr-FR") + " (" + pct(n) + " %)").join("\n");
  if (lignesSources) blocs.push({ type: "section", text: { type: "mrkdwn", text: "*Provenance (utm_source ou site d'origine) :*\n" + lignesSources } });
  const lignesApp = top(parAppareil, 3).map(([s, n]) => s + " " + n.toLocaleString("fr-FR") + " (" + pct(n) + " %)").join(", ");
  const lignesPays = top(parPays, 5).map(([s, n]) => s + " " + n.toLocaleString("fr-FR") + " (" + pct(n) + " %)").join(", ");
  if (lignesApp || lignesPays) blocs.push({ type: "section", text: { type: "mrkdwn", text: (lignesApp ? "*Appareils :* " + lignesApp + "\n" : "") + (lignesPays ? "*Pays :* " + lignesPays : "") } });
  const lignesLiens = top(parCode, 5).map(([c, n]) => "• link.dataparl.fr/" + c + " : " + n.toLocaleString("fr-FR") + " clic(s)").join("\n");
  if (lignesLiens) blocs.push({ type: "section", text: { type: "mrkdwn", text: "*Liens les plus cliqués :*\n" + lignesLiens } });
  if (chat30 !== null) blocs.push({ type: "section", text: { type: "mrkdwn", text: "*🤖 Chat IA :* " + chat30.toLocaleString("fr-FR") + " question(s) sur 30 jours. Le chat ne journalise pas les sources consultées : provenance indisponible." } });
  blocs.push({ type: "context", elements: [{ type: "mrkdwn", text: "D'après la table liens_clics (clics sur link.dataparl.fr, y compris les liens des posts et de la newsletter). L'attribution Google Analytics reste la référence complète : ici, la vue rapide depuis Slack." }] });
  return blocs;
}
