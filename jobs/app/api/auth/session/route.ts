import { NextResponse } from "next/server";
import { emailDepuisJetonFirebase } from "@/lib/firebaseAuth";
import { idAssurePourEmail, majDerniereConnexion } from "@/lib/compteAuthSupabase";

// Échange un id token Firebase vérifié contre l'identifiant Postgres du
// compte (auth.users du projet auth). Le jeton est vérifié par le SDK admin
// (aud = dataparl-auth), puis le compte est retrouvé par e-mail (les uid
// Firebase ont été importés à l'identique : même uuid Postgres). Un nouveau
// venant est créé, uid = nouvel uuid Postgres. Validation manuelle (pas de zod).
// Chaque connexion rafraîchit last_sign_in_at côté auth (admin /admin/users).

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const corps = (await req.json().catch(() => null)) as { idToken?: unknown } | null;
  const idToken = typeof corps?.idToken === "string" ? corps.idToken : "";
  if (idToken.length < 20 || idToken.length > 4000) {
    return NextResponse.json({ erreur: "requête invalide" }, { status: 400 });
  }
  let email: string | null = null;
  try {
    email = await emailDepuisJetonFirebase(idToken);
  } catch (e) {
    const detail = (e as { message?: string })?.message ?? "erreur inconnue";
    return NextResponse.json({ erreur: "configuration serveur", detail: detail.split("\n")[0].slice(0, 200) }, { status: 500 });
  }
  if (!email) return NextResponse.json({ erreur: "jeton invalide" }, { status: 401 });
  try {
    const id = await idAssurePourEmail(email);
    await majDerniereConnexion(email);
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    return NextResponse.json({ erreur: (e as Error).message.slice(0, 120) || "réconciliation impossible" }, { status: 502 });
  }
}
