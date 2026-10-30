import { NextResponse } from "next/server";
import { utilisateur } from "@/lib/userAuth";
import { collaborateurDepuisSlug } from "@/lib/referentiel";
import { declarationsVisibles } from "@/lib/profilDeclare";

export const dynamic = "force-dynamic";

// Profil CV déclaré d'une fiche : réservé aux comptes (même règle que le
// parcours complet). La fiche publique ne rend jamais ces éléments sans
// session authentifiée : c'est ce point d'API qui fait la barrière.

export async function GET(req: Request) {
  const u = await utilisateur(req);
  if (!u) return NextResponse.json({ error: "connexion requise" }, { status: 401 });
  const slug = new URL(req.url).searchParams.get("slug");
  if (!slug || !/^[a-z0-9_]{3,120}$/.test(slug)) {
    return NextResponse.json({ error: "fiche invalide" }, { status: 400 });
  }
  const c = await collaborateurDepuisSlug(slug).catch(() => null);
  if (!c) return NextResponse.json({ error: "fiche introuvable" }, { status: 404 });
  const declarations = await declarationsVisibles(String(c.collab_id));
  return NextResponse.json({
    declarations,
    // La rubrique n'existe que si des éléments déclarés sont visibles.
    vide: declarations.length === 0,
  });
}