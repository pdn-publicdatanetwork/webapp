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

// Page de maintenance (design Théo, 10/11/2026) : autonome, aucune requête
// externe (pas de CDN, pas de webfonts) pour respecter « sans pistage ».
// Le formulaire « M'avertir » passe par /maintenance/prevenir ci-dessous.
const PAGE_MAINTENANCE = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Maintenance en cours — DataParl' Jobs</title>
<meta name="robots" content="noindex, nofollow">
<style>
:root{--bg:#F0F4FD;--violet:#9333EA;--violetBg:#E9D5FF;--violetClair:#F3E8FF;--encre:#3B273E;--encreHover:#2A1B2C;--texte:#1E1B4B;--muet:#64748B;--vert:#10B981}
*{box-sizing:border-box}
body{margin:0;font-family:system-ui,"Segoe UI",sans-serif;background:var(--bg);color:var(--texte);min-height:100vh;display:flex;flex-direction:column}
.cadre{max-width:64rem;margin:0 auto;padding:0 1.5rem;width:100%}
header{padding-top:1.5rem}
.entete{display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap}
.marque{display:flex;align-items:center;gap:.75rem}
h1.logo{font-family:Georgia,"Times New Roman",serif;font-weight:700;font-size:1.5rem;margin:0;color:var(--encre)}
.logo span{background:var(--violetBg);color:var(--encre);padding:.15rem .45rem;border-radius:.5rem;margin-left:.15rem;display:inline-block}
.pastille{background:#fff;color:var(--muet);font-size:.75rem;font-weight:600;padding:.25rem .7rem;border-radius:1rem;border:1px solid rgba(148,163,184,.25)}
.dot{display:inline-block;width:.5rem;height:.5rem;border-radius:50%;background:#f59e0b;margin-right:.4rem;animation:puls 1.5s infinite}
@keyframes puls{0%,100%{opacity:1}50%{opacity:.35}}
main{flex:1;display:flex;align-items:center;padding:1.5rem 0}
.carte{max-width:52rem;margin:0 auto;background:#fff;border-radius:1.5rem;padding:2rem 1.5rem;box-shadow:0 1px 2px rgba(0,0,0,.05);border:1px solid #f1f5f9;text-align:center}
@media(min-width:768px){.carte{padding:3rem}}
.badge{display:inline-block;background:var(--violetClair);color:var(--violet);font-size:.75rem;font-weight:600;padding:.35rem .85rem;border-radius:1rem;margin-bottom:1.5rem}
h2{font-family:Georgia,"Times New Roman",serif;font-size:2rem;font-weight:700;color:var(--encre);margin:0 0 1rem;letter-spacing:-.02em;line-height:1.2}
@media(min-width:768px){h2{font-size:2.75rem}}
h2 span{background:var(--violetBg);padding:.15rem .7rem;border-radius:1rem;font-style:italic;display:inline-block}
.intro{color:#475569;max-width:42rem;margin:0 auto 2rem;line-height:1.7}
.avancement{max-width:28rem;margin:0 auto 2.5rem;background:#f8fafc;border:1px solid #f1f5f9;border-radius:1rem;padding:1rem}
.avancement .lignes{display:flex;justify-content:space-between;font-size:.75rem;font-weight:600;color:#475569;margin-bottom:.5rem}
.avancement .pct{color:var(--violet);font-weight:700}
.barre{background:#e2e8f0;height:.6rem;border-radius:1rem;overflow:hidden}
.barre div{background:linear-gradient(90deg,#a855f7,#6366f1);height:100%;width:75%;border-radius:1rem}
.note{font-size:.75rem;color:#94a3b8;margin:.5rem 0 0}
.previens{max-width:28rem;margin:0 auto 2rem;background:rgba(240,244,253,.5);border:1px solid rgba(148,163,184,.3);border-radius:1rem;padding:1.5rem}
.previens h3{font-size:.875rem;font-weight:600;color:var(--encre);margin:0 0 .25rem}
.previens p{font-size:.75rem;color:var(--muet);margin:0 0 1rem}
form{display:flex;flex-direction:column;gap:.5rem}
@media(min-width:480px){form{flex-direction:row}}
input{flex:1;padding:.65rem 1rem;border:1px solid #e2e8f0;border-radius:.75rem;font-size:.875rem;background:#fff;color:var(--texte)}
input:focus{outline:none;border-color:var(--violet);box-shadow:0 0 0 3px rgba(147,51,234,.15)}
button{background:var(--encre);color:#fff;font-size:.875rem;font-weight:600;padding:.65rem 1.25rem;border-radius:.75rem;border:0;cursor:pointer;white-space:nowrap}
button:hover{background:var(--encreHover)}
.ok{font-size:.75rem;color:#059669;font-weight:600;margin:.75rem 0 0}
.erreur{font-size:.75rem;color:#dc2626;font-weight:600;margin:.75rem 0 0}
.statut{padding-top:1.25rem;border-top:1px solid #f1f5f9;font-size:.75rem;color:var(--muet)}
.statut a{color:var(--violet);font-weight:600;text-decoration:none}
.statut a:hover{text-decoration:underline}
.vert{display:inline-block;width:.45rem;height:.45rem;border-radius:50%;background:var(--vert);margin-right:.35rem}
footer{padding:1.5rem;text-align:center;font-size:.75rem;color:var(--muet)}
</style>
</head>
<body>
<div class="cadre">
<header>
<div class="entete">
<div class="marque">
<h1 class="logo">Data<span>Parl'</span></h1>
<span class="pastille">Jobs</span>
</div>
<span class="pastille"><span class="dot"></span>Maintenance programmée</span>
</div>
</header>
<main>
<div class="carte">
<div class="badge">✨ Mettre à jour la plateforme</div>
<h2>Maintenance <span>en cours</span></h2>
<p class="intro">Notre plateforme dédiée aux offres de collaborateurs parlementaires et talents du secteur public fait peau neuve. L'accès aux offres et aux espaces de candidature sera rapidement rétabli.</p>
<div class="avancement">
<div class="lignes"><span>Avancement de la mise à jour</span><span class="pct">75%</span></div>
<div class="barre"><div></div></div>
<p class="note">Réouverture : mercredi 11 novembre à 17 h</p>
</div>
<div class="previens">
<h3>Être averti de la réouverture</h3>
<p>Recevez un e-mail dès que le service est de nouveau disponible.</p>
<form id="f">
<input type="email" id="e" placeholder="votre.email@exemple.fr" required maxlength="254" autocomplete="email">
<button type="submit">M'avertir</button>
</form>
<p id="r" hidden></p>
</div>
<div class="statut">
<span class="vert"></span>Pour suivre l'état des systèmes en direct : <a href="https://status.dataparl.fr" rel="noopener">status.dataparl.fr</a>
</div>
</div>
</main>
</div>
<footer>© 2026 DataParl' Jobs, Les talents au service du Parlement. Tous droits réservés.</footer>
<script>
document.getElementById("f").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const champ = document.getElementById("e");
  const res = document.getElementById("r");
  const adresse = champ.value.trim();
  if (!adresse) return;
  res.hidden = false; res.className = ""; res.textContent = "Envoi…";
  try {
    const r = await fetch("/maintenance/prevenir", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: adresse }),
    });
    if (r.ok) { res.className = "ok"; res.textContent = "✓ C'est noté : un e-mail de confirmation arrive dans votre boîte, un clic dessus et vous serez prévenu·e du retour."; champ.value = ""; }
    else { res.className = "erreur"; res.textContent = "Inscription impossible, réessayez dans quelques minutes."; }
  } catch {
    res.className = "erreur"; res.textContent = "Inscription impossible, réessayez dans quelques minutes.";
  }
});
</script>
</body>
</html>`;

// Relais serveur du formulaire « M'avertir » vers le double opt-in de la
// webapp (le proxy www refuse les POST cross-site, on poste donc serveur à
// serveur depuis le middleware).
async function relaisPrevenir(requete: NextRequest): Promise<NextResponse> {
  const corps = await requete.json().catch(() => null) as { email?: unknown } | null;
  const email = typeof corps?.email === "string" ? corps.email : "";
  if (!email || email.length > 254) {
    return NextResponse.json({ error: "adresse invalide" }, { status: 400 });
  }
  try {
    const r = await fetch("https://www.dataparl.fr/api/maintenance/prevenir", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
      signal: AbortSignal.timeout(8000),
    });
    if (r.ok) return NextResponse.json({ ok: true });
    return NextResponse.json({ error: "inscription impossible" }, { status: 502 });
  } catch {
    return NextResponse.json({ error: "inscription impossible" }, { status: 502 });
  }
}

export async function middleware(requete: NextRequest) {
  const chemin = requete.nextUrl.pathname;
  // Cron Vercel du resume Slack : appel serveur, pas un visiteur.
  if (chemin === "/api/stats/resume") return NextResponse.next();
  // Porte unique auth.dataparl.fr : /connexion renvoie à la porte (Firebase
  // Hosting) avec la destination (?suite=) pour le retour après connexion.
  // Exception : les liens magiques en vol (oobCode/mode/apiKey), finalisés
  // par la porte React qui reste en place.
  if (chemin === "/connexion" &&
      !["oobCode", "mode", "apiKey"].some((p) => requete.nextUrl.searchParams.has(p))) {
    const suiteBrute = requete.nextUrl.searchParams.get("suite") ?? "";
    const suite = suiteBrute.startsWith("/") && !suiteBrute.startsWith("//") && !suiteBrute.includes("\\") ? suiteBrute : "/";
    return NextResponse.redirect(`https://auth.dataparl.fr/?hote=jobs.dataparl.fr&suite=${encodeURIComponent(suite)}`, 302);
  }

  // Le centre de compte vit désormais sur my.dataparl.fr (rubrique Jobs) :
  // l'ancienne adresse redirige en 308. L'espace candidat détaillé reste
  // joignable quand un onglet est demandé (?onglet=candidatures, alertes ou
  // profil : liens depuis la rubrique Jobs de my.dataparl.fr).
  if (chemin === "/mon-compte" && !requete.nextUrl.searchParams.has("onglet")) {
    return NextResponse.redirect("https://my.dataparl.fr/jobs", 308);
  }

  // Relais du formulaire « M'avertir » de la page de maintenance.
  if (chemin === "/maintenance/prevenir" && requete.method === "POST") return relaisPrevenir(requete);

  // URL de déploiement (*.vercel.app, preview) : toujours ouverte, même en
  // maintenance. Les « Deployment Checks » Vercel interrogent cette URL,
  // pas le domaine de production.
  const hote = (requete.headers.get("host") ?? "").toLowerCase();
  if (hote.endsWith(".vercel.app")) return NextResponse.next();

  const { active, ips } = await etatMaintenance();
  if (active) {
    const xff = requete.headers.get("x-forwarded-for") ?? "";
    const ip = (xff.split(",")[0] || requete.headers.get("x-real-ip") || "").trim();
    if (!ipExemptee(ip, ips)) {
      // 200 (et non 503) : la page de maintenance de la webapp est servie
      // en 200 ; les Deployment Checks Vercel refusent tout statut d'erreur
      // et bloquaient la promotion des déploiements jobs tant que la
      // maintenance était active. noindex dans la page.
      return new NextResponse(PAGE_MAINTENANCE, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
      });
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|icon.svg|apple-icon).*)"],
};
