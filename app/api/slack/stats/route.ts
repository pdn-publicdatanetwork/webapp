import { NextResponse } from "next/server";
import { blocsStats, collecterStats, texteStats } from "@/lib/slackStats";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Commande Slack /stats : statistiques du site et des réseaux à la demande.
// Créer la commande dans la même app Slack que /maintenance, avec l'URL :
//   https://www.dataparl.fr/api/slack/stats?t=<MAINTENANCE_TOKEN>
// (même token que /maintenance ; SLACK_STATS_TOKEN permet d'en utiliser un
// dédié). Réponse éphémère : seule la personne qui tape la commande la voit.
// Arguments : vide (tout), « social » (réseaux seuls), « texte » (une ligne).

export async function POST(req: Request) {
  const attendu = process.env.SLACK_STATS_TOKEN ?? process.env.MAINTENANCE_TOKEN ?? "";
  const u = new URL(req.url);
  const params = new URLSearchParams(await req.text());
  const recu = u.searchParams.get("t") ?? params.get("token") ?? "";
  if (!attendu || recu !== attendu) {
    return NextResponse.json({ text: "Non autorisé." }, { status: 401 });
  }
  const texte = (params.get("text") ?? "").trim().toLowerCase();

  try {
    const s = await collecterStats();
    if (texte === "texte" || texte === "txt") {
      return NextResponse.json({ response_type: "ephemeral", text: texteStats(s) });
    }
    if (texte === "social") {
      const blocs = blocsStats(s);
      const filtres = blocs.filter((b) => {
        const t = (b as { text?: { text?: string } }).text?.text ?? "";
        return t.includes("Réseaux") || t.includes("Communautés") || b.type === "context";
      });
      return NextResponse.json({ response_type: "ephemeral", blocks: filtres });
    }
    return NextResponse.json({ response_type: "ephemeral", blocks: blocsStats(s) });
  } catch (e) {
    return NextResponse.json({ response_type: "ephemeral", text: `Erreur : ${e instanceof Error ? e.message : String(e)}` });
  }
}
