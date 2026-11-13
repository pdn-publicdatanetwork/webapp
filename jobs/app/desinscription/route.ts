import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Désinscription aux alertes emplois : la vérification du jeton signé et la
// mise à jour Firestore (alert_subscriptions, actif: false) vivent dans le
// webapp (www.dataparl.fr/api/jobs/desinscription), qui partage APP_SECRET
// avec la chaîne d'envoi des alertes. Cette route redirige vers elle en
// conservant l'adresse et le jeton.
export async function GET(req: Request) {
  const params = new URL(req.url).search;
  return NextResponse.redirect(`https://www.dataparl.fr/api/jobs/desinscription${params}`, 302);
}
