import { NextResponse } from "next/server";
import { z } from "zod";
import { authAdmin } from "@/lib/supabaseAdmin";
import { utilisateur } from "@/lib/userAuth";

export const dynamic = "force-dynamic";

const Chaine = z.string().trim().min(1).max(60).regex(/^[\p{L}\p{N} .\x27\u2019-]+$/u);
const Corps = z.object({ prenom: Chaine, nom: Chaine });

// PUT : modifie le prénom et le nom du compte (métadonnées du compte
// Supabase). Les comptes créés via Google ne passent pas ici : côté client,
// le formulaire est en lecture seule pour eux.
export async function PUT(req: Request) {
  const user = await utilisateur(req);
  if (!user) return NextResponse.json({ error: "connexion requise" }, { status: 401 });
  const parsed = Corps.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "prénom ou nom invalide" }, { status: 400 });
  const data = {
    ...((user.user_metadata ?? {}) as Record<string, unknown>),
    prenom: parsed.data.prenom,
    nom: parsed.data.nom.toUpperCase(),
  };
  const { error } = await authAdmin().auth.admin.updateUserById(user.id, { data });
  if (error) return NextResponse.json({ error: "enregistrement impossible, réessaie" }, { status: 500 });
  return NextResponse.json({ ok: true, prenom: data.prenom as string, nom: data.nom as string });
}