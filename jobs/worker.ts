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
    return handler.fetch(req, env, ctx);
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
