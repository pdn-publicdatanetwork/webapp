import { NextResponse } from "next/server";
import { publierHome } from "@/lib/slackHome";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Events API de l'app Slack : Request URL à configurer dans
// Slack → Features → Event Subscriptions (à activer) :
//   https://www.dataparl.fr/api/slack/events?t=<MAINTENANCE_TOKEN>
// S'abonner à l'événement « app_home_opened » (Subscribe to bot events) :
// à l'ouverture du Home tab de l'app, on le publie (views.publish).

export async function POST(req: Request) {
  const attendu = process.env.MAINTENANCE_TOKEN ?? "";
  const u = new URL(req.url);
  if (!attendu || u.searchParams.get("t") !== attendu) {
    return NextResponse.json({ text: "Non autorisé." }, { status: 401 });
  }
  const charge = (await req.json().catch(() => null)) as {
    type?: string; challenge?: string;
    event?: { type?: string; user?: string };
  } | null;
  if (!charge) return NextResponse.json({});
  if (charge.type === "url_verification") {
    return NextResponse.json({ challenge: charge.challenge ?? "" });
  }
  if (charge.type === "event_callback" && charge.event?.type === "app_home_opened") {
    await publierHome(charge.event.user ?? "");
    return NextResponse.json({});
  }
  return NextResponse.json({});
}
