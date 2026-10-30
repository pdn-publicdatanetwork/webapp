import { NextResponse } from "next/server";
import { utilisateur } from "@/lib/userAuth";
import { ADRESSE_ASSOCIER, creerDemande, statutDemande } from "@/lib/association";

export const dynamic = "force-dynamic";

// Association compte ↔ fiche collaborateur : GET statut, POST création de
// demande (renvoie objet + code pour le mailto prérempli). L'utilisateur ne
// voit jamais les règles de validation côté serveur.

export async function GET(req: Request) {
  const u = await utilisateur(req);
  if (!u) return NextResponse.json({ error: "connexion requise" }, { status: 401 });
  return NextResponse.json({ statut: await statutDemande(u.id) });
}

export async function POST(req: Request) {
  const u = await utilisateur(req);
  if (!u) return NextResponse.json({ error: "connexion requise" }, { status: 401 });
  const { slug } = await req.json().catch(() => ({}));
  if (typeof slug !== "string" || !/^[a-z0-9_]{3,120}$/.test(slug)) {
    return NextResponse.json({ error: "fiche invalide" }, { status: 400 });
  }
  const r = await creerDemande(u.id, slug);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({
    adresse: ADRESSE_ASSOCIER, objet: r.objet, code: r.code, expireLe: r.expireLe,
  });
}