import { LOGOS_GROUPES_EMBARQUES } from "@/lib/logosGroupesEmbarques";

// Logos des groupes parlementaires embarqués dans la webapp, servis par
// DataParl' sans dépendre d'un stockage externe :
// /media/logos-groupes/<fichier> (ex. soc-senat.png, crce-k-senat.jpg).
// Les fichiers sont encodés en base64 dans lib/logos-groupes/*.
export async function GET(_req: Request, { params }: { params: Promise<{ fichier: string }> }) {
  const { fichier } = await params;
  const logo = LOGOS_GROUPES_EMBARQUES[decodeURIComponent(fichier)];
  if (!logo) {
    return new Response("Logo introuvable", { status: 404, headers: { "Cache-Control": "public, s-maxage=3600" } });
  }
  const octets = Buffer.from(logo.b64, "base64");
  return new Response(new Uint8Array(octets), {
    headers: {
      "Content-Type": logo.type,
      "Content-Disposition": `inline; filename="${fichier}"`,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
