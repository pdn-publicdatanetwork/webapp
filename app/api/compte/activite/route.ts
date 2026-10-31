import { NextResponse } from "next/server";
import { authAdmin } from "@/lib/supabaseAdmin";
import { normalizeEmail } from "@/lib/tokens";
import { utilisateur } from "@/lib/userAuth";

export const dynamic = "force-dynamic";

// Mon activité : traces récentes sur les pages du compte (appareil et
// adresse IP), conservées 90 jours. La visite en cours est notée, puis
// l'historique est renvoyé (20 dernières lignes).
export async function GET(req: Request) {
  const user = await utilisateur(req);
  if (!user) return NextResponse.json({ error: "non connecté" }, { status: 401 });
  const db = authAdmin();
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim().slice(0, 60);
  const agent = (req.headers.get("user-agent") ?? "").slice(0, 200);
  await db.from("activite_connexions").insert({ user_id: user.id, email: normalizeEmail(user.email!), ip, agent, type: "visite" });
  db.from("activite_connexions").delete().lt("cree_le", new Date(Date.now() - 90 * 86400_000).toISOString()).then(() => {}, () => {});
  const { data } = await db.from("activite_connexions")
    .select("cree_le, ip, agent, type").eq("user_id", user.id).order("cree_le", { ascending: false }).limit(20);
  return NextResponse.json({ activite: data ?? [] });
}