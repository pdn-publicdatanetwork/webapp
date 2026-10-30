import { NextResponse } from "next/server";
import { audit, checkAdmin, refus } from "@/lib/adminAuth";
import { authAdmin } from "@/lib/supabaseAdmin";
import { contenuPiece, deposerPiece, mimePieceAutorise, TAILLE_PIECE_MAX } from "@/lib/associationPieces";
import { prevenirAssociation } from "@/lib/association";

export const dynamic = "force-dynamic";

// Consultation et dépôt admin des pièces justificatives d'association.
// GET : télécharge une pièce (jamais d'URL publique, session admin).
// POST : l'admin joint lui-même une pièce (reçue par exemple via le
// formulaire de contact), puis tranche dans la file habituelle.

export async function GET(req: Request) {
  const a = await checkAdmin(req);
  if (!a.ok) return refus(a);
  if (!a.modules.includes("comptes")) return NextResponse.json({ error: "accès refusé" }, { status: 403 });
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const piece = await contenuPiece(id);
  if (!piece) return NextResponse.json({ error: "pièce introuvable" }, { status: 404 });
  return new Response(piece.bytes, {
    headers: {
      "Content-Type": piece.mime,
      "Content-Disposition": 'attachment; filename="' + piece.nom.replace(/[^a-zA-Z0-9._-]/g, "_") + '"',
      "Cache-Control": "private, no-store",
    },
  });
}

export async function POST(req: Request) {
  const a = await checkAdmin(req);
  if (!a.ok) return refus(a);
  if (!a.modules.includes("comptes")) return NextResponse.json({ error: "accès refusé" }, { status: 403 });
  const form = await req.formData().catch(() => null);
  const demandeId = String(form?.get("demande_id") ?? "");
  const fichier = form?.get("fichier");
  if (!form || !demandeId || !(fichier instanceof File) || !fichier.size || fichier.size > TAILLE_PIECE_MAX || !mimePieceAutorise(fichier.type)) {
    return NextResponse.json({ error: "paramètres invalides (PDF, JPEG ou PNG, 5 Mo maximum)" }, { status: 400 });
  }
  const db = authAdmin();
  const { data: demande } = await db.from("associations_fiches")
    .select("id, user_id, collab_id, collab_slug, statut").eq("id", demandeId).maybeSingle();
  if (!demande) return NextResponse.json({ error: "demande introuvable" }, { status: 404 });

  const r = await deposerPiece({
    demandeId: demande.id, userId: demande.user_id, collabId: demande.collab_id,
    nom: fichier.name || "piece", mime: fichier.type, bytes: await fichier.arrayBuffer(), deposePar: "admin",
  });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 500 });
  if (demande.statut !== "verifie") {
    await db.from("associations_fiches")
      .update({ statut: "piece_jointe", maj_le: new Date().toISOString() })
      .eq("id", demande.id);
  }
  await db.from("associations_journal")
    .insert({ user_id: demande.user_id, collab_id: demande.collab_id, evenement: "piece_admin", detail: { piece_id: r.id } });
  await prevenirAssociation("piece_admin", demande.collab_slug).catch(() => {});
  await audit(a, "association.piece_admin", demande.id);
  return NextResponse.json({ ok: true });
}
