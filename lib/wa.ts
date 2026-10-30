import "server-only";
import { randomToken, sha256 } from "./tokens";
import { authAdmin } from "./supabaseAdmin";
import { SITE_URL } from "./env";

// Abonnés WhatsApp du DataParl' Daily (table wa_abonnes de dataparl-auth,
// écrite aussi par le diffuseur daily-wa-tm via la clé service_role).
// Le jeton de désinscription n'est stocké que haché (SHA-256), comme
// communication_tokens pour les emails.

// Normalise un numéro français mobile vers le format international sans
// « + » attendu par l'API WhatsApp : 06/07 12 34 56 78 → 33612345678.
// V1 France métropolitaine uniquement (public du Daily) : on refuse
// explicitement le reste plutôt que d'inscrire un numéro invalide.
export function normaliserTel(saisie: string): string | null {
  const brut = saisie.replace(/[\s.\-()]/g, "");
  const m =
    brut.match(/^(?:\+33|0033|33)([67])(\d{8})$/) ??
    brut.match(/^0([67])(\d{8})$/);
  if (!m) return null;
  return `33${m[1]}${m[2]}`;
}

// Inscrit (ou réactive) un abonné et renvoie le jeton de désinscription :
// en clair une seule fois, ici, pour construire le lien ; seul son hash est
// conservé. La réinscription régénère le jeton (un seul actif par numéro).
export async function inscrireWa(tel: string): Promise<string> {
  const jeton = randomToken();
  const { error } = await authAdmin().from("wa_abonnes").upsert(
    { tel, jeton_hash: await sha256(jeton), actif: true, maj_le: new Date().toISOString() },
    { onConflict: "tel" }
  );
  if (error) throw new Error(error.message);
  return jeton;
}

export function lienDesinscriptionWa(jeton: string): string {
  return `${SITE_URL}/desinscription/wa?jeton=${jeton}`;
}

export async function desinscrireWa(jeton: string): Promise<boolean> {
  if (!jeton || jeton.length < 20 || jeton.length > 100) return false;
  const { data, error } = await authAdmin()
    .from("wa_abonnes")
    .update({ actif: false, maj_le: new Date().toISOString() })
    .eq("jeton_hash", await sha256(jeton))
    .select("tel")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data);
}
