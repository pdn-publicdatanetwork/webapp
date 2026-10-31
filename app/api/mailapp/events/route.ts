import { NextResponse } from "next/server";
import { publierHomeMail } from "@/lib/mailappClient";
import { homeMailVue } from "@/lib/mailappViews";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Events Request URL de l'app dédiée « DataParl Mail »
// (?t=<MAINTENANCE_TOKEN>) : app_home_opened publie le Home tab.

export async function POST(req: Request) {
  const attendu = process.env.MAINTENANCE_TOKEN ?? "";
  const u = new URL(req.url);
  if (!attendu || u.searchParams.get("t") !== attendu) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  let charge: { type?: string; challenge?: string; event?: { type?: string; user?: string } } = {};
  try { charge = (await req.json()) as typeof charge; } catch { return NextResponse.json({}); }
  if (charge.type === "url_verification") return NextResponse.json({ challenge: charge.challenge ?? "" });
  if (charge.type === "event_callback" && charge.event?.type === "app_home_opened" && charge.event.user) {
    await publierHomeMail(charge.event.user, await homeMailVue());
  }
  return NextResponse.json({});
}
