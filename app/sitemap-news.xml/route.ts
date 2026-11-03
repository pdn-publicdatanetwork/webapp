import { aujourdhuiParis, decaler } from "@/lib/alertes";
import { dateTitre, joursPublies } from "@/lib/daily";
import { cheminsInactifs } from "@/lib/pagesEtat";
import { estInactif } from "@/lib/pagesRegistre";

export const revalidate = 3600;

// Plan Google Actualités (format news, namespace news:) : seules les pages
// daily des 48 dernières heures y figurent, une URL de sitemap news étant
// valide au maximum 2 jours après sa publication. Régénéré toutes les heures
// pour suivre la synchro Supabase du matin. À référencer dans la Search
// Console à côté de sitemap-daily.xml ; l'inclusion dans l'onglet
// Actualités reste automatique, ce plan est le signal le plus direct.
export async function GET() {
  const base = "https://www.dataparl.fr";
  let jours: { date: string }[] = [];
  if (!estInactif("/daily", await cheminsInactifs())) try { jours = await joursPublies(decaler(aujourdhuiParis(), -2)); } catch { /* plan vide plutôt qu'une erreur */ }
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">',
    ...jours.map((j) => [
      "<url>",
      `<loc>${base}/daily/${j.date}</loc>`,
      "<news:news>",
      "<news:publication>",
      "<news:name>DataParl'</news:name>",
      "<news:language>fr</news:language>",
      "</news:publication>",
      `<news:publication_date>${j.date}</news:publication_date>`,
      `<news:title>Arrivées et départs du ${dateTitre(j.date)}</news:title>`,
      "</news:news>",
      "</url>",
    ].join("")),
    "</urlset>",
  ].join("\n");
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, s-maxage=3600" } });
}
