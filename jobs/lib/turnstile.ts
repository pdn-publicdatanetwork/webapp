// Vérification Turnstile (Cloudflare). Si Turnstile n'est pas configuré
// (pas de secret dans l'environnement), on laisse passer : les formulaires
// restent utilisables sans friction.

export const cleTurnstile = () =>
  (process.env.TURNSTILE_SITE_KEY || process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "").trim();

const secretTurnstile = () => (process.env.TURNSTILE_SECRET_KEY || "").trim();

export async function verifierHumain(jeton: unknown): Promise<boolean> {
  const secret = secretTurnstile();
  const t = typeof jeton === "string" ? jeton.trim() : "";
  if (!secret) return true;
  if (!t) return false;
  try {
    const corps = new URLSearchParams({ secret, response: t });
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: corps,
    });
    const json = await res.json().catch(() => null);
    return Boolean(json && json.success === true);
  } catch {
    return false;
  }
}
