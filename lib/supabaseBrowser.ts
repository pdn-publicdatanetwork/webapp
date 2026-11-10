"use client";
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { cookieStorage } from "./cookieStorage";
import { AUTH_FIREBASE_ACTIF, AUTH_SUPABASE_KEY, AUTH_SUPABASE_URL } from "./env";
import { deconnexionFirebase, sessionFirebaseSynthese } from "./sessionFirebase";

// Client navigateur de dataparl-auth (clé publique). La session est stockée
// dans des cookies du domaine .dataparl.fr : partagée entre www, api et
// admin (voir cookieStorage).
let client: SupabaseClient | null = null;

export function authBrowser(): SupabaseClient {
  if (!client) {
    client = createClient(AUTH_SUPABASE_URL, AUTH_SUPABASE_KEY, {
      auth: { flowType: "pkce", persistSession: true, detectSessionInUrl: true, storage: cookieStorage, storageKey: "dp-auth" },
    });
  }
  return client;
}

// Session avec un jeton à jour. supabase-js rafraîchit le jeton par un
// minuteur en mémoire, mais les navigateurs suspendent les minuteurs d'un
// onglet en arrière-plan : après un moment (ou une nuit d'onglet ouvert), le
// jeton stocké est expiré et la première action échoue avec « non connecté ».
// On rafraîchit donc explicitement la session quand elle touche à sa fin.
export async function sessionActuelle(): Promise<Session | null> {
  const a = authBrowser();
  const { data } = await a.auth.getSession();
  const s = data.session;
  if (!s) {
    // Bascule Firebase (double-run) : sans session GoTrue, on sert la session
    // Firebase du cookie dp-firebase (même cookie morcelé, même .dataparl.fr),
    // synthétisée au format supabase-js. Aucun composant lecteur à patcher.
    if (AUTH_FIREBASE_ACTIF) return sessionFirebaseSynthese();
    return null;
  }
  if (s.expires_at && s.expires_at * 1000 < Date.now() + 60_000) {
    const { data: r } = await a.auth.refreshSession();
    return r.session ?? s;
  }
  return s;
}

// Déconnexion (facade) : supprime la session GoTrue ET la session Firebase.
// Pendant le double-run, un compte peut avoir les deux cookies (GoTrue pour
// admin., Firebase pour www) : on nettoie tout, l'utilisateur déconnecté
// reçoit la porte adaptée à son sous-domaine.
export async function deconnexion(): Promise<void> {
  try {
    await authBrowser().auth.signOut();
  } catch {}
  await deconnexionFirebase();
}
