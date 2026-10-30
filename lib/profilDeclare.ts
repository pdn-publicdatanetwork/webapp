import "server-only";
import { authAdmin, dataAdmin } from "./supabaseAdmin";

// Profil CV déclaré par un collaborateur associé à sa fiche : publication
// immédiate, éléments futurs publiés automatiquement à leur date d'effet
// (visible_a_partir_de), suppression douce (retiré du site, conservé en
// base comme sauvegarde interne, restaurable uniquement sur demande).

const MAX_ELEMENTS = 100;
export const CATEGORIES = ["formation", "carriere", "autre_activite", "langues"] as const;
type Categorie = (typeof CATEGORIES)[number];

export type Declaration = {
  id: string; categorie: Categorie; libelle: string; precision_text: string | null;
  periode: string | null; etablissement: string | null; visible_a_partir_de: string | null;
};

// Garde-fous éditoriaux : catégories fixes, longueurs bornées, pas d'URL,
// pas de mention de tiers (e-mails, liens), max MAX_ELEMENTS par fiche.
function valider(d: { categorie: string; libelle: string; precision_text?: string | null; periode?: string | null }): string | null {
  if (!CATEGORIES.includes(d.categorie as Categorie)) return "catégorie inconnue";
  if (!d.libelle || d.libelle.length > 120) return "libellé invalide (1 à 120 caractères)";
  const tout = (d.libelle + " " + (d.precision_text ?? "")).toLowerCase();
  if (/https?:\/\/|www\.|@[a-z0-9.-]+\.[a-z]{2,}/.test(tout)) return "pas de lien ni d'adresse e-mail dans les éléments déclarés";
  if (d.precision_text && d.precision_text.length > 240) return "précision trop longue (240 max)";
  if (d.periode && d.periode.length > 60) return "période trop longue (60 max)";
  return null;
}

// Éléments visibles sur la fiche : non supprimés, date d'effet atteinte.
export async function declarationsVisibles(collabId: string): Promise<Declaration[]> {
  const { data } = await authAdmin().from("collab_declarations")
    .select("id, categorie, libelle, precision_text, periode, etablissement, visible_a_partir_de")
    .eq("collab_id", collabId).is("supprime_le", null)
    .or(`visible_a_partir_de.is.null,visible_a_partir_de.lte.${new Date().toISOString().slice(0, 10)}`)
    .order("visible_a_partir_de", { ascending: false, nullsFirst: true })
    .order("cree_le", { ascending: true })
    .limit(MAX_ELEMENTS);
  return (data ?? []) as Declaration[];
}

export async function mesDeclarations(userId: string): Promise<(Declaration & { collab_id: string; supprime_le: string | null })[]> {
  const { data } = await authAdmin().from("collab_declarations")
    .select("id, collab_id, categorie, libelle, precision_text, periode, etablissement, visible_a_partir_de, supprime_le")
    .eq("user_id", userId).order("cree_le", { ascending: true }).limit(MAX_ELEMENTS);
  return data ?? [];
}

export async function ajouterDeclaration(userId: string, collabId: string, d: {
  categorie: string; libelle: string; precision_text?: string | null; periode?: string | null;
  etablissement?: string | null; visible_a_partir_de?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const err = valider(d);
  if (err) return { ok: false, error: err };
  const db = authAdmin();
  // Seule une association vérifiée permet de publier sur cette fiche.
  const { count } = await db.from("associations_fiches")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId).eq("collab_id", collabId).eq("statut", "verifie");
  if (!(count ?? 0)) return { ok: false, error: "fiche non associée à ce compte" };
  const { count: total } = await db.from("collab_declarations")
    .select("id", { count: "exact", head: true })
    .eq("collab_id", collabId).is("supprime_le", null);
  if ((total ?? 0) >= MAX_ELEMENTS) return { ok: false, error: "trop d'éléments déclarés" };
  await db.from("collab_declarations").insert({
    user_id: userId, collab_id: collabId, categorie: d.categorie, libelle: d.libelle,
    precision_text: d.precision_text ?? null, periode: d.periode ?? null,
    etablissement: d.etablissement ?? null,
    visible_a_partir_de: d.visible_a_partir_de || null,
  });
  return { ok: true };
}

export async function modifierDeclaration(userId: string, id: string, patch: {
  categorie?: string; libelle?: string; precision_text?: string | null;
  periode?: string | null; etablissement?: string | null; visible_a_partir_de?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  if (patch.categorie || patch.libelle) {
    const err = valider({
      categorie: patch.categorie ?? "formation", libelle: patch.libelle ?? "x",
      precision_text: patch.precision_text, periode: patch.periode,
    });
    if (err) return { ok: false, error: err };
  }
  const maj = {
    ...(patch.categorie ? { categorie: patch.categorie } : {}),
    ...(patch.libelle ? { libelle: patch.libelle } : {}),
    precision_text: patch.precision_text ?? null, periode: patch.periode ?? null,
    etablissement: patch.etablissement ?? null,
    visible_a_partir_de: patch.visible_a_partir_de || null,
    maj_le: new Date().toISOString(),
  };
  const r = await authAdmin().from("collab_declarations").update(maj)
    .eq("id", id).eq("user_id", userId).is("supprime_le", null);
  return { ok: !r.error, error: r.error?.message };
}

// Suppression douce d'un élément : retiré du site, conservé en base
// (sauvegarde interne, restaurable sur demande de la personne).
export async function supprimerDeclaration(userId: string, id: string): Promise<void> {
  await authAdmin().from("collab_declarations")
    .update({ supprime_le: new Date().toISOString(), maj_le: new Date().toISOString() })
    .eq("id", id).eq("user_id", userId).is("supprime_le", null);
}

// « Tout supprimer » : la rubrique Profil CV disparaît immédiatement de la
// fiche visible ; contenu conservé en base, restaurable sur demande.
export async function supprimerProfil(userId: string): Promise<void> {
  await authAdmin().from("collab_declarations")
    .update({ supprime_le: new Date().toISOString(), maj_le: new Date().toISOString() })
    .eq("user_id", userId).is("supprime_le", null);
}

// Retrait de la fiche quand le lien compte-fiche est rompu :
// dissociation admin ou suppression du compte (promesse affichée dans
// « Ma fiche » et « Données et confidentialité »). Les déclarations
// partent en suppression douce (sauvegarde interne), la photo du bucket
// photos-profils et la colonne collaborateurs.photo_url sont effacées.
export async function retirerFicheCollab(userId: string, collabId: string): Promise<void> {
  if (!collabId) return;
  const db = authAdmin();
  await db.from("collab_declarations")
    .update({ supprime_le: new Date().toISOString(), maj_le: new Date().toISOString() })
    .eq("user_id", userId).eq("collab_id", collabId).is("supprime_le", null);
  const stockage = dataAdmin().storage.from("photos-profils");
  const { data: fichiers } = await stockage.list("", { search: collabId });
  const chemins = (fichiers ?? []).map((f) => f.name).filter((n) => n.startsWith(collabId + "."));
  if (chemins.length) await stockage.remove(chemins);
  await db.from("collaborateurs").update({ photo_url: null }).eq("collab_id", collabId);
}
