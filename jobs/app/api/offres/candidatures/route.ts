import { compterCandidatures } from "@/lib/firestore";

export const dynamic = "force-dynamic";

// Compteur public de candidatures envoyées via DataParl' sur une fiche
// d'offre (30 derniers jours) : simple agrégat, aucune donnée personnelle.

export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("slug") ?? "";
  if (!/^[a-zA-Z0-9_-]{1,150}$/.test(slug)) {
    return Response.json({ erreur: "slug invalide" }, { status: 400 });
  }
  try {
    const candidatures = await compterCandidatures(slug);
    return Response.json({ candidatures });
  } catch {
    return Response.json({ erreur: "lecture impossible" }, { status: 500 });
  }
}
