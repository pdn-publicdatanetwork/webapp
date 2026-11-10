import { NextResponse, type NextRequest } from "next/server";

// Mode maintenance : la webapp (www.dataparl.fr) coupe le site public via la
// table maintenance_etat du projet Supabase dataparl-auth ; l'app Jobs dédiée
// (projet Vercel separe, Root Directory jobs/) suit la meme regle : tout coupe,
// sauf les IP exemptees (maintenance_etat.ips_autorisees, IPv4/IPv6 exactes ou
// prefixe avec « * »). Cache 30 s : bascule sans redéploiement.
// Sorties : dernier etat connu (defaut : site ouvert) ; le cron Vercel
// /api/stats/resume reste joignable (machine, pas un visiteur).
const AUTH_SUPABASE_URL = process.env.NEXT_PUBLIC_AUTH_SUPABASE_URL ?? "https://kuywydrsfuixppchugpe.supabase.co";
const AUTH_SUPABASE_KEY = process.env.NEXT_PUBLIC_AUTH_SUPABASE_KEY ?? "sb_publishable_oYCbgl4J2fz9RnwOmsEz9w_DMVp-rZ6";

let cache: { le: number; active: boolean; ips: string[] } | null = null;
const DUREE_MS = 30_000;

async function etatMaintenance(): Promise<{ active: boolean; ips: string[] }> {
  if (cache && Date.now() - cache.le < DUREE_MS) return { active: cache.active, ips: cache.ips };
  try {
    const r = await fetch(
      `${AUTH_SUPABASE_URL}/rest/v1/maintenance_etat?id=eq.1&select=active,ips_autorisees`,
      {
        headers: { apikey: AUTH_SUPABASE_KEY, Authorization: `Bearer ${AUTH_SUPABASE_KEY}` },
        cache: "no-store",
        signal: AbortSignal.timeout(1500),
      },
    );
    if (!r.ok) throw new Error(String(r.status));
    const l = (await r.json()) as { active: boolean; ips_autorisees: string[] | null }[];
    cache = { le: Date.now(), active: l[0]?.active === true, ips: l[0]?.ips_autorisees ?? [] };
  } catch {
    cache = { le: Date.now() - DUREE_MS + 10_000, active: cache?.active ?? false, ips: cache?.ips ?? [] };
  }
  return { active: cache.active, ips: cache.ips };
}

function ipExemptee(ip: string, ips: string[]): boolean {
  if (!ip) return false;
  const mienne = ip.trim().toLowerCase();
  return ips.some((e) => {
    const entree = e.trim().toLowerCase();
    if (entree.endsWith("*")) return mienne.startsWith(entree.slice(0, -1));
    return mienne === entree;
  });
}

const PAGE_503 = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>DataParl' Jobs : maintenance en cours</title>
<style>
body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}
main{text-align:center;max-width:32rem;padding:2rem}
h1{font-size:1.5rem;margin-bottom:.5rem}
p{line-height:1.6;color:#94a3b8}
</style>
</head>
<body>
<main>
<h1>Maintenance en cours</h1>
<p>DataParl' Jobs est momentanément indisponible pour une mise à jour de l'authentification. Le site revient le mercredi 11 novembre à 17 h, merci de votre patience.</p>
<p>Une question ? <a href="https://www.dataparl.fr/contact" style="color:#7dd3fc">Contactez-nous</a></p>
</main>
</body>
</html>`;

export async function middleware(requete: NextRequest) {
  const chemin = requete.nextUrl.pathname;
  // Cron Vercel du resume Slack : appel serveur, pas un visiteur.
  if (chemin === "/api/stats/resume") return NextResponse.next();

  // URL de déploiement (*.vercel.app, preview) : toujours ouverte, même en
  // maintenance. Les « Deployment Checks » Vercel interrogent cette URL,
  // pas le domaine de production : sans cette exemption, les checks
  // échouent sur le 503 et le déploiement n'est jamais promu en
  // production tant que la maintenance est active.
  const hote = (requete.headers.get("host") ?? "").toLowerCase();
  if (hote.endsWith(".vercel.app")) return NextResponse.next();

  const { active, ips } = await etatMaintenance();
  if (active) {
    const xff = requete.headers.get("x-forwarded-for") ?? "";
    const ip = (xff.split(",")[0] || requete.headers.get("x-real-ip") || "").trim();
    if (!ipExemptee(ip, ips)) {
      return new NextResponse(PAGE_503, {
        status: 503,
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Retry-After": "3600" },
      });
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|icon.svg|apple-icon).*)"],
};
