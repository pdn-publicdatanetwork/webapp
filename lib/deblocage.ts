import "server-only";
import { randomBytes } from "node:crypto";
import { APPLIXIR_API_KEY, DUREE_DEBLOCAGE_H } from "./env";
import { authAdmin } from "./supabaseAdmin";

// Déblocage de contenus (fiche collaborateur, biographie, historique
// d'équipe) par une vidéo publicitaire. Le serveur est seul juge : le
// contenu n'est jamais envoyé avant qu'un rappel signé d'AppLixir (webhook)
// ait enregistré le déblocage. Le signal « vidéo
// terminée » du navigateur ne sert qu'à déclencher la vérification.
// Exception no-fill (règle du 31/10/2026) : si AppLixir n'a aucune vidéo
// à proposer, le contenu est débloqué quand même. Jamais de blocage dur
// faute de publicité.

// Cibles de déblocage : identifiant court d'un collaborateur (8 chiffres
// hexadécimaux, format historique), « bio:<personne_id> » pour la biographie
// complète d'un élu, « equipe:<personne_id> » pour l'historique de ses
// collaborateurs, « feuille:<id> » pour une feuille du tableur DataParl'
// Sheets. La colonne collab_id sert de stockage pour toutes.
import { FEUILLES } from "./sheets";

export const cibleValide = (c: string) =>
  /^(?:[0-9a-f]{8}|(?:bio|equipe):[A-Z]?[A-Za-z0-9]{1,20})$/.test(c) ||
  (c.startsWith("feuille:") && FEUILLES.some((f) => f.id === c.slice(8)));

export function pubActive(): boolean {
  return !!(APPLIXIR_API_KEY && process.env.APPLIXIR_SECRET);
}

// L'équipe (rôle actif) n'a pas à regarder de publicité.
export async function estDebloque(userId: string, cible: string): Promise<{ ok: boolean; expire_le?: string }> {
  if (!pubActive()) return { ok: true };
  const db = authAdmin();
  const [{ data: staff }, { data: d }] = await Promise.all([
    db.from("staff").select("actif").eq("user_id", userId).maybeSingle(),
    db.from("deblocages").select("expire_le").eq("user_id", userId).eq("collab_id", cible)
      .gt("expire_le", new Date().toISOString()).order("expire_le", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (staff?.actif) return { ok: true };
  return d ? { ok: true, expire_le: d.expire_le as string } : { ok: false };
}

// Demande de vidéo : jeton opaque transmis au lecteur, rattaché côté serveur au compte et à la fiche.
export async function creerDemande(userId: string, cible: string): Promise<string> {
  const jeton = randomBytes(16).toString("hex");
  await authAdmin().from("pub_demandes").insert({ jeton, user_id: userId, collab_id: cible });
  return jeton;
}

export async function demandeDe(jeton: string): Promise<{ userId: string; cible: string } | null> {
  const depuis = new Date(Date.now() - 2 * 3600_000).toISOString(); // une demande vaut 2 heures
  const { data } = await authAdmin().from("pub_demandes").select("user_id, collab_id").eq("jeton", jeton).gt("cree_le", depuis).maybeSingle();
  return data ? { userId: data.user_id as string, cible: data.collab_id as string } : null;
}

// Jeton de la demande la plus récente (moins de 10 minutes) pour ce compte
// et cette cible : preuve qu'une tentative de lecture a bien été lancée
// avant d'accorder un déblocage no-fill.
export async function jetonDemandeRecente(userId: string, cible: string): Promise<string | null> {
  const depuis = new Date(Date.now() - 10 * 60_000).toISOString();
  const { data } = await authAdmin().from("pub_demandes").select("jeton")
    .eq("user_id", userId).eq("collab_id", cible).gt("cree_le", depuis)
    .order("cree_le", { ascending: false }).limit(1).maybeSingle();
  return (data?.jeton as string) ?? null;
}

export async function enregistrerDeblocage(userId: string, cible: string, tid: string): Promise<"ok" | "deja"> {
  const expire = new Date(Date.now() + DUREE_DEBLOCAGE_H * 3600_000).toISOString();
  const { error } = await authAdmin().from("deblocages").insert({ user_id: userId, collab_id: cible, tid, expire_le: expire });
  if (error?.code === "23505") return "deja"; // même vue déjà comptée (rejeu)
  if (error) throw error;
  return "ok";
}

export async function journaliserRappel(valide: boolean, motif: string, userRef: string, tid: string): Promise<void> {
  await authAdmin().from("pub_rappels").insert({ valide, motif, user_ref: userRef.slice(0, 120), tid: tid.slice(0, 120) });
}
