import { NextResponse } from "next/server";
import { z } from "zod";
import { ipDepuisRequete } from "@/lib/apiKeys";
import { motDePasseValide } from "@/lib/motDePasse";
import { mailMotDePasseModifie } from "@/lib/securiteMail";
import { authAdmin } from "@/lib/supabaseAdmin";
import { utilisateur } from "@/lib/userAuth";

export const dynamic = "force-dynamic";

const Corps = z.object({ motDePasse: z.string().min(1).max(128) });

// PUT : définit ou change le mot de passe du compte, puis notifie la
// personne (e-mail de sécurité depuis securite@dataparl.fr, best-effort).
// La connexion par code email et les fournisseurs (Google, GitHub, X)
// restent disponibles.
export async function PUT(req: Request) {
  const user = await utilisateur(req);
  if (!user) return NextResponse.json({ error: "connexion requise" }, { status: 401 });
  const parsed = Corps.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "mot de passe manquant" }, { status: 400 });
  const probleme = motDePasseValide(parsed.data.motDePasse);
  if (probleme) return NextResponse.json({ error: `le mot de passe doit contenir ${probleme}` }, { status: 400 });
  const { error } = await authAdmin().auth.admin.updateUserById(user.id, { password: parsed.data.motDePasse });
  if (error) return NextResponse.json({ error: "impossible d'enregistrer le mot de passe, réessaie" }, { status: 500 });
  await mailMotDePasseModifie(user.id, ipDepuisRequete(req));
  return NextResponse.json({ ok: true });
}
