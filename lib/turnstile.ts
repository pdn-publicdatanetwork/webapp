// Vérification serveur de Turnstile (Cloudflare) pour les formulaires du site
// public. Sans secret dans l'environnement, on laisse passer : le formulaire
// reste utilisable sans friction (même repli que jobs/lib/turnstile.ts).

export async function verifierHumain(jeton: unknown): Promise<boolean> {
  const secret = (process.env.TURNSTILE_SECRET_KEY || "").trim();
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
