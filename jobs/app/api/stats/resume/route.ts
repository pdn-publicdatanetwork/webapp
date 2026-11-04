import { lireEvenements } from "@/lib/firestore";

export const dynamic = "force-dynamic";

// Résumé d'audience envoyé sur Slack chaque matin via le cron Vercel (jobs/vercel.json).

function jourParis(decalageJours: number): string {
  const date = new Date(Date.now() - decalageJours * 86400000);
  return new Intl.DateTimeFormat("fr-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function compter(evenements: { chemin: string }[], max: number): { chemin: string; total: number }[] {
  const m = new Map<string, number>();
  for (const e of evenements) m.set(e.chemin, (m.get(e.chemin) ?? 0) + 1);
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([chemin, total]) => ({ chemin, total }));
}

export async function GET(req: Request) {
  const cle = process.env.CLE_STATS;
  if (cle && new URL(req.url).searchParams.get("cle") !== cle) {
    return Response.json({ erreur: "clé invalide" }, { status: 401 });
  }
  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (!webhook) {
    return Response.json({ erreur: "SLACK_WEBHOOK_URL absente" }, { status: 500 });
  }
  try {
    const evenements = await lireEvenements(30);
    const veille = jourParis(1);
    const pagesVeille = evenements.filter((e) => e.type === "page" && e.jour === veille);
    const clicsVeille = evenements.filter((e) => e.type === "clic" && e.jour === veille);
    const septJours = new Set(Array.from({ length: 7 }, (_, i) => jourParis(i + 1)));
    const pages7 = evenements.filter((e) => e.type === "page" && septJours.has(e.jour));
    const clics7 = evenements.filter((e) => e.type === "clic" && septJours.has(e.jour));
    const topPages = compter(pagesVeille, 3);
    const lignes = [
      `📊 DataParl' Jobs — audience du ${veille}`,
      `• Pages vues : ${pagesVeille.length} • Clics : ${clicsVeille.length}`,
      `• Visites /connexion : ${pagesVeille.filter((e) => e.chemin === "/connexion").length}`,
      `• Vues de fiches offre : ${pagesVeille.filter((e) => e.chemin.startsWith("/offre/")).length}`,
      `7 derniers jours : ${pages7.length} pages, ${clics7.length} clics • 30 jours : ${evenements.filter((e) => e.type === "page").length} pages`,
    ];
    if (topPages.length > 0) {
      lignes.push(`Top pages : ${topPages.map((p) => `${p.chemin} (${p.total})`).join(", ")}`);
    }
    const texte = lignes.join("\n");
    const reponse = await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: texte }),
    });
    return Response.json({ ok: reponse.ok, message: texte });
  } catch {
    return Response.json({ erreur: "résumé impossible" }, { status: 500 });
  }
}
