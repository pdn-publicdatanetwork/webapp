import { createClient } from "@supabase/supabase-js";

// Compte auth (auth.users du projet kuywydrsfuixppchugpe) retrouvé par e-mail
// avec la clé service_role. GoTrue n'expose pas getUserByEmail côté admin
// REST/SDK : on relit la liste des comptes (une page suffit : ~84 comptes,
// page de 1000) et on met en cache mémoire 1 h. Un compte importé dans
// Firebase sans équivalent ici serait créé par l'appelant.

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_SUPABASE_URL ?? "https://kuywydrsfuixppchugpe.supabase.co";
let cache: { at: number; comptes: Map<string, string> } | null = null; // email -> id

function client() {
  const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!cle) throw new Error("SUPABASE_SERVICE_ROLE_KEY absent");
  return createClient(AUTH_URL, cle, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function compteAuthParEmail(email: string): Promise<string | null> {
  const e = email.toLowerCase();
  if (cache && Date.now() - cache.at < 3600_000 && cache.comptes.has(e)) return cache.comptes.get(e) ?? null;
  const comptes = new Map<string, string>();
  const admin = client().auth.admin;
  const { data } = await admin.listUsers({ page: 1, perPage: 1000 });
  for (const u of data?.users ?? []) if (u.email) comptes.set(u.email.toLowerCase(), u.id);
  cache = { at: Date.now(), comptes };
  return comptes.get(e) ?? null;
}

// Crée le compte s'il n'existe pas (première connexion d'un nouveau venu) et
// renvoie son identifiant ; les triggers audit_comptes côté Postgres font le
// reste (uid = nouvel uuid Postgres).
export async function idAssurePourEmail(email: string): Promise<string> {
  const existant = await compteAuthParEmail(email);
  if (existant) return existant;
  const { data, error } = await client().auth.admin.createUser({ email, email_confirm: true });
  if (error || !data?.user) throw new Error(error?.message ?? "création impossible");
  if (cache) cache.comptes.set(email.toLowerCase(), data.user.id);
  return data.user.id;
}

// Rafraîchit last_sign_in_at dans auth.users (fonction security definer du
// projet auth) : la colonne « Dernière connexion » de l'admin webapp reste
// exacte pour les connexions Firebase, GoTrue ne la tient plus à jour.
// Un échec ne bloque pas la connexion (best effort).
export async function majDerniereConnexion(email: string): Promise<void> {
  try {
    await client().rpc("maj_derniere_connexion", { p_email: email });
  } catch {
    // best effort : la colonne repartira à la connexion suivante
  }
}
