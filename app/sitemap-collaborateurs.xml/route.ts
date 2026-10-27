import { dataQueryTout } from "@/lib/data";
import { cheminsInactifs } from "@/lib/pagesEtat";
import { estInactif } from "@/lib/pagesRegistre";
import { reponseXml, urlset, type Url } from "@/lib/sitemaps";

export const revalidate = 86400;

// Une fiche par collaborateur (en poste et anciens) : /collab/<slug>.
// Les fiches sont publiques, canoniques et indexables (voir
// app/(site)/collab/[slug]/page.tsx) ; sans ce plan, Google ne les
// découvre que via les listes paginées. ~13 000 URLs, sous la limite
// de 50 000 d'un fichier sitemap.
export async function GET() {
  let collabs: { slug: string; actif: boolean }[] = [];
  if (!estInactif("/collab", await cheminsInactifs()))
    try {
      collabs = await dataQueryTout<{ slug: string; actif: boolean }>("collaborateurs",
        new URLSearchParams({ select: "slug,actif", order: "actif.desc,slug" }), 86400);
    } catch { /* plan vide plutôt qu'une erreur */ }
  return reponseXml(urlset(collabs.map((c): Url => ({
    loc: `https://www.dataparl.fr/collab/${encodeURIComponent(c.slug)}`,
    changefreq: c.actif ? "weekly" : "yearly",
    priority: c.actif ? "0.6" : "0.3",
  }))), 86400);
}
