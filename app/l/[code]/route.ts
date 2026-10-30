import { NextResponse } from "next/server";
import { appareilDe, CODE, masquerIp, sourceDe } from "@/lib/liens";
import { authAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Lien tracé : enregistre le clic (provenance, pays, IP tronquée) puis redirige.
// Les éventuels paramètres utm_* de l'adresse courte (ex. l/daily?utm_source=x)
// sont transmis à la destination, pour l'attribution dans l'outil de mesure :
// seulement s'ils sont explicitement mis dans le lien partagé. Sans eux, la
// destination est servie telle quelle : le clic reste compté ici, sans pistage.
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const accueil = NextResponse.redirect("https://www.dataparl.fr/", 302);
  if (!CODE.test(code)) return accueil;
  const db = authAdmin();
  const { data } = await db.from("liens").select("destination, actif").eq("code", code).maybeSingle();
  if (!data?.actif) return accueil;
  const u = new URL(req.url);
  const h = req.headers;
  {
    const { error } = await db.from("liens_clics").insert({
      code, ip: masquerIp(h.get("x-forwarded-for")), pays: h.get("x-vercel-ip-country"),
      source: sourceDe(h.get("referer"), u.searchParams.get("utm_source")), referent: (h.get("referer") ?? "").slice(0, 300) || null,
      utm_source: u.searchParams.get("utm_source")?.slice(0, 60) ?? null, appareil: appareilDe(h.get("user-agent")),
    });
    if (error) console.error("lien tracé", error.message);
  }
  let destination = data.destination as string;
  const utm = (["utm_source", "utm_medium", "utm_campaign"] as const)
    .map((k) => [k, u.searchParams.get(k)] as const)
    .filter(([, v]) => v);
  if (utm.length) {
    const d = new URL(destination);
    for (const [k, v] of utm) d.searchParams.set(k, (v as string).slice(0, 120));
    destination = d.toString();
  }
  return NextResponse.redirect(destination, { status: 302, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex", "Referrer-Policy": "no-referrer" } });
}
