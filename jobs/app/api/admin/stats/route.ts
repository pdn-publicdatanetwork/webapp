import { lireEvenements, offresActivesAdmin, offresArchiveesAdmin } from "@/lib/firestore";
import { slugOffre } from "@/lib/jobs";
import { normaliser } from "@/lib/types";

export const dynamic = "force-dynamic";

// Statistiques d'audience des 30 derniers jours (admin uniquement) :
// agrégats globaux + tendances offre par offre (vues de la fiche et clics
// « postuler » : Contacter l'équipe, Envoyer ma candidature, Copier l'adresse).

const AUTORISES = (process.env.ADMIN_JOBS_EMAILS ?? "theo@dataparl.fr")
  .split(",")
  .map((c) => c.trim().toLowerCase())
  .filter(Boolean);

const POSTULER = new Set(["clic_contacter", "clic_envoi_candidature", "clic_copie_email"]);
const FICHE = /^\/offre\/(.+)$/;

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

    // Tendances par offre : vues de la fiche (type=page sur /offre/...) et
    // clics « postuler » commis sur cette fiche (champ page du clic).
    const fiches = new Map<string, { vues: number; clics: number }>();
    for (const e of evenements) {
      if (e.type === "page") {
        const m = FICHE.exec(e.chemin);
        if (m) {
          const f = fiches.get(m[1]) ?? { vues: 0, clics: 0 };
          f.vues += 1;
          fiches.set(m[1], f);
        }
      } else {
        const m = FICHE.exec(e.page);
        if (m && POSTULER.has(e.chemin)) {
          const f = fiches.get(m[1]) ?? { vues: 0, clics: 0 };
          f.clics += 1;
          fiches.set(m[1], f);
        }
      }
    }
    const [actives, archivees] = await Promise.all([offresActivesAdmin(), offresArchiveesAdmin()]);
    type Ligne = { slug: string; titre: string; elu: string; vues: number; clics: number; taux: number };
    const lignes: Ligne[] = [];
    const vus = new Set<string>();
    for (const o of [...actives, ...archivees]) {
      const n = normaliser(o);
      const slug = slugOffre(n);
      if (vus.has(slug)) continue;
      vus.add(slug);
      const f = fiches.get(slug) ?? { vues: 0, clics: 0 };
      lignes.push({
        slug,
        titre: n.titre,
        elu: [n.elu_prenom, n.elu_nom].filter(Boolean).join(" "),
        vues: f.vues,
        clics: f.clics,
        taux: f.vues > 0 ? Math.round((f.clics / f.vues) * 100) : 0,
      });
    }
    for (const [slug, f] of fiches) {
      if (!vus.has(slug)) {
        lignes.push({ slug, titre: slug, elu: "", vues: f.vues, clics: f.clics, taux: f.vues > 0 ? Math.round((f.clics / f.vues) * 100) : 0 });
      }
    }
    lignes.sort((a, b) => b.vues - a.vues || b.clics - a.clics);

    // Comptes connectés ayant visité le site (30 j)
    const parCompte = new Map<string, { visites: number; dernier: string }>();
    for (const e of pages) {
      if (!e.compte) continue;
      const f = parCompte.get(e.compte) ?? { visites: 0, dernier: e.jour };
      f.visites += 1;
      if (e.jour > f.dernier) f.dernier = e.jour;
      parCompte.set(e.compte, f);
    }
    const comptes = [...parCompte.entries()]
      .map(([email, f]) => ({ email, visites: f.visites, dernier: f.dernier }))
      .sort((a, b) => b.visites - a.visites || b.dernier.localeCompare(a.dernier))
      .slice(0, 50);

    return Response.json({
      pages_30j: pages.length,
      clics_30j: clics.length,
      top_pages: compter(pages),
      top_clics: compter(clics),
      par_jour: Object.entries(parJour).sort((a, b) => a[0].localeCompare(b[0])).slice(-14),
      offres: lignes.slice(0, 30),
      comptes,
    });
  } catch {
    return Response.json({ erreur: "lecture impossible" }, { status: 500 });
  }
}
