import "server-only";

// Client Slack de l'app dédiée « DataParl Mail » : la messagerie @dataparl.fr
// vit dans sa propre app Slack, séparée de la console d'admin.
// Variable d'environnement : SLACK_MAILAPP_BOT_TOKEN (token bot xoxb de
// l'app dédiée). Absente : l'app est simplement inactive, rien ne casse.

const token = () => process.env.SLACK_MAILAPP_BOT_TOKEN ?? "";

export async function apiMailApp(methode: string, corps: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (!token()) throw new Error("SLACK_MAILAPP_BOT_TOKEN absente sur Vercel");
  const r = await fetch("https://slack.com/api/" + methode, {
    method: "POST",
    headers: { Authorization: "Bearer " + token(), "Content-Type": "application/json" },
    body: JSON.stringify(corps),
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  const j = (await r.json()) as Record<string, unknown> & { ok?: boolean; error?: string };
  if (!j.ok) throw new Error("Slack " + methode + " : " + (j.error ?? "erreur inconnue"));
  return j;
}

// Ouvre un modal depuis un bouton (trigger_id du payload). Best-effort.
export async function ouvrirModal(vue: Record<string, unknown>, trigger: string): Promise<void> {
  if (!trigger) return;
  try { await apiMailApp("views.open", { trigger_id: trigger, view: vue }); } catch { /* rien à ouvrir */ }
}

// Publie (ou rafraîchit) le Home tab de l'app dédiée. Best-effort.
export async function publierHomeMail(userId: string, vue: Record<string, unknown>): Promise<void> {
  if (!userId) return;
  try { await apiMailApp("views.publish", { user_id: userId, view: vue }); } catch { /* on réessaiera plus tard */ }
}
