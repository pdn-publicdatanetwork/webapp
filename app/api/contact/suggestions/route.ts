import { NextResponse } from "next/server";
import { rechercherSite } from "@/lib/rechercheSite";

// Suggestions de fiches pour le formulaire de contact (étape « fiche concernée »).
// Réutilise la recherche unifiée du site : élus, collaborateurs, groupes, pages.
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").slice(0, 60);
  const resultats = await rechercherSite(q, 5).catch(() => []);
  return NextResponse.json({ resultats });
}
