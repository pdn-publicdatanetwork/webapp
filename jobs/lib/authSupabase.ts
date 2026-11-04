import { createClient } from "@supabase/supabase-js";

// Auth centralisée DataParl' (projet Supabase dataparl-auth), partagée avec
// www.dataparl.fr. Le webapp expose déjà ces mêmes valeurs publishable.
export const AUTH_SUPABASE_URL = process.env.NEXT_PUBLIC_AUTH_SUPABASE_URL ?? "https://kuywydrsfuixppchugpe.supabase.co";
export const AUTH_SUPABASE_KEY = process.env.NEXT_PUBLIC_AUTH_SUPABASE_KEY ?? "sb_publishable_oYCbgl4J2fz9RnwOmsEz9w_DMVp-rZ6";

export const auth = createClient(AUTH_SUPABASE_URL, AUTH_SUPABASE_KEY, {
  // PKCE (et non le flux implicite par défaut) : Google revient sur
  // jobs.dataparl.fr/auth/callback?code=..., échangé contre la session.
  auth: { flowType: "pkce" },
});

// Suite de redirection après connexion : uniquement un chemin interne.
export const suitePropre = (s: string | null | undefined) =>
  s && s.startsWith("/") && !s.startsWith("//") ? s : "/mon-compte";
