// Vérifie les liens internes du site public : menu « Explorer » et pied de
// l'accueil, pages du plan du site (hors fiches d'élus), un jour récent et une
// page volontairement absente (doit répondre 404). Sort en erreur au premier
// lien cassé. Usage : node scripts/verifier-liens.mjs [https://www.dataparl.fr]
const BASE = (process.argv[2] ?? "https://www.dataparl.fr").replace(/\/$/, "");

async function statut(url) {
  const r = await fetch(url, { redirect: "follow", headers: { "User-Agent": "DataParl-verif-liens" } });
  return { code: r.status, texte: r.ok && (r.headers.get("content-type") ?? "").includes("html") ? await r.text() : "" };
}

const accueil = await statut(`${BASE}/`);
if (accueil.code !== 200) { console.error(`Accueil : HTTP ${accueil.code}`); process.exit(1); }
const liens = new Set(
  [...accueil.texte.matchAll(/href="(\/[^"#?]*|https:\/\/www\.dataparl\.fr\/[^"#?]*)"/g)]
    .map((m) => m[1].replace("https://www.dataparl.fr", "") || "/")
    .filter((h) => !h.startsWith("/collab/") && !h.startsWith("/parlementaires/") && !h.startsWith("/_next")),
);
const indexPlans = await (await fetch(`${BASE}/sitemap.xml`)).text();
if (!indexPlans.includes("<sitemapindex")) { console.error("sitemap.xml : index des plans attendu"); process.exit(1); }
const plan = await (await fetch(`${BASE}/sitemap-pages.xml`)).text();
for (const m of plan.matchAll(/<loc>https:\/\/www\.dataparl\.fr([^<]*)<\/loc>/g)) if (!m[1].startsWith("/parlementaires/")) liens.add(m[1] || "/");
const jours = await (await fetch(`${BASE}/sitemap-daily.xml`)).text();
const jour = /<loc>https:\/\/www\.dataparl\.fr(\/daily\/\d{4}-\d{2}-\d{2})<\/loc>/.exec(jours)?.[1];
if (jour) liens.add(jour);

const casses = [];
for (const chemin of [...liens].sort()) {
  const { code } = await statut(`${BASE}${chemin}`);
  console.log(`${code} ${chemin}`);
  if (code !== 200) casses.push(`${code} ${chemin}`);
}
const absente = await statut(`${BASE}/cette-page-n-existe-pas`);
if (absente.code !== 404) casses.push(`${absente.code} (attendu 404) /cette-page-n-existe-pas`);

// Photo d'un élu servie par DataParl' (PNG), et plan du site de l'API.
const fiches = await (await fetch(`${BASE}/sitemap-parlementaires.xml`)).text();
const photo = /<image:loc>([^<]+)<\/image:loc>/.exec(fiches)?.[1];
if (photo) {
  const r = await fetch(photo);
  console.log(`${r.status} ${photo} (${r.headers.get("content-type")})`);
  if (r.status !== 200 || r.headers.get("content-type") !== "image/png") casses.push(`${r.status} ${photo}`);
  if (!photo.startsWith("https://media.dataparl.fr/")) casses.push(`photo hors media.dataparl.fr : ${photo}`);
  // Ouverture directe dans un navigateur : page de crédit, à la même adresse, jamais mise en cache.
  const page = await fetch(photo, { headers: { Accept: "text/html,application/xhtml+xml" } });
  const html = await page.text();
  console.log(`${page.status} ${photo} (navigation : ${page.headers.get("content-type")})`);
  if (page.status !== 200 || !html.includes("Crédit") || !/no-store/.test(page.headers.get("cache-control") ?? "")) casses.push(`page de crédit : ${page.status} ${photo}`);
  // Depuis une page du site (Referer interne) ou un aperçu de lien (Accept */*) : l'image brute.
  for (const h of [{ Accept: "text/html", Referer: "https://www.dataparl.fr/parlementaires" }, { Accept: "*/*" }]) {
    const b = await fetch(photo, { headers: h });
    if (b.headers.get("content-type") !== "image/png") casses.push(`image attendue (${JSON.stringify(h)}) : ${b.headers.get("content-type")}`);
  }
} else casses.push("aucune photo dans sitemap-parlementaires.xml");
if (casses.length) { console.error(`\nLiens cassés :\n${casses.join("\n")}`); process.exit(1); }
console.log(`\n${liens.size} liens vérifiés, aucun cassé.`);
