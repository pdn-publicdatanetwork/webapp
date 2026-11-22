// Worker personnalisé DataParl' Jobs : handler OpenNext + Cron Trigger Cloudflare.
// Identique au worker.ts racine (www) mais pour l'app jobs/ : le cron quotidien
// 9 h appelle /api/stats/resume en interne (CLE_STATS optionnelle ajoutée).

interface Env {
  CLE_STATS?: string;
  [cle: string]: unknown;
}

const ORIGINE = "https://jobs.dataparl.fr";
const CHemin: Record<string, string> = {
  "0 9 * * *": "/api/stats/resume",
};

export default {
  async fetch(req, env, ctx) {
    const { default: handler } = (await import("./.open-next/worker.js")) as any;
    try {
      return await handler.fetch(req, env, ctx);
    } catch (e) {
      // Diagnostic 500 : erreur journalisee (Workers Logs) et renvoyee en
      // clair UNIQUEMENT si l en-tete x-debug porte CLE_STATS. Sans
      // l en-tete : reponse 500 generique, rien n est expose au public.
      const pile = e instanceof Error ? e.name + ": " + e.message + "\n" + (e.stack ?? "") : String(e);
      console.error("ERREUR WORKER JOBS", req.url, pile);
      const cleStats = typeof env.CLE_STATS === "string" ? env.CLE_STATS : "";
      if (cleStats && req.headers.get("x-debug") === cleStats) {
        return new Response(pile, { status: 500, headers: { "content-type": "text/plain; charset=utf-8" } });
      }
      return new Response("Erreur interne", { status: 500 });
    }
  },
  async scheduled(event, env, ctx) {
    const chemin = CHemin[event.cron];
    if (!chemin) return;
    const { default: handler } = (await import("./.open-next/worker.js")) as any;
    const cle = typeof env.CLE_STATS === "string" ? env.CLE_STATS : "";
    const url = cle ? ORIGINE + chemin + "?cle=" + encodeURIComponent(cle) : ORIGINE + chemin;
    ctx.waitUntil(
      handler.fetch(new Request(url), env, ctx),
    );
  },
} satisfies ExportedHandler<Env>;
