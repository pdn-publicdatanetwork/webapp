import { headers } from "next/headers";
import { aujourdhuiParis } from "@/lib/alertes";
import { index, reponseXml } from "@/lib/sitemaps";

export const revalidate = 86400;

// /sitemap.xml selon l'hôte :
//   www.dataparl.fr  index des plans (pages, parlementaires, collaborateurs, jours).
export async function GET() {
  const host = ((await headers()).get("host") ?? "").split(":")[0].toLowerCase();
  const jour = aujourdhuiParis();
  if (host !== "www.dataparl.fr") return new Response("Not found", { status: 404 });
  const base = "https://www.dataparl.fr";
  return reponseXml(index([
    { loc: `${base}/sitemap-pages.xml`, lastmod: jour },
    { loc: `${base}/sitemap-parlementaires.xml`, lastmod: jour },
    { loc: `${base}/sitemap-collaborateurs.xml`, lastmod: jour },
    { loc: `${base}/sitemap-daily.xml`, lastmod: jour },
  ]));
}
