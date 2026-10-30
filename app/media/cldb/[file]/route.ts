import { dataAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Photos de profil déclarées par les collaborateurs (Ma fiche), servies sur
// media.dataparl.fr/cldb/<collab_id>.<ext> via la règle proxy. L'image vit
// dans le bucket privé d'écriture photos-profils : cette route est le seul
// chemin de lecture public, sans exposer l'URL Supabase. Le fichier est
// toujours celui publié par l'intéressé (remplacé ou retiré par lui).

const BUCKET = "photos-profils";
const EXT_MIME: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

export async function GET(_req: Request, ctx: { params: Promise<{ file: string }> }) {
  const fichier = (await ctx.params).file;
  const m = /^([0-9a-f]{8})\.(jpg|jpeg|png|webp)$/.exec(fichier);
  if (!m) return new Response("introuvable", { status: 404 });
  const collabId = m[1];

  const db = dataAdmin();
  // Le format peut avoir changé depuis l'URL mise en cache (jpg → png) :
  // on sert le fichier présent, quel que soit son format.
  const { data: listing } = await db.storage.from(BUCKET).list("", { search: collabId });
  const nom = (listing ?? []).map((f) => f.name).find((n) => n.startsWith(collabId + "."));
  if (!nom) return new Response("introuvable", { status: 404 });

  const { data, error } = await db.storage.from(BUCKET).download(nom);
  if (error || !data) return new Response("introuvable", { status: 404 });
  const ext = nom.split(".").pop() ?? "jpg";
  return new Response(data, {
    headers: {
      "Content-Type": EXT_MIME[ext] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
