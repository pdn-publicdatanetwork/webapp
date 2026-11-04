import { noterEvenement } from "@/lib/firestore";

export const dynamic = "force-dynamic";

// Mesure d'audience : pages vues et clics data-stat. Pas d'IP, pas de
// user-agent. Pour les visiteurs connectés, l'adresse du compte est
// associée aux visites (statistiques internes, voir Informations légales).

export async function POST(req: Request) {
  const c = (await req.json().catch(() => null)) ?? {};
  const type = c.type === "page" || c.type === "clic" ? c.type : null;
  const chemin = typeof c.chemin === "string" ? c.chemin.trim() : "";
  const page = typeof c.page === "string" ? c.page.trim().slice(0, 200) : "";
  const compte =
    typeof c.compte === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.compte.trim())
      ? c.compte.trim().toLowerCase().slice(0, 200)
      : "";
  if (!type || !chemin || chemin.length > 200 || (type === "page" && !chemin.startsWith("/"))) {
    return Response.json({ erreur: "événement invalide" }, { status: 400 });
  }
  try {
    await noterEvenement(type, chemin, page, compte);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ erreur: "enregistrement impossible" }, { status: 500 });
  }
}
