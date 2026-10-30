import { NextResponse } from "next/server";
import { utilisateur } from "@/lib/userAuth";
import { fournisseurs } from "@/lib/userAuth";
import { authAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// POST /api/journal-connexion : appelé par JournalConnexion à chaque nouvelle
// session détectée côté client. Journalise l'événement avec IP, user-agent et
// appareil déduit (public.journal_connexions). Dédoublonnage : un triple
// identique (compte, IP, user-agent) dans les 5 minutes est ignoré : les
// rafraîchissements de page ne créent pas de fausses connexions.

function appareilDepuis(ua: string): string {
  const os = /iPhone|iPad|iPod/.test(ua) ? "iOS"
    : /Android/.test(ua) ? "Android"
    : /Mac OS X/.test(ua) ? "macOS"
    : /Windows/.test(ua) ? "Windows"
    : /Linux/.test(ua) ? "Linux" : "OS inconnu";
  const nav = /CriOS|Chrome\//.test(ua) ? "Chrome"
    : /FxiOS|Firefox\//.test(ua) ? "Firefox"
    : /Edg(e|A|iOS)?\//.test(ua) ? "Edge"
    : /Safari\//.test(ua) ? "Safari" : "navigateur inconnu";
  const type = /Mobi|iPhone|iPad|Android/.test(ua) ? "mobile" : "ordinateur";
  return `${type}, ${os}, ${nav}`;
}

export async function POST(req: Request) {
  const user = await utilisateur(req);
  if (!user) return NextResponse.json({ error: "non_connecte" }, { status: 401 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const ua = req.headers.get("user-agent") ?? null;
  const db = authAdmin();

  // Dédoublonnage 5 minutes (compte + IP + user-agent identiques).
  const { data: recente } = await db.from("journal_connexions")
    .select("id")
    .eq("user_id", user.id)
    .eq("ip", ip ?? "")
    .gte("le", new Date(Date.now() - 5 * 60_000).toISOString())
    .limit(1);
  if (recente?.length) return NextResponse.json({ ok: true, deduplique: true });

  const { error } = await db.from("journal_connexions").insert({
    user_id: user.id,
    ip,
    user_agent: ua ? ua.slice(0, 400) : null,
    appareil: ua ? appareilDepuis(ua) : null,
    fournisseur: fournisseurs(user).join(", ") || null,
  });
  if (error) return NextResponse.json({ error: "insertion_impossible" }, { status: 500 });

  return NextResponse.json({ ok: true });
}