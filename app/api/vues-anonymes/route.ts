import { NextResponse } from "next/server";
import { authAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// POST /api/vues-anonymes — page vue d'un visiteur SANS compte (appelé par
// PageTrace uniquement après consentement de mesure d'audience). L'identifiant
// du visiteur est un uuid local (localStorage, jamais associé à un compte),
// l'IP et le user-agent sont captés côté serveur. Conservation 90 jours,
// consultation réservée à l'admin (fiches /admin/users/anon/<visiteur>).

const CHEMIN = /^\/[a-z0-9/_-]*$/i;
const ORIGINE = /^(https?:\/\/[a-z0-9:./?=&%#_-]{1,300}|\/[a-z0-9/_-]{0,299})$/i;
const VISITEUR = /^[a-z0-9-]{8,40}$/;

export async function POST(req: Request) {
  let corps: { chemin?: string; origine?: string | null; visiteur?: string };
  try { corps = await req.json(); } catch {
    return NextResponse.json({ error: "requete_invalide" }, { status: 400 });
  }
  const chemin = corps.chemin ?? "";
  const visiteur = corps.visiteur ?? "";
  if (!CHEMIN.test(chemin) || chemin.length < 1 || !VISITEUR.test(visiteur)) {
    return NextResponse.json({ error: "requete_invalide" }, { status: 400 });
  }
  const origine = corps.origine && ORIGINE.test(corps.origine) ? corps.origine.slice(0, 300) : null;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const ua = req.headers.get("user-agent")?.slice(0, 400) ?? null;

  const db = authAdmin();

  // Dédoublonnage : la même page vue par le même visiteur dans les 10 minutes
  // est ignorée (retours arrière, rechargements) et bloque le spam simple.
  const { data: deja } = await db.from("vues_anonymes")
    .select("id")
    .eq("visiteur", visiteur)
    .eq("chemin", chemin)
    .gte("le", new Date(Date.now() - 10 * 60_000).toISOString())
    .limit(1);
  if (deja?.length) return NextResponse.json({ ok: true, deduplique: true });

  const { error } = await db.from("vues_anonymes").insert({ visiteur, chemin, origine, ip, user_agent: ua });
  if (error) return NextResponse.json({ error: "insertion_impossible" }, { status: 500 });

  // Purge : au-delà de 90 jours, effacé.
  await db.from("vues_anonymes").delete().lt("le", new Date(Date.now() - 90 * 86400_000).toISOString());

  return NextResponse.json({ ok: true });
}