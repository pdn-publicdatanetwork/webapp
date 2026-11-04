import { noterEvenement } from "@/lib/firestore";

export const dynamic = "force-dynamic";

// Mesure d'audience minimale (pages vues et clics data-stat). Aucune
// donnée personnelle : pas d'IP, pas d'user-agent, pas d'identifiant.

export async function POST(req: Request) {
  const c = (await req.json().catch(() => null)) ?? {};
  const type = c.type === "page" || c.type === "clic" ? c.type : null;
  const chemin = typeof c.chemin === "string" ? c.chemin.trim() : "";
  const page = typeof c.page === "string" ? c.page.trim().slice(0, 200) : "";
  if (!type || !chemin || chemin.length > 200 || (type === "page" && !chemin.startsWith("/"))) {
    return Response.json({ erreur: "événement invalide" }, { status: 400 });
  }
  try {
    await noterEvenement(type, chemin, page);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ erreur: "enregistrement impossible" }, { status: 500 });
  }
}
