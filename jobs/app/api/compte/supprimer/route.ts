import { supprimerDonneesCompte } from "@/lib/firestore";

export const dynamic = "force-dynamic";

// Suppression du compte par l'utilisateur lui-même (page Mon compte). La
// session du client sert de preuve d'identité (GET /auth/v1/user avec son
// jeton d'accès) ; la clé service SUPABASE_SERVICE_ROLE_KEY, présente côté
// serveur uniquement, réalise le DELETE admin. Sans cette clé : 503, la page
// invite à passer par le formulaire de contact (sujet RGPD).

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_SUPABASE_URL ?? "https://kuywydrsfuixppchugpe.supabase.co";
const AUTH_KEY = process.env.NEXT_PUBLIC_AUTH_SUPABASE_KEY ?? "sb_publishable_oYCbgl4J2fz9RnwOmsEz9w_DMVp-rZ6";

export async function POST(req: Request) {
  const corps = await req.json().catch(() => null);
  const jeton = typeof corps?.jeton === "string" ? corps.jeton : "";
  if (!jeton || jeton.length > 4096) {
    return Response.json({ erreur: "session absente, reconnectez-vous" }, { status: 401 });
  }
  const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!cle) {
    return Response.json(
      { erreur: "suppression directe non disponible : utilisez le formulaire de contact (sujet RGPD)" },
      { status: 503 }
    );
  }

  // Identité relue côté serveur depuis la session : le corps de la requête
  // ne transporte aucun identifiant de compte auquel se fier.
  let utilisateur: { id?: string; email?: string } | null = null;
  try {
    const verif = await fetch(AUTH_URL + "/auth/v1/user", {
      headers: { apikey: AUTH_KEY, Authorization: "Bearer " + jeton },
    });
    if (!verif.ok) return Response.json({ erreur: "session expirée, reconnectez-vous" }, { status: 401 });
    utilisateur = (await verif.json().catch(() => null)) as { id?: string; email?: string } | null;
  } catch {
    return Response.json({ erreur: "vérification impossible pour le moment" }, { status: 502 });
  }
  const id = typeof utilisateur?.id === "string" ? utilisateur.id : "";
  const email = typeof utilisateur?.email === "string" ? utilisateur.email.toLowerCase() : "";
  if (!id || !email) return Response.json({ erreur: "compte introuvable" }, { status: 404 });

  // Nettoyage des données du service (alertes, CV Matching) au mieux.
  try {
    await supprimerDonneesCompte(email);
  } catch {}

  try {
    const suppr = await fetch(AUTH_URL + "/auth/v1/admin/users/" + id, {
      method: "DELETE",
      headers: { apikey: cle, Authorization: "Bearer " + cle },
    });
    if (!suppr.ok) return Response.json({ erreur: "suppression impossible pour le moment" }, { status: 502 });
  } catch {
    return Response.json({ erreur: "suppression impossible pour le moment" }, { status: 502 });
  }
  return Response.json({ ok: true });
}
