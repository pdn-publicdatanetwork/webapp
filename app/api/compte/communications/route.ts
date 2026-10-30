import { NextResponse } from "next/server";
import { z } from "zod";
import { logConsent } from "@/lib/consent";
import { authAdmin } from "@/lib/supabaseAdmin";
import { normalizeEmail } from "@/lib/tokens";
import { utilisateur } from "@/lib/userAuth";

export const dynamic = "force-dynamic";

const Corps = z.object({ newsletter: z.boolean().optional(), tracking: z.boolean().optional() });

// GET : état des communications de la personne — newsletter (la newsletter
// DataParl') et suivi (pixels d'ouverture et liens tracés).
export async function GET(req: Request) {
  const user = await utilisateur(req);
  if (!user) return NextResponse.json({ error: "non connecté" }, { status: 401 });
  const email = normalizeEmail(user.email!);
  const db = authAdmin();
  const [{ data: prefs }, { data: sub }] = await Promise.all([
    db.from("communication_preferences").select("newsletter_enabled, alertes_enabled, tracking_optout").eq("email", email).maybeSingle(),
    db.from("newsletter_subscribers").select("confirmed, unsubscribed_at").eq("email", email).maybeSingle(),
  ]);
  return NextResponse.json({
    newsletter: !!sub?.confirmed && !sub?.unsubscribed_at && prefs?.newsletter_enabled !== false,
    alertes: !!prefs?.alertes_enabled,
    suivi: prefs?.tracking_optout !== true,
  });
}

// PUT : modifie la newsletter et le suivi, indépendamment l'un de l'autre
// et indépendamment des alertes. Chaque changement est journalisé.
export async function PUT(req: Request) {
  const user = await utilisateur(req);
  if (!user) return NextResponse.json({ error: "connexion requise" }, { status: 401 });
  const parsed = Corps.safeParse(await req.json().catch(() => null));
  if (!parsed.success || (parsed.data.newsletter === undefined && parsed.data.tracking === undefined)) {
    return NextResponse.json({ error: "rien à enregistrer" }, { status: 400 });
  }
  const email = normalizeEmail(user.email!);
  const db = authAdmin();
  const now = new Date().toISOString();
  if (typeof parsed.data.newsletter === "boolean") {
    const actif = parsed.data.newsletter;
    await db.from("communication_preferences").upsert({ email, newsletter_enabled: actif, updated_at: now });
    if (actif) {
      await db.from("newsletter_subscribers").upsert(
        { email, user_id: user.id, confirmed: true, confirmed_at: now, unsubscribed_at: null, confirm_token_hash: null, confirm_expires_at: null, source: "compte" },
        { onConflict: "email" },
      );
      await logConsent(email, "subscribe", "newsletter");
    } else {
      await db.from("newsletter_subscribers").update({ unsubscribed_at: now }).eq("email", email);
      await logConsent(email, "unsubscribe", "newsletter");
    }
  }
  if (typeof parsed.data.tracking === "boolean") {
    await db.from("communication_preferences").upsert({ email, tracking_optout: !parsed.data.tracking, updated_at: now });
    await logConsent(email, "prefs_update", "compte");
  }
  return NextResponse.json({ ok: true });
}