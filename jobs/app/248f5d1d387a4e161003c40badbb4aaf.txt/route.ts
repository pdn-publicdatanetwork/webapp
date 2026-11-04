export const dynamic = "force-static";

// Fichier-clé du protocole IndexNow : les moteurs vérifient que nous
// contrôlons bien le domaine en interrogeant cette URL.
export async function GET() {
  return new Response("248f5d1d387a4e161003c40badbb4aaf", { headers: { "content-type": "text/plain; charset=utf-8" } });
}
