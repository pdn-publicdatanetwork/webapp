import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Collecte des violations CSP (audit ANSSI R19, 31/10/2026).
// Endpoint public par nature (le navigateur y POSTe ses rapports) :
// - lecture du corps limitée (Next refuse les corps > 4 Mo, on borne à 8 Ko) ;
// - aucune donnée persistée : un avertissement structuré part dans les logs
//   Vercel (filtrable sur « csp-rapport »), point d'entrée idéal pour un
//   branchement Sentry ultérieur ;
// - toujours 204, jamais d'erreur : un souci de rapport ne doit pas
//   perturber le navigateur.

const TAILLE_MAX = 8_192;

export async function POST(req: Request) {
  try {
    const texte = (await req.text()).slice(0, TAILLE_MAX);
    let rapport: unknown = texte;
    try {
      const analyse = JSON.parse(texte);
      rapport = analyse["csp-report"] ?? analyse;
    } catch {
      // corps non JSON : on garde le texte brut (borné)
    }
    const r = rapport as Record<string, unknown>;
    console.warn(
      "csp-rapport",
      JSON.stringify({
        document: typeof r["document-uri"] === "string" ? String(r["document-uri"]).slice(0, 200) : null,
        directive: typeof r["violated-directive"] === "string" ? String(r["violated-directive"]).slice(0, 100) : null,
        bloque: typeof r["blocked-uri"] === "string" ? String(r["blocked-uri"]).slice(0, 300) : null,
        source: typeof r["source-file"] === "string" ? String(r["source-file"]).slice(0, 200) : null,
      }),
    );
  } catch {
    // silence volontaire
  }
  return new NextResponse(null, { status: 204 });
}
