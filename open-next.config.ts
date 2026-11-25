import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";

// Cache incrémental partagé entre tous les isolates (correctif de fond de la
// panne du 25/11). Avant ce changement, defineCloudflareConfig({}) laissait
// le cache et la file en mémoire par isolate : sur Workers, les isolates sont
// nombreux et éphémères, chaque rendu redevenait un cache miss et repartait
// vers Supabase (requête d'accueil frappée 287 fois en 6 min, 2000 à 4100
// rendus de la page 404 par heure, ~380 000 requêtes REST/24 h).
// Désormais : R2 stocke les entrées (partagées par tous les isolates), la file
// Durable Object déduplique les revalidations (une seule réexécution par
// délai de revalidate), et withRegionalCache garde en Cache API du colo local
// les lectures chaudes (mode long-lived : fetch réutilisés jusqu'à
// revalidation, ISR/SSG jusqu'à 30 minutes).
// Tag cache D1 volontairement absent : le code n'appelle pas encore
// revalidateTag ; à brancher le jour où l'invalidation après collecte sera
// câblée (d1-next-tag-cache + binding NEXT_TAG_CACHE_D1 dans wrangler.jsonc).
export default defineCloudflareConfig({
  incrementalCache: withRegionalCache(r2IncrementalCache, { mode: "long-lived" }),
  queue: doQueue,
});
