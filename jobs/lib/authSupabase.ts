import { createClient } from "@supabase/supabase-js";

// Auth centralisée DataParl' (projet Supabase dataparl-auth), partagée avec
// www.dataparl.fr. Le webapp expose déjà ces mêmes valeurs publishable.
export const AUTH_SUPABASE_URL = process.env.NEXT_PUBLIC_AUTH_SUPABASE_URL ?? "https://kuywydrsfuixppchugpe.supabase.co";
export const AUTH_SUPABASE_KEY = process.env.NEXT_PUBLIC_AUTH_SUPABASE_KEY ?? "sb_publishable_oYCbgl4J2fz9RnwOmsEz9w_DMVp-rZ6";

export const auth = createClient(AUTH_SUPABASE_URL, AUTH_SUPABASE_KEY);

// Suite de redirection après connexion : uniquement un chemin interne.
export const suitePropre = (s: string | null | undefined) =>
  s && s.startsWith("/") && !s.startsWith("//") ? s : "/mon-compte";
