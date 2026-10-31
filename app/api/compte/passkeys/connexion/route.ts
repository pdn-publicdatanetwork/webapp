import { NextResponse } from "next/server";
import { authentifier, contexte, effacerDefi, lireDefi, optionsAuthentification, poserDefi } from "@/lib/passkeys";
import { authAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Connexion par clé d'accès pour les comptes du site, sans mot de passe :
// la clé désigne le compte. Après vérification, le serveur émet un lien de
// connexion à usage unique (magic link Supabase) que le navigateur suit :
// la session est ouverte sans jamais exposer de mot de passe.
export async function POST(req: Request) {
  const ctx = contexte(req);
  if (!ctx) return NextResponse.json({ error: "indisponible sur cette adresse" }, { status: 400 });
  const origine = req.headers.get("origin");
  if (origine !== ctx.origine) return NextResponse.json({ error: "origine refusée" }, { status: 403 });
  const b = (await req.json().catch(() => null)) as { action?: string; reponse?: unknown } | null;
  if (b?.action === "options") {
    const options = await optionsAuthentification(ctx.rpID);
    const res = NextResponse.json({ options }, { headers: { "Cache-Control": "no-store" } });
    poserDefi(res, options.challenge, "", "/api/compte/passkeys/connexion");
    return res;
  }
  const defi = lireDefi(req, "");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userId = defi && b?.reponse ? await authentifier(ctx, defi, b.reponse as any) : null;
  if (!userId) return NextResponse.json({ error: "clé d'accès refusée" }, { status: 401 });
  const db = authAdmin();
  const { data: compte } = await db.auth.admin.getUserById(userId);
  const u = compte.user as (typeof compte.user & { banned_until?: string }) | null;
  if (!u?.email || !u.email_confirmed_at || u.banned_until) return NextResponse.json({ error: "compte indisponible" }, { status: 403 });
  const { data, error } = await db.auth.admin.generateLink({ type: "magiclink", email: u.email, options: { redirectTo: `${ctx.origine}/connexion` } });
  if (error || !data.properties?.action_link || data.user?.id !== userId) return NextResponse.json({ error: "connexion impossible" }, { status: 500 });
  const res = NextResponse.json({ ok: true, lien: data.properties.action_link }, { headers: { "Cache-Control": "no-store" } });
  effacerDefi(res, "/api/compte/passkeys/connexion");
  return res;
}
