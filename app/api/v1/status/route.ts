import { NextResponse } from "next/server";
import { aujourdhuiParis } from "@/lib/alertes";
import { dataQuery, compteAffectations } from "@/lib/data";

// GET https://api.dataparl.fr/v1/status : public, sans clé.
// Fraîcheur des données et volumes, pour synchroniser ou afficher un état.

export const revalidate = 600;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET() {
  const jour = aujourdhuiParis();
  try {
    const [dernier, duJour, total, affectations] = await Promise.all([
      dataQuery<{ date_event: string }>("mouvements", new URLSearchParams({ select: "date_event", source: "eq.live", order: "date_event.desc", limit: "1" }), 600),
      dataQuery<{ id: string }>("mouvements", new URLSearchParams({ select: "id", source: "eq.live", date_event: `eq.${jour}`, limit: "1" }), 600),
      dataQuery<{ id: string }>("mouvements", new URLSearchParams({ select: "id", limit: "1" }), 3600),
      compteAffectations(),
    ]);
    return NextResponse.json(
      {
        statut: "ok",
        version: "v1",
        jour,
        derniere_collecte: dernier.rows[0]?.date_event ?? null,
        mouvements_du_jour: duJour.total ?? null,
        mouvements_total: total.total ?? null,
        affectations_actives: affectations,
        documentation: "https://api.dataparl.fr/docs",
        licence: "ODbL 1.0",
        attribution: "DataParl' (dataparl.fr), d'après les publications de l'Assemblée nationale et du Sénat",
      },
      { headers: { ...CORS, "Cache-Control": "public, s-maxage=600" } },
    );
  } catch {
    return NextResponse.json({ statut: "degrade", version: "v1", jour }, { status: 503, headers: CORS });
  }
}
