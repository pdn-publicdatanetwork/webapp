import { NextResponse } from "next/server";
import { z } from "zod";
import { contexte, effacerDefi, enregistrer, lireDefi, optionsEnregistrement, poserDefi } from "@/lib/passkeys";
import { authAdmin } from "@/lib/supabaseAdmin";
import { utilisateur } from "@/lib/userAuth";

export const dynamic = "force-dynamic";

// Clés d'accès du compte (Touch ID, Face ID, empreinte, clé de sécurité) :
// liste, ajout et retrait, pour les comptes du site (www.dataparl.fr).
export async function GET(req: Request) {
  const user = await utilisateur(req);
  if (!user) return NextResponse.json({ error: "non connecté" }, { status: 401 });
  const { data } = await authAdmin().from("passkeys").select("id, nom, cree_le, utilisee_le").eq("user_id", user.id).order("cree_le");
  return NextResponse.json({ cles: data ?? [], disponible: !!contexte(req) });
}

const Action = z.discriminatedUnion("action", [
  z.object({ action: z.literal("options") }),
  z.object({ action: z.literal("enregistrer"), nom: z.string().trim().max(60).default(""), reponse: z.record(z.string(), z.unknown()) }),
]);

export async function POST(req: Request) {
  const user = await utilisateur(req);
  if (!user) return NextResponse.json({ error: "non connecté" }, { status: 401 });
  const ctx = contexte(req);
  if (!ctx) return NextResponse.json({ error: "les clés d'accès s'enregistrent depuis www.dataparl.fr" }, { status: 400 });
  const p = Action.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "requête invalide" }, { status: 400 });
  if (p.data.action === "options") {
    const options = await optionsEnregistrement(ctx.rpID, { userId: user.id, email: user.email ?? "", github: user.user_metadata?.prenom ?? user.email ?? "" });
    const res = NextResponse.json({ options }, { headers: { "Cache-Control": "no-store" } });
    poserDefi(res, options.challenge, user.id, "/api/compte/passkeys");
    return res;
  }
  const defi = lireDefi(req, user.id);
  if (!defi) return NextResponse.json({ error: "demande expirée, recommence" }, { status: 400 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ok = await enregistrer(ctx, user.id, defi, p.data.reponse as any, p.data.nom || "Clé d'accès");
  if (!ok) return NextResponse.json({ error: "cette clé n'a pas pu être enregistrée" }, { status: 400 });
  const res = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  effacerDefi(res, "/api/compte/passkeys");
  return res;
}

export async function DELETE(req: Request) {
  const user = await utilisateur(req);
  if (!user) return NextResponse.json({ error: "non connecté" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "requête invalide" }, { status: 400 });
  await authAdmin().from("passkeys").delete().eq("id", id).eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
