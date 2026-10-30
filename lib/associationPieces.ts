import "server-only";
import { authAdmin } from "./supabaseAdmin";

// Pièces justificatives d'association (fallback sans adresse
// parlementaire) : badge/carte AN ou Sénat, contrat, capture de la
// messagerie interne... Dépôt par l'utilisateur (api/compte/association/
// piece) ou par l'admin (api/admin/matchprofile/piece). Stockage dans un
// bucket PRIVÉ (jamais d'URL publique) ; consultation admin par session.
// Purge : dès la décision, et au plus tard 30 jours après le dépôt.

export const BUCKET_PIECES = "pieces-association";
export const TAILLE_PIECE_MAX = 5 * 1024 * 1024;
const PURGE_JOURS = 30;

const EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

export function mimePieceAutorise(mime: string): boolean {
  return mime in EXT;
}

export async function deposerPiece(p: {
  demandeId: string; userId: string; collabId: string; nom: string;
  mime: string; bytes: ArrayBuffer; deposePar: "utilisateur" | "admin";
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (!mimePieceAutorise(p.mime)) return { ok: false, error: "format non accepté" };
  const ext = EXT[p.mime];
  const chemin = p.demandeId + "/" + crypto.randomUUID() + "." + ext;
  const db = authAdmin();
  const { data: row, error } = await db.from("associations_pieces")
    .insert({
      demande_id: p.demandeId, user_id: p.userId, collab_id: p.collabId,
      chemin, nom: p.nom.slice(0, 120), type_mime: p.mime,
      taille: p.bytes.byteLength, depose_par: p.deposePar,
    })
    .select("id")
    .single();
  if (error || !row) return { ok: false, error: "enregistrement impossible" };
  const { error: errUpload } = await db.storage.from(BUCKET_PIECES)
    .upload(chemin, p.bytes, { contentType: p.mime, upsert: true });
  if (errUpload) {
    await db.from("associations_pieces").delete().eq("id", row.id);
    return { ok: false, error: "stockage impossible" };
  }
  return { ok: true, id: row.id };
}

// Dernière pièce active de chaque demande d'une liste (pour la file admin).
export async function piecesDesDemandes(demandeIds: string[]): Promise<Map<string, { id: string; nom: string; cree_le: string }>> {
  if (!demandeIds.length) return new Map();
  const { data } = await authAdmin().from("associations_pieces")
    .select("id, demande_id, nom, cree_le, supprime_le")
    .in("demande_id", demandeIds)
    .is("supprime_le", null)
    .order("cree_le", { ascending: false });
  const map = new Map<string, { id: string; nom: string; cree_le: string }>();
  for (const p of data ?? []) {
    if (!map.has(p.demande_id)) map.set(p.demande_id, { id: p.id, nom: p.nom, cree_le: p.cree_le });
  }
  return map;
}

// Contenu d'une pièce, pour la consultation admin (téléchargement).
export async function contenuPiece(pieceId: string): Promise<{ bytes: ArrayBuffer; mime: string; nom: string } | null> {
  const { data: piece } = await authAdmin().from("associations_pieces")
    .select("chemin, nom, type_mime, supprime_le")
    .eq("id", pieceId).is("supprime_le", null).maybeSingle();
  if (!piece) return null;
  const { data: blob, error } = await authAdmin().storage.from(BUCKET_PIECES).download(piece.chemin);
  if (error || !blob) return null;
  return { bytes: await blob.arrayBuffer(), mime: piece.type_mime, nom: piece.nom };
}

// Supprime les fichiers d'une demande et marque les lignes purgées.
export async function purgerPiecesDemande(demandeId: string): Promise<void> {
  const db = authAdmin();
  const { data: lignes } = await db.from("associations_pieces")
    .select("id, chemin").eq("demande_id", demandeId).is("supprime_le", null);
  if (!lignes?.length) return;
  await db.storage.from(BUCKET_PIECES).remove(lignes.map((l: { chemin: string }) => l.chemin));
  await db.from("associations_pieces")
    .update({ supprime_le: new Date().toISOString() })
    .in("id", lignes.map((l: { id: string }) => l.id));
}

// Purge opportuniste au chargement de la file admin : toute pièce de plus
// de 30 jours sans décision disparaît (fichier + ligne marquée).
export async function purgerPiecesAnciennes(): Promise<void> {
  const limite = new Date(Date.now() - PURGE_JOURS * 86400_000).toISOString();
  const db = authAdmin();
  const { data: lignes } = await db.from("associations_pieces")
    .select("demande_id").is("supprime_le", null).lt("cree_le", limite);
  const ids = [...new Set((lignes ?? []).map((l: { demande_id: string }) => l.demande_id))];
  for (const id of ids) await purgerPiecesDemande(id);
}
