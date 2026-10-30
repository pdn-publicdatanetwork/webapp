#!/usr/bin/env node
// Collecte les adresses des permanences parlementaires pour la carte
// /parlementaires/map, puis les géocode via la Base Adresse Nationale (BAN).
//
// Sources :
//   - Assemblée nationale : fiche de chaque député (assemblee-nationale.fr/dyn/deputes/PA…),
//     bloc « Adresse » → « En circonscription » ;
//   - Sénat : fiche de chaque sénateur (senat.fr/senateur/<slug>.html),
//     bloc « Permanence parlementaire ».
//   - Parlement européen : NON collecté ici : europarl.europa.eu bloque les
//     requêtes automatisées (WAF) ; passer par les runners Playwright du dépôt
//     collaborateurs si on veut les eurodéputés.
//
// Écrit :
//   - lib/permanences.ts (fichier généré, consommé par la webapp) ;
//   - data/permanences-geocache.json (cache de géocodage, à committer).
//
// Conventions maison : les cas douteux ne sont jamais tranchés seuls : ils
// sont listés dans le run avec « ATTENTION ». Des garde-fous empêchent
// d'écraser un fichier correct avec une collecte cassée (exit 1).
//
// Usage : node scripts/permanences.mjs [--dry-run] [--chambre=an|senat] [--max=N]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { setTimeout as dormir } from "node:timers/promises";

const ARGS = process.argv.slice(2);
const DRY = ARGS.includes("--dry-run");
const CHAMBRE_SEULE = (ARGS.find((a) => a.startsWith("--chambre=")) || "").slice(10) || null;
const MAX = Number((ARGS.find((a) => a.startsWith("--max=")) || "").slice(6)) || Infinity;

const SUPABASE_URL = process.env.NEXT_PUBLIC_DATA_SUPABASE_URL ?? "https://yuhqajaznizwmenmyzms.supabase.co";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_DATA_SUPABASE_KEY ?? "sb_publishable_fxIEX7DcA41ygzG27omGkQ_efe3s7pR";
const BAN = "https://api-adresse.data.gouv.fr/search/";
const UA = "DataParl' (https://www.dataparl.fr ; collecte des permanences parlementaires)";
const CACHE_FICHIER = "data/permanences-geocache.json";

const attention = [];
const note = (msg) => attention.push(msg);

let dernierAppel = 0;
async function politesse(ms) {
  const t = Date.now() - dernierAppel;
  if (t < ms) await dormir(ms - t);
  dernierAppel = Date.now();
}

async function obtenir(url, options = {}, tentatives = 3) {
  for (let i = 0; i < tentatives; i++) {
    try {
      const r = await fetch(url, { ...options, headers: { "User-Agent": UA, ...(options.headers ?? {}) } });
      if (r.status === 429 || r.status >= 500) throw new Error("HTTP " + r.status);
      return r;
    } catch (e) {
      if (i === tentatives - 1) throw e;
      await dormir(2000 * (i + 1));
    }
  }
}

const NOMBRES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", eacute: "é", egrave: "è", ecirc: "ê", agrave: "à", ccedil: "ç", euml: "ë", ugrave: "ù", ocirc: "ô", icirc: "î", laquo: "«", raquo: "»", rsquo: "’", lsquo: "‘", ndash: "–", mdash: ":", deg: "°" };

// HTML → lignes de texte (le parsing se fait sur le texte, comme sur le site
// rendu, pour rester robuste aux changements de structure HTML).
function enLignes(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h\d|section)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/g, (m, n) => NOMBRES[n] ?? m)
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

// --- Assemblée nationale : « En circonscription : <adresse> » -----------------
const MARQUEURS_AN = /^(assembl[ée]e nationale|en circonscription|t[ée]l[ée]phone|t[ée]l\b|courriel|e-?mail|fax|carte des|liste des|permanences?|adresse\b)/i;
function permanencesAN(lignes) {
  const out = [];
  for (let i = 0; i < lignes.length; i++) {
    const m = lignes[i].match(/^en circonscription\s*:?\s*(.*)$/i);
    if (!m) continue;
    let adresse = m[1].trim();
    for (let j = i + 1; j < lignes.length; j++) {
      if (MARQUEURS_AN.test(lignes[j]) || adresse.length > 160) break;
      adresse += " " + lignes[j];
    }
    adresse = adresse.replace(/\s*t[ée]l[ée]phone\s*:.*$/i, "").replace(/\s+/g, " ").trim();
    if (adresse.length >= 6) out.push(adresse);
  }
  return out;
}

// --- Sénat : bloc « Permanence parlementaire » --------------------------------
const MARQUEURS_SENAT = /^(adresse s[ée]nat|casier de la poste|rue de vaugirard|circonscription|place dans l|h[ée]micycle|courriel|par courriel|sur facebook|par courrier postal|travaux parlementaires)/i;
const MOTIF_ADRESSE = /\b\d{5}\b|\b(rue|avenue|boulevard|b\.?p\b|place|all[ée]e|chemin|route|quai|impasse|square|cours|mairie|h[ôo]tel|maison|espace|r[ée]sidence|lotissement)\b/i;
function permanencesSenat(lignes) {
  const out = [];
  for (let i = 0; i < lignes.length; i++) {
    if (!/^permanence parlementaire/i.test(lignes[i])) continue;
    for (let j = i + 1; j < lignes.length; j++) {
      const l = lignes[j];
      if (MARQUEURS_SENAT.test(l) || /^permanence/i.test(l)) break;
      if (/^(courriel|e-?mail|t[ée]l|fax)\b/i.test(l)) continue;
      if (!MOTIF_ADRESSE.test(l)) continue;
      let adresse = l;
      if (!/\b\d{5}\b/.test(adresse) && j + 1 < lignes.length && /\b\d{5}\b/.test(lignes[j + 1]) && !MARQUEURS_SENAT.test(lignes[j + 1])) {
        adresse += " " + lignes[j + 1];
        j++;
      }
      adresse = adresse.replace(/\s*t[ée]l[ée]phone?\s*:.*$/i, "").replace(/\s+/g, " ").trim();
      if (adresse.length >= 6) out.push(adresse);
    }
  }
  return out;
}

// --- Géocodage (BAN) avec cache commité ---------------------------------------
let cache = {};
if (existsSync(CACHE_FICHIER)) {
  try { cache = JSON.parse(readFileSync(CACHE_FICHIER, "utf8")); } catch { cache = {}; }
}
async function geocoder(adresse) {
  const cle = adresse.replace(/\s+/g, " ").toLowerCase();
  if (cache[cle]) return cache[cle];
  await politesse(120); // ~8 req/s max, en douceur pour la BAN
  const m = adresse.match(/^(.*?)\s*(?:,\s*)?(\d{5})\s+(.+)$/);
  const params = new URLSearchParams({ q: m ? m[1] : adresse, limit: "1" });
  if (m) { params.set("postcode", m[2]); params.set("city", m[3]); }
  const r = await obtenir(BAN + "?" + params);
  if (!r.ok) { note(`BAN HTTP ${r.status} pour « ${adresse} »`); return null; }
  const j = await r.json();
  const hit = j.features?.[0];
  if (!hit || hit.properties.score < 0.4) { note(`Géocodage incertain (score ${hit?.properties.score ?? ":"}) : ${adresse}`); return null; }
  const res = { lat: hit.geometry.coordinates[1], lon: hit.geometry.coordinates[0], score: +hit.properties.score.toFixed(2), ville: hit.properties.city ?? "" };
  cache[cle] = res;
  return res;
}

// --- Référentiel --------------------------------------------------------------
async function elus(chambre) {
  const params = new URLSearchParams({
    select: "chambre,elu_id,slug,civilite,prenom,nom,groupe,url_officielle",
    actif: "eq.true", chambre: `eq.${chambre}`, order: "elu_id", limit: "1000",
  });
  const r = await obtenir(`${SUPABASE_URL}/rest/v1/parlementaires?${params}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!r.ok) throw new Error(`Supabase HTTP ${r.status} (${chambre})`);
  return r.json();
}

// --- Collecte ------------------------------------------------------------------
async function collecter(chambre) {
  const liste = (await elus(chambre)).slice(0, MAX);
  console.log(`${chambre} : ${liste.length} fiches à consulter`);
  const points = [];
  let sansPermanence = 0, sansGeocodage = 0;
  for (const e of liste) {
    if (!e.url_officielle) { note(`Pas d'url_officielle pour ${e.prenom} ${e.nom}`); continue; }
    let html;
    try {
      await politesse(400); // ~2,5 fiches/s
      const r = await obtenir(e.url_officielle);
      if (!r.ok) { note(`Fiche HTTP ${r.status} : ${e.url_officielle}`); continue; }
      html = await r.text();
    } catch (err) {
      note(`Fiche inaccessible : ${e.url_officielle} (${err.message})`);
      continue;
    }
    const lignes = enLignes(html);
    const adresses = chambre === "assemblee" ? permanencesAN(lignes) : permanencesSenat(lignes);
    if (!adresses.length) { sansPermanence++; continue; }
    for (const a of adresses) {
      const g = await geocoder(a);
      if (!g) { sansGeocodage++; continue; }
      points.push({
        c: chambre, s: e.slug, n: `${e.prenom} ${e.nom}`, g: e.groupe ?? "",
        a: a.replace(/\s+\d{5}\s+.*$/, "").trim() || a, v: (a.match(/\d{5}\s+(.+)$/)?.[1] ?? g.ville).trim(),
        lat: g.lat, lon: g.lon,
      });
    }
  }
  console.log(`${chambre} : ${points.length} permanences géocodées, ${sansPermanence} fiches sans permanence affichée, ${sansGeocodage} adresses non géocodées`);
  return points;
}

const chambres = CHAMBRE_SEULE ? [CHAMBRE_SEULE === "an" ? "assemblee" : CHAMBRE_SEULE === "senat" ? "senat" : CHAMBRE_SEULE] : ["assemblee", "senat"];
const points = [];
for (const c of chambres) points.push(...await collecter(c));

// Garde-fous : une collecte cassée ne doit pas écraser la carte.
const nAN = points.filter((p) => p.c === "assemblee").length;
const nSenat = points.filter((p) => p.c === "senat").length;
if (chambres.includes("assemblee") && nAN < 200) { console.error(`ATTENTION : seulement ${nAN} permanences AN (< 200) : parsing à vérifier, rien n'est écrit.`); }
if (chambres.includes("senat") && nSenat < 40) { console.error(`ATTENTION : seulement ${nSenat} permanences Sénat (< 40) : parsing à vérifier, rien n'est écrit.`); }
if ((chambres.includes("assemblee") && nAN < 200) || (chambres.includes("senat") && nSenat < 40)) {
  process.exit(1);
}

if (attention.length) console.log("À examiner :\n - " + attention.slice(0, 40).join("\n - "));

const maj = new Date().toISOString().slice(0, 10);
const fichier = `// GÉNÉRÉ par scripts/permanences.mjs : ne pas modifier à la main.
// Permanences parlementaires géocodées (Base Adresse Nationale). Mise à jour : ${maj}.
// Sources : fiches des députés (Assemblée nationale) et des sénateurs (Sénat).
export type ChambrePermanence = "assemblee" | "senat" | "europarl";
export type Permanence = { c: ChambrePermanence; s: string; n: string; g: string; a: string; v: string; lat: number; lon: number };
export const PERMANENCES: { maj: string | null; points: Permanence[] } = ${JSON.stringify({ maj, points })};
`;
if (!DRY) {
  mkdirSync("data", { recursive: true });
  writeFileSync("data/permanences-geocache.json", JSON.stringify(cache, null, 1) + "\n");
  writeFileSync("lib/permanences.ts", fichier);
  console.log(`Écrit : lib/permanences.ts (${points.length} points), data/permanences-geocache.json (${Object.keys(cache).length} entrées)`);
} else {
  console.log(`Dry-run : ${points.length} points, rien n'est écrit.`);
}
