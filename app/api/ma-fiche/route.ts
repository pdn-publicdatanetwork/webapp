import { NextResponse } from "next/server";
import { utilisateur } from "@/lib/userAuth";
import { statutDemande } from "@/lib/association";
import { dataAdmin } from "@/lib/supabaseAdmin";
import {
  ajouterDeclaration, modifierDeclaration, mesDeclarations,
  supprimerDeclaration, supprimerProfil,
} from "@/lib/profilDeclare";

export const dynamic = "force-dynamic";

// « Ma fiche » : gestion du profil CV déclaré. Publication immédiate (les
// éléments futurs attendent leur date d'effet), suppression douce à tout
// moment. Tout passe par la session : aucune donnée d'un autre compte.

export async function GET(req: Request) {
  const u = await utilisateur(req);
  if (!u) return NextResponse.json({ error: "connexion requise" }, { status: 401 });
  const association = await statutDemande(u.id);
  // Photo de profil (bucket photos-profils, colonne collaborateurs.photo_url).
  let photo_url: string | null = null;
  if (association?.collab_id) {
    const { data } = await dataAdmin().from("collaborateurs")
      .select("photo_url").eq("collab_id", association.collab_id).maybeSingle();
    photo_url = data?.photo_url ?? null;
  }
  return NextResponse.json({
    association,
    declarations: await mesDeclarations(u.id),
    photo_url,
  });
}

export async function POST(req: Request) {
  const u = await utilisateur(req);
  if (!u) return NextResponse.json({ error: "connexion requise" }, { status: 401 });
  const d = await req.json().catch(() => null);
  if (!d?.collab_id || typeof d.collab_id !== "string") {
    return NextResponse.json({ error: "fiche manquante" }, { status: 400 });
  }
  const r = await ajouterDeclaration(u.id, d.collab_id, d);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  const u = await utilisateur(req);
  if (!u) return NextResponse.json({ error: "connexion requise" }, { status: 401 });
  const { id, ...patch } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "élément manquant" }, { status: 400 });
  const r = await modifierDeclaration(u.id, id, patch);
  if (!r.ok) return NextResponse.json({ error: r.error ?? "erreur" }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const u = await utilisateur(req);
  if (!u) return NextResponse.json({ error: "connexion requise" }, { status: 401 });
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (id) await supprimerDeclaration(u.id, id);
  else await supprimerProfil(u.id); // « tout supprimer »
  return NextResponse.json({ ok: true });
}
