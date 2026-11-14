import { NextResponse } from "next/server";
import { hashJeton } from "@/lib/mail";
import { authAdmin } from "@/lib/supabaseAdmin";
import { randomToken } from "@/lib/tokens";
import { utilisateur } from "@/lib/userAuth";

export const dynamic = "force-dynamic";

// Ouverture d'une session d'enquête : appelé par le site quand un visiteur
// connecté accepte de répondre (après ~4 minutes sur le site). La réponse est
// liée à son compte ; le lien forms.dataparl.fr/avis porte un jeton aléatoire dont
// seul le sha256 est stocké (même convention que les versions en ligne des
// emails). Une nouvelle invitation crée une nouvelle ligne.
export async function POST(req: Request) {
  const user = await utilisateur(req);
  if (!user?.email) return NextResponse.json({ error: "non connecté" }, { status: 401 });
  const jeton = randomToken(24);
  const { error } = await authAdmin().from("survey_reponses").insert({
    user_id: user.id, email: user.email, jeton_hash: hashJeton(jeton),
  });
  if (error) {
    console.error("survey insert", error);
    return NextResponse.json({ error: "enquête momentanément indisponible" }, { status: 500 });
  }
  return NextResponse.json({ url: `https://forms.dataparl.fr/avis?j=${jeton}` });
}
