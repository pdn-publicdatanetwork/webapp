import { NextResponse } from "next/server";
import { desinscrire, emailDepuisJeton } from "@/lib/consent";

// Désinscription en un clic (RFC 8058) : la messagerie envoie
// POST <List-Unsubscribe> avec le corps « List-Unsubscribe=One-Click ».
export async function POST(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  const email = await emailDepuisJeton(id);
  if (email) await desinscrire(email);
  return new NextResponse(null, { status: 200 });
}

// Clic humain sur le lien (webmails sans POST RFC 8058, lien copié) :
// même effet, puis retour visible vers la page de confirmation. Un GET ne
// doit jamais renvoyer un corps nu : le navigateur le téléchargeait
// (405 JSON) au lieu d'afficher quelque chose.
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  const email = await emailDepuisJeton(id);
  if (email) await desinscrire(email);
  return NextResponse.redirect(new URL(`/desinscription?etat=${email ? "ok" : "invalide"}`, req.url), 303);
}
