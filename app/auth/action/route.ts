import { NextRequest, NextResponse } from "next/server";

// URL d'action Firebase (Authentication → Templates → URL d'action des
// e-mails : https://www.dataparl.fr/auth/action). Les liens d'e-mail générés
// par l'API REST (jobs : accounts:sendOobCode) atterrissent ici avec
// mode/oobCode/apiKey + un paramètre continueUrl qui indique la page de
// l'app concernée. On redirige vers cette page en conservant tous les
// paramètres : la page /connexion de chaque app appelle ensuite
// signInWithEmailLink avec son URL complète.
// Sécurité : la redirection est restreinte aux domaines DataParl'
// (dataparl.fr et ses sous-domaines) — jamais de redirect ouvert.

const AUTORISE = /^(https:\/\/)?(([\w-]+\.)?dataparl\.fr|localhost)(:\d+)?(\/|$)/;

export function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const suite = p.get("continueUrl");
  let cible = "/connexion";
  if (suite && AUTORISE.test(suite)) {
    try {
      const u = new URL(suite);
      // On reporte les paramètres de l'action (mode, oobCode, apiKey, lang…)
      // sur l'URL de destination, comme le fait l'interstitiel Firebase.
      for (const [k, v] of p.entries()) {
        if (k !== "continueUrl" && !u.searchParams.has(k)) u.searchParams.set(k, v);
      }
      cible = u.toString();
    } catch {
      cible = "/connexion";
    }
  }
  const r = NextResponse.redirect(new URL(cible, req.nextUrl.origin), 302);
  r.headers.set("Cache-Control", "no-store");
  return r;
}
