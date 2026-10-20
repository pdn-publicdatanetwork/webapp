import { NextResponse } from "next/server";
import { basculeMaintenance, lireMaintenance } from "@/lib/maintenanceAdmin";
import { publierHome } from "@/lib/slackHome";

export const dynamic = "force-dynamic";

// Commande Slack de bascule de la maintenance. À configurer comme slash
// command /maintenance dans une app Slack, avec l'URL :
//   https://www.dataparl.fr/api/maintenance/slack?t=<MAINTENANCE_TOKEN>
// (même valeur que la variable Vercel MAINTENANCE_TOKEN). Le filtre de
// maintenance laisse ce chemin ouvert : on peut rouvrir le site depuis
// Slack même quand tout le reste est coupé.
// Commandes : « on » (couper), « off » (rouvrir), vide ou « bascule »
// (inverse l'état), « statut » (état seul, sans basculer).

const AIDE = "Commande /maintenance : « on » coupe le site, « off » le rouvre, « statut » affiche l'état, vide inverse l'état.";

export async function POST(req: Request) {
  const attendu = process.env.MAINTENANCE_TOKEN ?? "";
  const u = new URL(req.url);
  const params = new URLSearchParams(await req.text());
  const recu = u.searchParams.get("t") ?? params.get("token") ?? "";
  if (!attendu || recu !== attendu) {
    return NextResponse.json({ text: "Non autorisé." }, { status: 401 });
  }
  const texte = (params.get("text") ?? "").trim().toLowerCase();
  const utilisateur = params.get("user_name") ?? "slack";
  publierHome(params.get("user_id") ?? "").catch(() => {});

  try {
    const etat = await lireMaintenance();
    if (texte === "statut" || texte === "etat") {
      return repondre(etat.active
        ? `🔴 Maintenance ACTIVE depuis le ${new Date(etat.ouvert_le ?? "").toLocaleString("fr-FR")}${etat.motif ? ` — ${etat.motif}` : ""}`
        : "🟢 Site ouvert, aucune maintenance en cours.");
    }
    const cible = texte === "on" || texte === "1" || texte === "activer" || texte === "couper" ? true
      : texte === "off" || texte === "0" || texte === "desactiver" || texte === "rouvrir" || texte === "fin" ? false
      : texte === "" || texte === "bascule" || texte === "toggle" ? !etat.active
      : null;
    if (cible === null) return repondre(AIDE);
    if (cible === etat.active) {
      return repondre(cible ? "🔴 La maintenance est déjà active." : "🟢 Le site est déjà ouvert.");
    }
    const r = await basculeMaintenance(cible, `Slack (${utilisateur})`);
    return repondre(
      (cible ? "🔴 Maintenance activée" : "🟢 Site rouvert") +
        ` — status.dataparl.fr : ${r.betterstack.ok ? "synchronisé" : `NON synchronisé (${r.betterstack.message})`}`,
    );
  } catch (e) {
    return repondre(`Erreur : ${e instanceof Error ? e.message : String(e)}`);
  }
}

function repondre(texte: string) {
  return NextResponse.json({ response_type: "in_channel", text: texte });
}
