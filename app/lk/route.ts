// Lien court LinkedIn (dataparl.fr/lk) — campagne de lancement. Les crawlers
// sociaux (LinkedIn, WhatsApp, Slack…) reçoivent une page HTML Open Graph :
// JAMAIS de 302 ni de meta refresh pour eux, sinon « Impossible d'afficher
// l'aperçu du lien » (vérifier via LinkedIn Post Inspector). Un humain :
// clic journalisé dans liens_clics (code « lk ») puis 302 vers la destination
// de la table liens. Une erreur de log ne blouve jamais la redirection.
import { NextResponse } from "next/server";
import { appareilDe, masquerIp, sourceDe } from "@/lib/liens";
import { authAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Aperçu social : carte Open Graph statique, noindex (la page de prévisualisation
// ne doit pas se retrouver indexée). L'image OG du site (app/opengraph-image.tsx)
// est servie par Next à l'adresse /opengraph-image.
function apercuSocial(): NextResponse {
  const html = [
    "<!DOCTYPE html><html lang=\"fr\"><head><meta charset=\"utf-8\">",
    "<meta name=\"robots\" content=\"noindex\">",
    "<title>DataParl' : le Parlement, pièce par pièce</title>",
    "<meta property=\"og:site_name\" content=\"DataParl'\">",
    "<meta property=\"og:title\" content=\"DataParl' : le Parlement, pièce par pièce\">",
    "<meta property=\"og:description\" content=\"Qui travaille vraiment pour votre députө, sénateur ou députée euroséen ? Les collaborateurs parlementaires, les arrivées et les déptarts, depuis 2015.\">",
    "<meta property=\"og:type\" content=\"website\">",
    "<meta property=\"og:url\" content=\"https://www.dataparl.fr/\">",
    "<meta property=\"og:image\" content=\"https://www.dataparl.fr/opengraph-image\">",
    "<meta name=\"twitter:card\" content=\"summary_large_image\">",
    "</head><body>",
    "<p><a href=\"https://www.dataparl.fr/\">DataParl' : le Parlement, piêce par pièce →</a></p>",
    "</body></html>",
  ].join("");
  return new NextResponse(html, {
    status:  200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=3600", "X-Robots-Tag": "noindex" },
  });
}

export async function GET(req: Request) {
  const h = req.headers;
  // Crawler social ou outil de prévisualisation : carte Open Graph, pas de log.
  if (appareilDe(h.get("user-agent")) === "robot") return apercuSocial();

  const db = authAdmin();
  const { data } = await db.from("liens").select("destination, actif").eq("code", "lk").maybeSingle();
  if (!data?.actif) return NextResponse.redirect("https://www.dataparl.fr/", 302);

  const u = new URL(req.url);
  {
    const { error } = await db.from("liens_clics").insert({
      code: "lk", ip: masquerIp(h.get("x-forwarded-for")), pays: h.get("x-vercel-ip-country"),
      source: sourceDe(h.get("referer"), u.searchParams.get("utm_source")), referent: (h.get("referer") ?? "").slice(0, 300) || null,
      utm_source: u.searchParams.get("utm_source")?.slice(0, 60) ?? null, appareil: appareilDe(h.get("user-agent")),
    });
    if (error) console.error("lien lk", error.message);
  }
  return NextResponse.redirect(data.destination as string, {
    status: 302,
    headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex", "Referrer-Policy": "no-referrer" },
  });
}
