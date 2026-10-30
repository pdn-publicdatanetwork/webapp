// Journal des vues des pages mentionnant les canaux WhatsApp et Telegram
// (DataParl' Daily) : chaque consultation de ces pages est enregistrée côté
// serveur : horodatage, adresse IP, navigateur, page d'origine : dans la
// table `vues_reseaux` (projet Supabase dataparl-auth). Consultation réservée
// à l'admin (Journal → Vues canaux) ; conservation 13 mois (durée CNIL des
// logs techniques), purge automatique déclenchée ici.
//
// Utilisé depuis proxy.ts (middleware) : pas d'import "server-only", accès
// REST direct par fetch, compatible Edge : même principe que lib/maintenance.

import { AUTH_SUPABASE_URL, secret } from "./env";

// Pages à tracer (préfixes) : celles qui affichent les liens des canaux
// WhatsApp/Telegram ou qui y mènent (inscription, désinscription, bot).
export const CHEMINS_RESEAUX = [
  "/daily", // canaux Telegram et WhatsApp + archives jour par jour
  "/a-propos", // présentation des canaux
  "/chat", // assistant Telegram
  "/desinscription/wa", // désinscription du Daily WhatsApp
  "/informations-legales/cgu-chat/tm-bot", // CGU du bot Telegram
] as const;

export function estPageReseaux(path: string): boolean {
  return CHEMINS_RESEAUX.some((c) => path === c || path.startsWith(`${c}/`));
}

type Vue = { chemin: string; ip: string; userAgent: string; referer: string };

// Enregistre une vue. Ne lève jamais : le journal ne doit pas casser la page.
export async function journaliserVueReseaux(vue: Vue): Promise<void> {
  try {
    const cle = secret("AUTH_SUPABASE_SERVICE_ROLE_KEY");
    const headers = { apikey: cle, Authorization: `Bearer ${cle}` };
    await fetch(`${AUTH_SUPABASE_URL}/rest/v1/vues_reseaux`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({
        chemin: vue.chemin.slice(0, 300),
        ip: vue.ip || null,
        user_agent: vue.userAgent || null,
        referer: vue.referer || null,
      }),
      signal: AbortSignal.timeout(4000),
    });
    // Purge : au-delà de 13 mois, effacé. Lancée environ une fois sur 50
    // vues : largement suffisant à ce volume, jamais coûteux.
    if (Math.random() < 0.02) {
      const limite = new Date(Date.now() - 13 * 30.44 * 86400_000).toISOString();
      await fetch(`${AUTH_SUPABASE_URL}/rest/v1/vues_reseaux?le=lt.${limite}`, {
        method: "DELETE", headers, signal: AbortSignal.timeout(4000),
      });
    }
  } catch {
    // silencieux : le traçage ne doit jamais bloquer la navigation
  }
}
