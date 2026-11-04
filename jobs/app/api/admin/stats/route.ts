import { lireEvenements } from "@/lib/firestore";

export const dynamic = "force-dynamic";

// Statistiques d'audience des 30 derniers jours (admin uniquement).

const AUTORISES = (process.env.ADMIN_JOBS_EMAILS ?? "theo@dataparl.fr")
  .split(",")
  .map((c) => c.trim().toLowerCase())
  .filter(Boolean);

export async function GET(req: Request) {
  const compte = new URL(req.url).searchParams.get("compte") ?? "";
  if (!AUTORISES.includes(compte.trim().toLowerCase())) {
    return Response.json({ erreur: "réservé au compte admin DataParl'" }, { status: 401 });
  }
  try {
    const evenements = await lireEvenements(30);
    const pages = evenements.filter((e) => e.type === "page");
    const clics = evenements.filter((e) => e.type === "clic");
    const compter = (liste: { chemin: string }[]) => {
      const m: Record<string, number> = {};
      for (const e of liste) m[e.chemin] = (m[e.chemin] ?? 0) + 1;
      return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 10);
    };
    const parJour: Record<string, number> = {};
    for (const e of pages) parJour[e.jour] = (parJour[e.jour] ?? 0) + 1;
    return Response.json({
      pages_30j: pages.length,
      clics_30j: clics.length,
      top_pages: compter(pages),
      top_clics: compter(clics),
      par_jour: Object.entries(parJour).sort((a, b) => a[0].localeCompare(b[0])).slice(-14),
    });
  } catch {
    return Response.json({ erreur: "lecture impossible" }, { status: 500 });
  }
}
