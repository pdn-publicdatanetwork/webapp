// Fabrication des plans de site (XML). Sans dépendance.
const x = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!);

export type Url = { loc: string; lastmod?: string; changefreq?: string; priority?: string; image?: { loc: string; title: string } };

export function urlset(urls: Url[]): string {
  const images = urls.some((u) => u.image);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${images ? ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"' : ""}>`,
    ...urls.map((u) => `<url><loc>${x(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}${u.changefreq ? `<changefreq>${u.changefreq}</changefreq>` : ""}${u.priority ? `<priority>${u.priority}</priority>` : ""}${u.image ? `<image:image><image:loc>${x(u.image.loc)}</image:loc><image:title>${x(u.image.title)}</image:title></image:image>` : ""}</url>`),
    "</urlset>",
  ].join("\n");
}

export function index(plans: { loc: string; lastmod?: string }[]): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...plans.map((p) => `<sitemap><loc>${x(p.loc)}</loc>${p.lastmod ? `<lastmod>${p.lastmod}</lastmod>` : ""}</sitemap>`),
    "</sitemapindex>",
  ].join("\n");
}

export const reponseXml = (xml: string, duree = 3600) =>
  new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": `public, s-maxage=${duree}` } });

