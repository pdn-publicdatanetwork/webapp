import sharp from "sharp";
import { CREDIT } from "@/lib/media";
import { dataQuery } from "@/lib/data";

// Portrait officiel d'une personnalité du Gouvernement, servi par DataParl' :
// /media/gouv/<slug>_gouv_<taille>.png (media.dataparl.fr/gouv/…), où <slug>
// est le profil info.gouv.fr (ex. philippe-tabarot). Les pages HTML d'info.gouv.fr
// sont protégées par un défi Cloudflare illisible depuis Vercel : l'URL de
// l'image officielle et le crédit du photographe sont donc recensés dans la
// table ministres (colonnes infogouv_photo / infogouv_credit) et l'image est
// lue sur le CDN d'info.gouv.fr, lui, accessible. Le crédit est transmis dans
// l'en-tête X-Credit.
export const dynamic = "force-dynamic";

const absente = () => new Response("Photo introuvable", { status: 404, headers: { "Cache-Control": "public, s-maxage=3600" } });

export async function GET(_req: Request, { params }: { params: Promise<{ fichier: string }> }) {
  const { fichier } = await params;
  const m = /^([a-z0-9-]{1,80})_gouv_(96|200|400)\.png$/.exec(decodeURIComponent(fichier));
  if (!m) return absente();
  const slug = m[1];
  const taille = Number(m[2]);
  try {
    const { rows } = await dataQuery<{ infogouv_photo: string | null; infogouv_credit: string | null }>(
      "ministres",
      new URLSearchParams({ select: "infogouv_photo,infogouv_credit", infogouv_slug: "eq." + slug, limit: "1" }),
      3600,
    );
    const photo = rows[0]?.infogouv_photo;
    if (!photo) return absente();
    const credit = rows[0]?.infogouv_credit?.slice(0, 120) ?? null;
    const r = await fetch(photo, { headers: { "User-Agent": "DataParl (https://www.dataparl.fr)" }, signal: AbortSignal.timeout(8000) });
    if (!r.ok || !(r.headers.get("content-type") ?? "").startsWith("image/")) return absente();
    const brut = Buffer.from(await r.arrayBuffer());
    if (brut.length > 8_000_000) return absente();
    const png = await sharp(brut).resize(taille, taille, { fit: "cover", position: "top" }).png({ compressionLevel: 9, palette: true }).toBuffer();
    return new Response(new Uint8Array(png), {
      headers: {
        "Content-Disposition": `inline; filename="${slug}_gouv_${taille}.png"`,
        "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable",
        "X-Credit": encodeURIComponent(`Photo : ${CREDIT.gouv}${credit ? " : " + credit : ""}`),
        "Access-Control-Allow-Origin": "*", "X-Robots-Tag": "noarchive",
      },
    });
  } catch {
    return absente();
  }
}
