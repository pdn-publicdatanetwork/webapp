// Worker personnalisé DataParl' : handler OpenNext + Cron Triggers Cloudflare.
// OpenNext n'exporte que le handler fetch de Next.js ; on l'enrichit ici avec
// scheduled(), appelé par les Cron Triggers déclarés dans wrangler.jsonc.
// Chaque cron appelle la même route Next.js qu'auparavant, en interne, avec
// l'en-tête Authorization attendu par les routes (CRON_SECRET, secret Worker).

// Durable Object de la file de revalidation (queue: doQueue dans
// open-next.config.ts, binding NEXT_CACHE_DO_QUEUE dans wrangler.jsonc).
// wrangler exige que la classe soit exportée par le point d'entrée du
// Worker : sans cet export, le deploy alerte que le Durable Object sera
// inappelable au runtime (vu dans le run du 25/11 19h04 UTC).
import { DOQueueHandler } from "@opennextjs/cloudflare/durable-objects/queue";
export { DOQueueHandler };

interface Env {
  CRON_SECRET: string;
  [cle: string]: unknown;
}

const ORIGINE = "https://www.dataparl.fr";

// Cron (wrangler.jsonc) -> route Next.js. Mêmes horaires que la config Vercel,
// l'anti-abus en horaire (échéance de suspension 48 h à l'heure près).
const CRONS: Record<string, string> = {
  "30 7 * * *": "/api/cron/alertes",
  "0 8 * * *": "/api/cron/notion",
  "45 7 * * *": "/api/cron/slack-digest",
  "30 10 * * *": "/api/cron/enquete",
  "15 * * * *": "/api/cron/anti-abus",
};

export default {
  async fetch(req, env, ctx) {
    // Page de maintenance : servie par le Worker de secours dataparl-maintenance
    // (liaison de service MAINTENANCE, wrangler.jsonc) — actus de maintenance en
    // direct (maintenance_etat) et inscriptions « prévenu du retour ». Si la
    // liaison est absente, on retombe sur la route Next.js interne.
    const cheminMaintenance = new URL(req.url).pathname;
    if (cheminMaintenance === "/maintenance" || cheminMaintenance.startsWith("/maintenance/")) {
      const maintenance = (env as { MAINTENANCE?: { fetch: typeof fetch } }).MAINTENANCE;
      if (maintenance) return maintenance.fetch(req);
    }
    const { default: handler } = (await import("./.open-next/worker.js")) as any;
    try {
      return await handler.fetch(req, env, ctx);
    } catch (e) {
      // Diagnostic 500 : erreur journalisee (Workers Logs) et renvoyee en
      // clair UNIQUEMENT si l en-tete x-debug porte CRON_SECRET. Sans
      // l en-tete : reponse 500 generique, rien n est expose au public.
      const pile = e instanceof Error ? e.name + ": " + e.message + "\n" + (e.stack ?? "") : String(e);
      console.error("ERREUR WORKER WWW", req.url, pile);
      if (env.CRON_SECRET && req.headers.get("x-debug") === env.CRON_SECRET) {
        return new Response(pile, { status: 500, headers: { "content-type": "text/plain; charset=utf-8" } });
      }
      return new Response("Erreur interne", { status: 500 });
    }
  },
  async scheduled(event, env, ctx) {
    const chemin = CRONS[event.cron];
    if (!chemin) return;
    const { default: handler } = (await import("./.open-next/worker.js")) as any;
    const secret = typeof env.CRON_SECRET === "string" ? env.CRON_SECRET : "";
    ctx.waitUntil(
      handler.fetch(
        new Request(`${ORIGINE}${chemin}`, { headers: { authorization: `Bearer ${secret}` } }),
        env,
        ctx,
      ),
    );
  },
} satisfies ExportedHandler<Env>;
