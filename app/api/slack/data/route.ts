import { NextResponse } from "next/server";
import { executerSql } from "@/lib/slackData";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Commande Slack /sql : accès en lecture seule, depuis Slack, aux mêmes
// données que les pages de l'espace admin (comptes, fiche compte, abonnés,
// clés API, téléchargements Sheets, enquête). Créer la commande dans la même
// app Slack que /maintenance, avec l'URL :
//   https://www.dataparl.fr/api/slack/data?t=<MAINTENANCE_TOKEN>
// (même token que /maintenance ; SLACK_SQL_TOKEN permet d'en utiliser un
// dédié). Réponse éphémère : seule la personne qui tape la commande voit les
// données. Requêtes préparées uniquement — aucun SQL libre, aucune écriture.

export async function POST(req: Request) {
  const attendu = process.env.SLACK_SQL_TOKEN ?? process.env.MAINTENANCE_TOKEN ?? "";
  const u = new URL(req.url);
  const params = new URLSearchParams(await req.text());
  const recu = u.searchParams.get("t") ?? params.get("token") ?? "";
  if (!attendu || recu !== attendu) {
    return NextResponse.json({ text: "Non autorisé." }, { status: 401 });
  }
  const texte = (params.get("text") ?? "").trim();
  try {
    return NextResponse.json({ response_type: "ephemeral", blocks: await executerSql(texte) });
  } catch (e) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: `Erreur : ${e instanceof Error ? e.message : String(e)}`,
    });
  }
}
