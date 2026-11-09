// État public de la maintenance (table maintenance_etat, dataparl-auth) :
// lecture avec la clé publique, gardée 30 s en mémoire : la bascule depuis
// l'admin ou Slack est effective en moins de 30 s, sans redéploiement.
// Filet de sécurité : MAINTENANCE_ACTIVE=1 (Vercel) force la maintenance,
// même si la base est injoignable. En cas d'erreur de lecture : dernier
// état connu (défaut : site ouvert).
// IPs exemptées : maintenance_etat.ips_autorisees (IPv4/IPv6 exactes, ou
// préfixe avec « * ») : ces visiteurs traversent la maintenance.
import { AUTH_SUPABASE_KEY, AUTH_SUPABASE_URL } from "./env";

let cache: { le: number; active: boolean; ips: string[] } | null = null;
const DUREE_MS = 30_000;

let enCours: Promise<boolean> | null = null;

export function maintenanceActive(): Promise<boolean> {
  if (process.env.MAINTENANCE_ACTIVE === "1") return Promise.resolve(true);
  if (cache && Date.now() - cache.le < DUREE_MS) return Promise.resolve(cache.active);
  enCours ??= charger().finally(() => { enCours = null; });
  return enCours;
}

// L'IP du visiteur est-elle exemptée de la maintenance ? Les IPs suivent le
// même cache 30 s que l'état. NB : si MAINTENANCE_ACTIVE=1 (filet de sécurité
// Vercel), aucune IP n'est exemptée : la coupure est totale, par définition.
export async function ipExempteeMaintenance(ip: string): Promise<boolean> {
  if (!ip) return false;
  await maintenanceActive(); // garantit un cache chargé (ou le défaut vide)
  const ips = cache?.ips ?? [];
  const mienne = ip.trim().toLowerCase();
  return ips.some((e) => {
    const entree = e.trim().toLowerCase();
    if (entree.endsWith("*")) return mienne.startsWith(entree.slice(0, -1));
    return mienne === entree;
  });
}

async function charger(): Promise<boolean> {
  try {
    const r = await fetch(`${AUTH_SUPABASE_URL}/rest/v1/maintenance_etat?id=eq.1&select=active,ips_autorisees`, {
      headers: { apikey: AUTH_SUPABASE_KEY, Authorization: `Bearer ${AUTH_SUPABASE_KEY}` }, cache: "no-store", signal: AbortSignal.timeout(1500),
    });
    if (!r.ok) throw new Error(String(r.status));
    const l = (await r.json()) as { active: boolean; ips_autorisees: string[] | null }[];
    cache = { le: Date.now(), active: l[0]?.active === true, ips: l[0]?.ips_autorisees ?? [] };
  } catch {
    cache = { le: Date.now() - DUREE_MS + 10_000, active: cache?.active ?? false, ips: cache?.ips ?? [] }; // nouvel essai dans 10 s
  }
  return cache.active;
}

export function oublierCacheMaintenance(): void { cache = null; }
