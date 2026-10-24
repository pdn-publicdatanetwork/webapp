import { DATA_SUPABASE_URL } from "@/lib/env";

export const dynamic = "force-dynamic";

// media.dataparl.fr/assets/… : fichiers du bucket public Supabase « assets »
// (logos, visuels déposés depuis l'admin), servis via DataParl' avec un an de
// cache : le nom du fichier porte la version, jamais besoin d'invalider.
export async function GET(_req: Request, { params }: { params: Promise<{ chemin: string[] }> }) {
  const { chemin: morceaux } = await params;
  const p = morceaux.map(decodeURIComponent).join("/");
  if (!/^[a-zA-Z0-9._/-]+$/.test(p) || p.includes("..")) {
    return new Response("Introuvable", { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const r = await fetch(`${DATA_SUPABASE_URL}/storage/v1/object/public/assets/${p}`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok || !r.body) return new Response("Introuvable", { status: 404, headers: { "Cache-Control": "public, s-maxage=3600" } });
    return new Response(r.body, {
      headers: {
        "Content-Type": r.headers.get("content-type") ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return new Response("Introuvable", { status: 404, headers: { "Cache-Control": "public, s-maxage=3600" } });
  }
}
