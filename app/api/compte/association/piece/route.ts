import { NextResponse } from "next/server";
import { utilisateur } from "@/lib/userAuth";
import { authAdmin } from "@/lib/supabaseAdmin";
import { deposerPiece, TAILLE_PIECE_MAX, mimePieceAutorise } from "@/lib/associationPieces";
import { prevenirAssociation } from "@/lib/association";

export const dynamic = "force-dynamic";

// Dépôt d'une pièce justificative (fallback quand l'adresse
// parlementaire est inaccessible : ancien collaborateur, messagerie
// hors service...). La pièce part dans un bucket privé, la demande
// passe en « piece_jointe » et remonte dans la file admin pour décision
// manuelle. Jamais publiée, purgée à la décision ou sous 30 jours.

export async function POST(req: Request) {
  const u = await utilisateur(req);
  if (!u) return NextResponse.json({ error: "connexion requise" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const slug = String(form?.get("slug") ?? "");
  const fichier = form?.get("fichier");
  if (!form || !/^[a-z0-9_]{3,120}$/.test(slug) || !(fichier instanceof File)) {
    return NextResponse.json({ error: "requête invalide" }, { status: 400 });
  }
  if (fichier.size === 0 || fichier.size > TAILLE_PIECE_MAX) {
    return NextResponse.json({ error: "fichier trop volumineux (5 Mo maximum)" }, { status: 400 });
  }
  if (!mimePieceAutorise(fichier.type)) {
    return NextResponse.json({ error: "format non accepté (PDF, JPEG ou PNG)" }, { status: 400 });
  }

  const db = authAdmin();
  const { data: demande } = await db.from("associations_fiches")
    .select("id, collab_id, statut, gel_jusqu_a")
    .eq("user_id", u.id).eq("collab_slug", slug).maybeSingle();
  if (!demande) return NextResponse.json({ error: "demande introuvable : demandez d'abord l'e-mail de vérification" }, { status: 400 });
  if (demande.statut === "verifie") return NextResponse.json({ error: "fiche déjà associée à ce compte" }, { status: 400 });
  if (demande.statut === "gele" && demande.gel_jusqu_a && new Date(demande.gel_jusqu_a).getTime() > Date.now()) {
    return NextResponse.json({ error: "demandes suspendues" }, { status: 400 });
  }

  const bytes = await fichier.arrayBuffer();
  const entete = new Uint8Array(bytes.slice(0, 4));
  const pdf = entete[0] === 0x25 && entete[1] === 0x50 && entete[2] === 0x44 && entete[3] === 0x46;
  const png = entete[0] === 0x89 && entete[1] === 0x50 && entete[2] === 0x4e && entete[3] === 0x47;
  const jpg = entete[0] === 0xff && entete[1] === 0xd8 && entete[2] === 0xff;
  const signatureOk = (fichier.type === "application/pdf" && pdf) || (fichier.type === "image/png" && png) || (fichier.type === "image/jpeg" && jpg);
  if (!signatureOk) return NextResponse.json({ error: "fichier illisible ou corrompu" }, { status: 400 });

  const r = await deposerPiece({
    demandeId: demande.id, userId: u.id, collabId: demande.collab_id,
    nom: fichier.name || "piece", mime: fichier.type, bytes, deposePar: "utilisateur",
  });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 500 });

  await db.from("associations_fiches")
    .update({ statut: "piece_jointe", maj_le: new Date().toISOString() })
    .eq("id", demande.id);
  await db.from("associations_journal")
    .insert({ user_id: u.id, collab_id: demande.collab_id, evenement: "piece_deposee", detail: { piece_id: r.id } });
  await prevenirAssociation("piece_deposee", slug).catch(() => {});
  return NextResponse.json({ ok: true });
}
