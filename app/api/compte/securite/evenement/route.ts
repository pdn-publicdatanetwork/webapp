import { NextResponse } from "next/server";
import { z } from "zod";
import { authAdmin } from "@/lib/supabaseAdmin";
import { utilisateur } from "@/lib/userAuth";
import { mail2FA, mailMethodeConnexion } from "@/lib/securiteMail";

export const dynamic = "force-dynamic";

// Signalement des événements de sécurité depuis la page « Sécurité et
// connexion » (validation en deux étapes, méthode de connexion ajoutée ou
// retirée). Le client ne fait que signaler : l'état réel du compte est relu
// côté serveur via l'API admin, c'est lui qui décide du message envoyé.
// Un signalement incohérent avec l'état du compte n'envoie rien.

const Corps = z.discriminatedUnion("type", [
  z.object({ type: z.literal("2fa") }),
  z.object({
    type: z.literal("methode"),
    fournisseur: z.enum(["google", "github", "twitter"]),
    ajoute: z.boolean(),
  }),
]);

export async function POST(req: Request) {
  const user = await utilisateur(req);
  if (!user) return NextResponse.json({ error: "non connecté" }, { status: 401 });
  const parsed = Corps.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "requête invalide" }, { status: 400 });
  const admin = authAdmin().auth.admin;

  if (parsed.data.type === "2fa") {
    // L'état réel des facteurs décide : actifs = validation activée.
    const { data } = await admin.listFactors({ userId: user.id });
    const actifs = (data?.all ?? []).filter((f) => f.status === "verified").length;
    await mail2FA(user.id, actifs > 0);
    return NextResponse.json({ ok: true, active: actifs > 0 });
  }

  // Méthode de connexion : le fournisseur annoncé doit bien correspondre à
  // l'état des identités (présent si « ajoutée », absent si « retirée »).
  const { data } = await admin.getUserById(user.id);
  const presents = new Set((data?.user?.identities ?? []).map((i) => i.provider));
  const coherent = parsed.data.ajoute === presents.has(parsed.data.fournisseur);
  if (coherent) await mailMethodeConnexion(user.id, parsed.data.fournisseur, parsed.data.ajoute);
  return NextResponse.json({ ok: true, envoye: coherent });
}
