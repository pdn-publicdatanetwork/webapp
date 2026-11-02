import { NextResponse } from "next/server";
import { z } from "zod";
import { authAdmin } from "@/lib/supabaseAdmin";
import { normalizeEmail } from "@/lib/tokens";
import { utilisateur } from "@/lib/userAuth";
import { mailEmailPrincipalModifie } from "@/lib/securiteMail";

export const dynamic = "force-dynamic";

const Corps = z.object({ email: z.string().email().max(320) });

// PUT : demande de changement de l'adresse email principale. La confirmation
// (simple ou double selon la configuration du projet) est gérée par Supabase,
// qui envoie lui-même le(s) e-mail(s) de confirmation à la nouvelle adresse.
// Les réglages indexés par adresse (alertes, newsletter, préférences) suivent.
export async function PUT(req: Request) {
  const user = await utilisateur(req);
  if (!user) return NextResponse.json({ error: "non connecté" }, { status: 401 });
  const parsed = Corps.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "adresse invalide" }, { status: 400 });
  const nouveau = normalizeEmail(parsed.data.email);
  const ancien = normalizeEmail(user.email!);
  if (nouveau === ancien) return NextResponse.json({ error: "c'est déjà l'adresse de ton compte" }, { status: 400 });
  const db = authAdmin();
  const { data, error } = await db.auth.admin.updateUserById(user.id, { email: nouveau });
  if (error) {
    const m = error.message ?? "";
    if (/already|exists|registered|has already/i.test(m))
      return NextResponse.json({ error: "cette adresse est déjà utilisée par un compte DataParl'" }, { status: 409 });
    return NextResponse.json({ error: "changement impossible, réessaie plus tard" }, { status: 500 });
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  // Les réglages indexés par adresse suivent le compte ; la notification part
  // vers l'adresse encore active à l'instant de la demande.
  await Promise.allSettled([
    db.from("alert_subscriptions").update({ email: nouveau }).eq("email", ancien),
    db.from("communication_preferences").update({ email: nouveau }).eq("email", ancien),
    db.from("newsletter_subscribers").update({ email: nouveau }).eq("email", ancien),
    mailEmailPrincipalModifie(user.id, ancien, nouveau, ip),
  ]);
  const enAttente = !!(data?.user as { new_email?: string } | undefined)?.new_email;
  return NextResponse.json({ ok: true, confirmation: enAttente ? "nouvelle-adresse" : "immediate" });
}
