import { analyserLogoGroupe, logoSource } from "@/lib/media";

// Logo d'un groupe parlementaire, servi par DataParl' :
// /media/groupes/<sigle>-<chambre>-<législature>.png
// (media.dataparl.fr/groupes/…), ex. dem-an-XVIIe.png.
// Les logos des groupes de l'Assemblée nationale proviennent de Datan
// (datan.fr), qui les publie par législature ; ils sont mis en cache un an.
// NOTE 22/11/2026 — migration Cloudflare Workers : sharp ne peut pas y
// tourner (module natif) ; le logo est servi tel quel (petite image).
// L'option fetch redirect:"error" (Vercel) fait échouer tout fetch dans workerd : retirée.
export const dynamic = "force-dynamic";

const absent = () => new Response("Logo introuvable", { status: 404, headers: { "Cache-Control": "public, s-maxage=3600" } });

export async function GET(_req: Request, { params }: { params: Promise<{ fichier: string }> }) {
  const { fichier } = await params;
  const f = analyserLogoGroupe(decodeURIComponent(fichier));
  if (!f) return absent();
  const source = logoSource(f.chambre, f.sigle);
  if (!source) return absent();
  try {
    const r = await fetch(source, { headers: { "User-Agent": "DataParl (https://www.dataparl.fr)" }, signal: AbortSignal.timeout(8000) });
    const type = r.headers.get("content-type") ?? "";
    if (!r.ok || !type.startsWith("image/")) return absent();
    const octets = await r.arrayBuffer();
    if (octets.byteLength === 0 || octets.byteLength > 4_000_000) return absent();
    return new Response(octets, {
      headers: {
        "Content-Disposition": `inline; filename="${f.sigle}-${f.chambre === "assemblee" ? "an" : f.chambre}-${f.romain}.png"`,
        "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable",
        "X-Credit": encodeURIComponent("Logo du groupe : Datan (datan.fr)"), "Access-Control-Allow-Origin": "*",
      },
    });
  } catch { return absent(); }
}
