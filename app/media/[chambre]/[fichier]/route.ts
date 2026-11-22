import { analyserFichier, CHAMBRE_DE_CODE, CREDIT, sourceAutorisee } from "@/lib/media";
import { DATA_SUPABASE_URL } from "@/lib/env";
import { parlementaireDepuisId, personne, type Parlementaire } from "@/lib/referentiel";

// Photo officielle d'un élu, servie par DataParl' :
// /media/<chambre>/<id>_<credit>_<taille>.png (media.dataparl.fr/<chambre>/…).
// L'image vient du site de l'institution (AN, Sénat, PE) ; le crédit est
// dans le nom et l'en-tête, le fichier se garde donc un an en cache.
// NOTE 22/11/2026 — depuis la migration Cloudflare Workers : sharp (module
// natif) ne peut pas tourner dans un Worker ; le recadrage serveur a donc
// été retiré et l'image officielle est servie telle quelle (déjà carrée pour
// les trois institutions). URLs, crédits et en-têtes inchangés.
export const dynamic = "force-dynamic";

const absente = () => new Response("Photo introuvable", { status: 404, headers: { "Cache-Control": "public, s-maxage=3600" } });

// Parlement européen : le site officiel répond par un défi AWS WAF (HTTP 202)
// aux IP datacenter — on ne peut donc pas y lire mepphoto à la volée.
// Le workflow « Suivi Parlement européen » collecte chaque photo chaque
// matin depuis un runner à IP résidentielle et la met en cache dans le
// bucket public Supabase « media-europarl » ; on le sert en premier, et
// l'URL officielle reste en repli (si un jour le WAF est retiré).
const cacheEuroparl = (photoUrl: string): string | null => {
  const base = DATA_SUPABASE_URL.replace(/\/$/, "");
  const id = /mepphoto\/(\d+)\.jpg/.exec(photoUrl)?.[1];
  return id ? `${base}/storage/v1/object/public/media-europarl/${id}.jpg` : null;
};

export async function GET(_req: Request, { params }: { params: Promise<{ chambre: string; fichier: string }> }) {
  const { chambre: code, fichier } = await params;
  const f = analyserFichier(decodeURIComponent(fichier));
  const chambre = CHAMBRE_DE_CODE[code];
  if (!f || !chambre || f.credit !== code) return absente();
  const elu = await parlementaireDepuisId(f.id).catch(() => null);
  if (!elu) return absente();
  // Un ancien député devenu sénateur (ex. Daubresse) a sa fiche active au Sénat :
  // l'URL /media/an/… doit pourtant servir sa photo AN historique. On cherche
  // donc la fiche de la chambre demandée chez la même personne, pas seulement
  // la fiche active.
  let cible: Parlementaire | null = elu;
  if (elu.chambre !== chambre) {
    const { fiches } = await personne(elu.personne_id).catch(() => ({ fiches: [] as Parlementaire[] }));
    cible = fiches.find((x) => x.chambre === chambre) ?? null;
  }
  if (!cible || !cible.photo_url || !sourceAutorisee(cible.photo_url)) return absente();
  // Europarl : cache d'abord (WAF côté datacenter). AN : les photos portent un
  // segment « /carre/ » que le site a supprimé pour les anciennes
  // législatures (12e–15e : 404) ; sans le segment, la même photo existe sur
  // toutes les législatures : on l'essaie en repli.
  const candidates =
    chambre === "europarl"
      ? [cacheEuroparl(cible.photo_url), cible.photo_url].filter((x): x is string => Boolean(x))
      : cible.photo_url.includes("/carre/")
        ? [cible.photo_url, cible.photo_url.replace("/carre/", "/")]
        : [cible.photo_url];
  for (const source of candidates) {
    try {
      const r = await fetch(source, { headers: { "User-Agent": "DataParl (https://www.dataparl.fr)" }, signal: AbortSignal.timeout(8000), redirect: "error" });
      const type = r.headers.get("content-type") ?? "";
      if (!r.ok || !type.startsWith("image/")) continue;
      const octets = await r.arrayBuffer();
      if (octets.byteLength === 0 || octets.byteLength > 8_000_000) continue;
      return new Response(octets, {
        headers: {
          "Content-Disposition": `inline; filename="${f.id}_${f.credit}_${f.taille}.png"`,
          "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable", "Vary": "Accept",
          "X-Credit": encodeURIComponent(`Photo : ${CREDIT[code]}`), "Access-Control-Allow-Origin": "*", "X-Robots-Tag": "noarchive",
        },
      });
    } catch { /* on essaie la variante suivante */ }
  }
  return absente();
}
