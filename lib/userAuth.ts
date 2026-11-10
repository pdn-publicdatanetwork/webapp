import "server-only";
import { createClient, type User } from "@supabase/supabase-js";
import { AUTH_SUPABASE_KEY, AUTH_SUPABASE_URL, FIREBASE_AUTH_PROJECT } from "./env";
import { authFirebase } from "./firebaseAuthAdmin";
import { compteAuthParEmail } from "./supabaseAdmin";

// Identifie l'utilisateur d'un appel d'API à partir de son en-tête
// Authorization: Bearer <jeton>. Deux familles de jetons coexistent pendant
// la bascule vers Firebase (double-run) :
// - jeton GoTrue (JWT Supabase, aud = "authenticated") : vérifié comme avant ;
// - jeton Firebase (aud = "dataparl-auth") : vérifié par le SDK admin, puis
//   réconcilié avec le compte Postgres par e-mail. L'identifiant exposé est
//   toujours l'uuid Postgres : les tables et les clés étrangères ne bougent pas.

function audDuJeton(token: string): string | null {
  try {
    const charge = token.split(".")[1] ?? "";
    const json = JSON.parse(Buffer.from(charge.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
    return typeof json.aud === "string" ? json.aud : null;
  } catch {
    return null;
  }
}

// Jeton Firebase → utilisateur Postgres. La vérification du jeton ne révoque
// pas (les comptes suspendus sont refusés par banned_until, double verrou
// posé par le cron d'anti-abus côté admin SDK).
async function utilisateurFirebase(token: string): Promise<User | null> {
  const claims = await authFirebase().verifyIdToken(token, false).catch(() => null);
  const email = claims?.email;
  if (!email) return null;
  const u = await compteAuthParEmail(email);
  if (!u) return null;
  const banni = u.banned_until as string | null | undefined;
  if (banni && Date.parse(banni) > Date.now()) return null;
  // Fournisseur de la connexion (claims.firebase.sign_in_provider : google.com,
  // github.com, password, email…) : remonté pour maj_derniere_connexion.
  const fb = (claims as { firebase?: { sign_in_provider?: string } } | null)?.firebase;
  return { ...u, aud: "authenticated", role: "authenticated", fournisseur_connexion: fb?.sign_in_provider ?? null } as unknown as User;
}

export async function utilisateur(req: Request): Promise<User | null> {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token || token.startsWith("dp_")) return null; // une clé API n'est pas une session
  if (audDuJeton(token) === FIREBASE_AUTH_PROJECT) return utilisateurFirebase(token);
  const anon = createClient(AUTH_SUPABASE_URL, AUTH_SUPABASE_KEY, { auth: { persistSession: false } });
  const { data, error } = await anon.auth.getUser(token);
  if (error || !data.user?.email) return null;
  return data.user;
}

export function fournisseurs(user: User): string[] {
  const ids = (user.identities ?? []).map((i) => i.provider);
  const meta = (user.app_metadata?.providers as string[] | undefined) ?? [];
  return Array.from(new Set([...ids, ...meta]));
}

// Nom de fournisseur canonique (colonne « Connexion » de l'admin), depuis le
// sign_in_provider Firebase ; null pour les connexions GoTrue (gérées par
// GoTrue lui-même) ou inconnues.
export function fournisseurCanonique(user: User): string | null {
  const brut = (user as unknown as { fournisseur_connexion?: string | null }).fournisseur_connexion ?? null;
  if (!brut) return null;
  if (brut === "google.com") return "google";
  if (brut === "github.com") return "github";
  if (brut.startsWith("email")) return "email";
  return brut;
}
