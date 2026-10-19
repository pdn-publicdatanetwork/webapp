import { NextResponse, type NextRequest } from "next/server";
import { cheminsInactifs } from "./lib/pagesEtat";
import { estInactif } from "./lib/pagesRegistre";

// Routage par sous-domaine (un seul déploiement pour tous les hôtes) :
//   www.dataparl.fr         site public ; /api -> api.dataparl.fr
//   dataparl.fr             -> redirection 308 vers www
//   api.dataparl.fr         /v1/* -> /api/v1/* (l'API elle-même)
//                           /connexion servie telle quelle (OAuth PKCE sur la même origine)
//                           /api/* (routes internes des pages) servies telles quelles
//                           tout le reste -> /espace-api/* (site de l'API)
//   jobs.dataparl.fr        DataParl' Jobs sans préfixe : / -> /jobs,
//                           /proposer et /old-jobs -> /jobs/*, /<uuid>_<slug>
//                           -> /jobs/<slug> ; /sitemap, /informations-legales,
//                           /connexion et /api/* servis tels quels
//   admin.dataparl.fr       /x -> /admin/x, sauf /connexion et /api/*
//   webmail.dataparl.fr    /x -> /webmail/x, sauf /connexion et /api/*
//   mail.dataparl.fr        /lire/<jeton> (version en ligne des emails), le reste -> www
//   link.dataparl.fr        /<code> -> /l/<code> (liens tracés), le reste -> www
//   media.dataparl.fr       photos des élus et des ministres (/an|senat|pe|gouv)/…, le tableur
//                           DataParl' Sheets (/sheets/*, /search), l'export SVG
//                           du réseau (/assets/pe/reseau) et les exports CSV
//                           (/assets/collab/{an,senat,pe}.csv) ; tout autre
//                           chemin : message de 15 s puis bascule vers www
//   raw.dataparl.fr        /schemas/*.json (schémas de données bruts) ; le reste -> www
//   survey.dataparl.fr     / -> /enquete (questionnaire d'avis, jeton ?j=) ; le reste -> www
//   drive.dataparl.fr      ancien domaine du tableur -> media (308)
// Sur www, tout /jobs part vers jobs.dataparl.fr (sans le préfixe)
// Sur www : une page désactivée dans l'admin (Plan du site) répond 404.
// Anciens domaines (cavaparlement.eu, dataparl.com) : redirection 308 vers la
// même adresse sur dataparl.fr. Exceptions, servies telles quelles pendant la
// transition : /api/* (webhooks, formulaires déjà ouverts) et l'API /v1 sur
// api.cavaparlement.eu (clients existants).
// Sur admin, webmail et mail : pas d'indexation, pas d'intégration en iframe,
// pas de Referer transmis.
// Tout autre hôte (localhost, aperçus Vercel) : pas de réécriture.

const DOMAINE = "dataparl.fr";
const ANCIENS = ["cavaparlement.eu", "dataparl.com"];

// Slug d'offre DataParl' Jobs : <uuid>_<chambre>_<Prénom>_<NOM>_<intitulé>.
const SLUG_OFFRE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(_|$)/i;

// Anciennes adresses de l'espace admin -> nouvelles (réorganisation d'octobre 2026).
const REDIRECTIONS_ADMIN: [avant: string, apres: string][] = [
  ["/communication", "/presse"],
  ["/abonnes", "/users/abonnes"],
  ["/cles", "/users/api-keys"],
];
function nouvelCheminAdmin(p: string): string | null {
  for (const [avant, apres] of REDIRECTIONS_ADMIN) {
    if (p === avant || p.startsWith(`${avant}/`)) return apres + p.slice(avant.length);
  }
  return null;
}

// Ancien hôte -> nouvel hôte équivalent, ou null.
function nouvelHote(host: string): string | null {
  for (const ancien of ANCIENS) {
    if (host === ancien) return `www.${DOMAINE}`;
    if (host.endsWith(`.${ancien}`)) return `${host.slice(0, -ancien.length - 1)}.${DOMAINE}`;
  }
  return null;
}

function vers(req: NextRequest, host: string, pathname: string, status: 307 | 308) {
  const url = req.nextUrl.clone();
  url.protocol = "https:";
  url.host = host;
  url.port = "";
  url.pathname = pathname;
  return NextResponse.redirect(url, status);
}

function protege(res: NextResponse): NextResponse {
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "no-referrer");
  res.headers.set("X-Content-Type-Options", "nosniff");
  return res;
}

export async function proxy(req: NextRequest) {
  const host = (req.headers.get("host") ?? "").split(":")[0].toLowerCase();
  const path = req.nextUrl.pathname;

  // ── Mode maintenance ──────────────────────────────────────────────────────
  // Actif par défaut ; désactivable avec MAINTENANCE=0 dans l'environnement
  // Vercel (redéploiement inutile si la variable est déjà définie).
  // Passe tout le public (www, api, media, jobs, raw, mail, link, survey…)
  // sur la page /maintenance, SAUF :
  //   - l'espace équipe : admin.dataparl.fr et webmail.dataparl.fr (et /api) ;
  //   - la page de contact et son API (/contact, /api/contact) ;
  //   - le webhook mail (/api/mail/*, réception Resend qui alimente le webmail) ;
  //   - les assets techniques (_next, icônes) pour un rendu correct de la page.
  if (process.env.MAINTENANCE !== "0") {
    // Espace équipe + liens cliquables depuis les emails (mail/lire/<jeton>,
    // link/<code>) : les destinataires doivent pouvoir ouvrir les messages.
    const equipe = host === `admin.${DOMAINE}` || host === `webmail.${DOMAINE}` ||
      host === `mail.${DOMAINE}` || host === `link.${DOMAINE}`;
    const technique = path.startsWith("/_next/") || path === "/maintenance" ||
      path === "/favicon.ico" || path === "/icon.svg" || path === "/apple-icon" ||
      path === "/robots.txt" || path === "/manifest.webmanifest";
    const autorise = equipe || technique ||
      path === "/contact" || path === "/api/contact" ||
      // Pages légales requises par le formulaire de contact (politique de
      // confidentialité et mentions) : elles restent consultables.
      path === "/informations-legales" || path.startsWith("/informations-legales/") ||
      path === "/api/mail" || path.startsWith("/api/mail/");
    if (!autorise) {
      const url = req.nextUrl.clone();
      url.pathname = "/maintenance";
      url.search = "";
      const res2 = NextResponse.rewrite(url);
      res2.headers.set("Retry-After", "3600");
      return res2;
    }
  }


  const cible = nouvelHote(host);
  if (cible) {
    if (path.startsWith("/api/")) return NextResponse.next();
    if (host === "api.cavaparlement.eu" && (path === "/v1" || path.startsWith("/v1/"))) {
      const url = req.nextUrl.clone();
      url.pathname = `/api${path}`;
      return NextResponse.rewrite(url);
    }
    return vers(req, cible, path, 308);
  }
  if (host === DOMAINE) return vers(req, `www.${DOMAINE}`, path, 308);

  if (host === `api.${DOMAINE}`) {
    const url = req.nextUrl.clone();
    if (path === "/v1" || path.startsWith("/v1/")) {
      url.pathname = `/api${path}`;
      return NextResponse.rewrite(url);
    }
    if (path.startsWith("/api/") || path === "/connexion" || path.startsWith("/espace-api")) return NextResponse.next();
    url.pathname = `/espace-api${path === "/" ? "" : path}`;
    return NextResponse.rewrite(url);
  }

  // jobs.dataparl.fr : DataParl' Jobs vit à la racine, sans préfixe /jobs.
  if (host === `jobs.${DOMAINE}`) {
    if (path === "/" || path === "") {
      const url = req.nextUrl.clone();
      url.pathname = "/jobs";
      return NextResponse.rewrite(url);
    }
    if (path === "/proposer" || path === "/old-jobs" || SLUG_OFFRE.test(path.slice(1))) {
      const url = req.nextUrl.clone();
      url.pathname = `/jobs${path}`;
      return NextResponse.rewrite(url);
    }
    // Liens internes en /jobs/x : canonicalisation vers /x.
    if (path === "/jobs" || path.startsWith("/jobs/")) {
      const cibleJobs = path === "/jobs" ? "/" : path.slice("/jobs".length) || "/";
      return vers(req, `jobs.${DOMAINE}`, cibleJobs, 308);
    }
    // Sitemap, informations légales, CGU Jobs, connexion, API : servis tels quels.
    return NextResponse.next();
  }

  // mail.cavaparlement.eu : uniquement les versions en ligne des emails.
  if (host === `mail.${DOMAINE}`) {
    if (path.startsWith("/lire/")) return protege(NextResponse.next());
    // Favicon du domaine : Σ' blanc sur rouge, servi depuis /mail/*.
    if (path === "/icon.svg" || path === "/apple-icon") {
      const url = req.nextUrl.clone();
      url.pathname = `/mail${path}`;
      return protege(NextResponse.rewrite(url));
    }
    return vers(req, `www.${DOMAINE}`, "/", 307);
  }

  // media.dataparl.fr : les photos des élus et des groupes, le tableur
  // DataParl' Sheets (/sheets/*, /search), l'export SVG du réseau des
  // structures (/assets/pe/reseau ; l'ancien chemin /assets/collab-reseau
  // redirige en 308) et les exports CSV bruts des collaborateurs par chambre
  // (/assets/collab/{an,senat,pe}.csv, publiés aussi sur data.gouv.fr). Tout
  // autre chemin affiche un message pendant 15 secondes avant la bascule vers
  // www.dataparl.fr.
  if (host === `media.${DOMAINE}`) {
    if (/^\/(an|senat|pe|gouv)\/[^/]+\.png$/.test(path)) {
      const url = req.nextUrl.clone();
      // Ouverture directe dans un navigateur (pas une <img> du site, pas une aperçu
      // de lien) : page de crédit, à la même adresse. Jamais pour une demande d'image.
      const accept = req.headers.get("accept") ?? "";
      let interne = false;
      try { const r = new URL(req.headers.get("referer") ?? ""); interne = r.hostname === DOMAINE || r.hostname.endsWith(`.${DOMAINE}`); } catch { /* pas de Referer */ }
      // Les robots d'aperçu des réseaux (facebookexternalhit, Discordbot,
      // X, Telegram, WhatsApp, Slack, LinkedIn…) réclament l'og:image avec un
      // Accept « text/html » : leur servir la page de crédit casserait l'aperçu
      // (photo manquante sur Facebook, Discord, LinkedIn…). Seul un navigateur
      // humain voit la page de crédit.
      const robotApercu = /bot|crawl|spider|preview|facebookexternalhit|whatsapp|telegram|discord|slack|linkedin|pinterest|skype|validator|headless|curl|wget|python/i.test(req.headers.get("user-agent") ?? "");
      if (accept.includes("text/html") && !interne && !robotApercu) {
        url.pathname = "/photo-credit";
        url.search = `?img=${encodeURIComponent(path.slice(1))}`;
        const res = NextResponse.rewrite(url);
        res.headers.set("Cache-Control", "no-store");
        res.headers.set("X-Robots-Tag", "noindex");
        return res;
      }
      url.pathname = `/media${path}`;
      return NextResponse.rewrite(url);
    }
    // media.dataparl.fr/groupes/<sigle>-<chambre>-<législature>.png : logos des groupes.
    if (/^\/groupes\/[a-z0-9-]+-(an|senat|pe)-[IVXLC]+e\.png$/.test(path)) {
      const url = req.nextUrl.clone();
      url.pathname = `/media${path}`;
      return NextResponse.rewrite(url);
    }
    if (path.startsWith("/photo-credit")) return vers(req, `www.${DOMAINE}`, "/", 307);
    // media.dataparl.fr/assets/collab/{an,senat,pe}.csv : export CSV brut des
    // collaborateurs d'une chambre, généré par la webapp (app/assets/collab).
    // media.dataparl.fr/assets/{collab,parl}/<slug>.csv : exports CSV bruts publiés sur
// data.gouv.fr (jeux « Collaborateurs parlementaires » et « Parlementaires
// français »), générés par la webapp (app/assets/{collab,parl}) — verrouillés
// par compte dans les routes elles-mêmes.
if (/^\/assets\/(collab|parl)\/[a-z0-9-]+(\.csv)?$/.test(path)) return NextResponse.next();
    // media.dataparl.fr/assets/pe/reseau : export SVG du réseau des
    // structures et de leurs eurodéputés (généré par la webapp, avec logo).
    if (path === "/assets/pe/reseau" || path === "/assets/pe/reseau.svg") {
      const url = req.nextUrl.clone();
      if (path.endsWith(".svg")) {
        url.pathname = "/assets/pe/reseau";
        return NextResponse.rewrite(url);
      }
      return NextResponse.next();
    }
    // Ancien chemin de l'export SVG : redirection 308 vers le nouveau.
    if (path === "/assets/collab-reseau" || path === "/assets/collab-reseau.svg") {
      return vers(req, host, "/assets/pe/reseau", 308);
    }
    // Favicon du domaine : Σ' bleu encre sur blanc, servi depuis /media/*.
    if (path === "/icon.svg" || path === "/apple-icon") {
      const url = req.nextUrl.clone();
      url.pathname = `/media${path}`;
      return NextResponse.rewrite(url);
    }
    const autorise =
      path === "/sheets" || path.startsWith("/sheets/") ||
      path === "/search" ||
      path === "/connexion" ||
      path.startsWith("/api/") ||
      path.startsWith("/_next/") ||
      path.startsWith("/preferences") ||
      path.startsWith("/desinscription");
    if (autorise) return NextResponse.next();
    // Message de 15 secondes, puis bascule automatique vers www.
    const url = req.nextUrl.clone();
    url.pathname = "/redirection-media";
    url.search = `?vers=${encodeURIComponent(path + req.nextUrl.search)}`;
    const res = protege(NextResponse.rewrite(url));
    res.headers.set("Cache-Control", "no-store");
    return res;
  }

  if (host === `link.${DOMAINE}`) {
    if (/^\/[a-z0-9][a-z0-9-]{1,39}$/.test(path)) {
      const url = req.nextUrl.clone();
      url.pathname = `/l${path}`;
      return protege(NextResponse.rewrite(url));
    }
    if (path.startsWith("/l/")) return protege(NextResponse.next());
    return vers(req, `www.${DOMAINE}`, "/", 307);
  }

  // raw.dataparl.fr : les fichiers bruts publics (schémas de données
  // référencés sur data.gouv.fr, servis depuis public/schemas). Le reste du
  // domaine n'existe pas : tout revient vers www.dataparl.fr (même chemin).
  if (host === `raw.${DOMAINE}`) {
    if (path.startsWith("/schemas/") && path.endsWith(".json")) return NextResponse.next();
    // Favicon du domaine : Σ' bleu encre sur blanc, servi depuis /raw/*.
    if (path === "/icon.svg" || path === "/apple-icon") {
      const url = req.nextUrl.clone();
      url.pathname = `/raw${path}`;
      return NextResponse.rewrite(url);
    }
    return vers(req, `www.${DOMAINE}`, path, 308);
  }

  // drive.dataparl.fr : ancien domaine du tableur. Tout revient vers
  // media.dataparl.fr (le tableur vit sur media.dataparl.fr/sheets).
  if (host === `drive.${DOMAINE}`) return vers(req, `media.${DOMAINE}`, path, 308);

  // survey.dataparl.fr : le questionnaire d'avis ouvert depuis le site
  // (invitation après quelques minutes, jeton ?j=…). Une seule page ; le
  // reste du domaine revient vers www. Jamais indexé.
  if (host === `survey.${DOMAINE}`) {
    if (path === "/" || path === "") {
      const url = req.nextUrl.clone();
      url.pathname = "/enquete";
      const res = protege(NextResponse.rewrite(url));
      res.headers.set("X-Robots-Tag", "noindex");
      return res;
    }
    // Favicon du domaine : Σ' bleu encre sur blanc, servi depuis /enquete/*.
    if (path === "/icon.svg" || path === "/apple-icon") {
      const url = req.nextUrl.clone();
      url.pathname = `/enquete${path}`;
      return protege(NextResponse.rewrite(url));
    }
    return vers(req, `www.${DOMAINE}`, "/", 308);
  }

  for (const espace of ["admin", "webmail"] as const) {
    if (host !== `${espace}.${DOMAINE}`) continue;
    let res: NextResponse;
    if (path.startsWith("/api/") || path.startsWith(`/${espace}`) || path === "/connexion") res = NextResponse.next();
    else {
      const nouveau = espace === "admin" ? nouvelCheminAdmin(path) : null;
      if (nouveau) return protege(vers(req, `admin.${DOMAINE}`, nouveau || "/", 308));
      const url = req.nextUrl.clone();
      url.pathname = `/${espace}${path === "/" ? "" : path}`;
      res = NextResponse.rewrite(url);
    }
    return protege(res);
  }

  if (host === `www.${DOMAINE}`) {
    if (path === "/api" || path === "/api/") return vers(req, `api.${DOMAINE}`, "/", 308);
    // DataParl' Jobs vit sur son sous-domaine, sans préfixe /jobs.
    if (path === "/jobs" || path.startsWith("/jobs/")) {
  
    const cibleJobs = path === "/jobs" ? "/" : path.slice("/jobs".length) || "/";
      return vers(req, `jobs.${DOMAINE}`, cibleJobs, 308);
    }
    // Le tableur vit sur media.dataparl.fr.
    if (path === "/sheets" || path.startsWith("/sheets/") || path === "/search") {
      return vers(req, `media.${DOMAINE}`, path, 308);
    }
    // Les pages structures du Parlement européen vivent sous /collab/pe/ :
    // les anciens chemins redirigent en 308 (fiches comprises).
    for (const ancien of ["tiers-payants", "prestataires", "reseau"] as const) {
      if (path === "/collab/" + ancien || path.startsWith("/collab/" + ancien + "/")) {
        return vers(req, host, "/collab/pe/" + path.slice("/collab/".length), 308);
      }
    }
    if (path.startsWith("/admin")) {
      const cible = (path.replace(/^\/admin/, "") || "/").replace(/\/$/, "") || "/";
      return vers(req, `admin.${DOMAINE}`, nouvelCheminAdmin(cible) ?? cible, 307);
    }
    if (path.startsWith("/webmail")) return vers(req, `webmail.${DOMAINE}`, path.replace(/^\/webmail/, "") || "/", 307);
    if (path.startsWith("/espace-api")) return vers(req, `api.${DOMAINE}`, path.replace(/^\/espace-api/, "") || "/", 308);
  }

  // Pages désactivées ou en brouillon (site public et environnements de test).
  if (!path.startsWith("/api/") && !path.startsWith("/admin") && !path.startsWith("/webmail") && path !== "/" && !path.startsWith("/media/") && !/\.[a-z0-9]{2,5}$/i.test(path)) {
    if (estInactif(path, await cheminsInactifs())) {
      const url = req.nextUrl.clone();
      url.pathname = "/page-desactivee";
      return NextResponse.rewrite(url, { status: 404 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
