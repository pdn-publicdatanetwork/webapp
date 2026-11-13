import "server-only";
import { authAdmin } from "./supabaseAdmin";

// Paramètres du site pilotés depuis la console d'administration
// (admin.dataparl.fr → vue « Paramètres & Pop-ups ») : stockés dans la table
// site_parametres (ligne unique id=1) du projet Supabase dataparl-auth,
// modifiés uniquement par la fonction espace-equipe (service_role).
// Lecture côté serveur uniquement ; en cas d'indisponibilité, tout reste
// actif (jamais bloquant). Cache mémoire 5 minutes : les layouts statiques
// et le cron ne relancent pas une requête Supabase à chaque appel.
export type ParametresSite = {
  survey_envoi_auto: boolean;
  popup_sondage: boolean;
  popup_cookies: boolean;
};

export const PARAMETRES_DEFAUT: ParametresSite = {
  survey_envoi_auto: true,
  popup_sondage: true,
  popup_cookies: true,
};

let cache: { valeur: ParametresSite; expire: number } | null = null;
const DUREE_CACHE_MS = 5 * 60_000;

export async function lireParametresSite(): Promise<ParametresSite> {
  if (cache && cache.expire > Date.now()) return cache.valeur;
  try {
    const { data, error } = await authAdmin()
      .from("site_parametres")
      .select("survey_envoi_auto, popup_sondage, popup_cookies")
      .eq("id", 1)
      .maybeSingle();
    const valeur = error || !data ? PARAMETRES_DEFAUT : { ...PARAMETRES_DEFAUT, ...data };
    cache = { valeur, expire: Date.now() + DUREE_CACHE_MS };
    return valeur;
  } catch {
    return PARAMETRES_DEFAUT;
  }
}
