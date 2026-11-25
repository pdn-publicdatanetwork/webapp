import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AUTH_SUPABASE_URL, DATA_SUPABASE_URL, secret } from "./env";

// Garde-fou du 25/11 : tous les appels supabase-js (GoTrue, écritures de la
// base data) passent par fetch. Un appel suspendu ne doit pas figer la
// requête du Worker www qui l'attend : pendant la panne du 25/11, des appels
// en attente ont tenu des réponses plusieurs minutes. Plafond aligné sur les
// lectures PostgREST de lib/data.ts (comptes et écritures : 10 s suffisent).
const DELAI_MS = 10_000;

function fetchAvecDelai(input: RequestInfo | URL, init?: RequestInit) {
  return fetch(input, { ...init, signal: AbortSignal.timeout(DELAI_MS) });
}

// Client service_role de dataparl-auth : uniquement côté serveur.
let admin: SupabaseClient | null = null;

export function authAdmin(): SupabaseClient {
  if (!admin) {
    admin = createClient(AUTH_SUPABASE_URL, secret("AUTH_SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false },
      fetch: fetchAvecDelai,
    });
  }
  return admin;
}

// Client service_role de la base de données `dataparl` (élus, mandats…) :
// écriture des tables éditées à la main depuis l'admin (bios, mandats_manuels,
// fonctions_manuelles). Uniquement côté serveur.
let data: SupabaseClient | null = null;

export function dataAdmin(): SupabaseClient {
  if (!data) {
    data = createClient(DATA_SUPABASE_URL, secret("DATA_SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false },
      fetch: fetchAvecDelai,
    });
  }
  return data;
}

// Compte auth.users par e-mail (réconciliation des jetons Firebase). L'API
// admin de GoTrue n'a pas de getUserByEmail : on liste les utilisateurs (les
// ~84 comptes tiennent sur une page) et on met le résultat en cache mémoire
// une heure, l'instance serveur vit plusieurs requêtes.
const cacheComptes = new Map<string, { compte: Record<string, unknown>; expire: number }>();

export async function compteAuthParEmail(email: string): Promise<Record<string, unknown> | null> {
  const e = email.trim().toLowerCase();
  const enMemoire = cacheComptes.get(e);
  if (enMemoire && enMemoire.expire > Date.now()) return enMemoire.compte;
  const { data } = await authAdmin().auth.admin.listUsers({ page: 1, perPage: 1000 });
  for (const u of data?.users ?? []) {
    if ((u.email ?? "").trim().toLowerCase() === e) {
      const compte = u as unknown as Record<string, unknown>;
      cacheComptes.set(e, { compte, expire: Date.now() + 3_600_000 });
      return compte;
    }
  }
  return null;
}
