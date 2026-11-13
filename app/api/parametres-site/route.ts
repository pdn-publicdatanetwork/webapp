import { NextResponse } from "next/server";
import { lireParametresSite } from "@/lib/parametresSite";

export const dynamic = "force-dynamic";

// Lecture publique des interrupteurs du site (pop-up de sondage, bandeau
// cookies) pour les composants client. Aucun secret : 3 booléens déjà
// lisibles publiquement côté Supabase (policy SELECT sur site_parametres).
// Cache mémoire serveur (lib/parametresSite) + cache navigateur 5 minutes.
export async function GET() {
  const p = await lireParametresSite();
  return NextResponse.json(p, { headers: { "Cache-Control": "public, max-age=300" } });
}
