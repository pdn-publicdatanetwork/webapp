import { NextResponse } from "next/server";
import { demandeDe, enregistrerDeblocage, journaliserRappel, pubActive } from "@/lib/deblocage";
import { APPLIXIR_API_KEY, secret } from "@/lib/env";
import { jetonValide, lireRappel, rappelValide } from "@/lib/pub";
import { copieSlack, SLACK_CONTACT } from "@/lib/slack";

export const dynamic = "force-dynamic";

// Rappel serveur d'AppLixir, émis quand une vidéo récompensée a été vue
// jusqu'au bout. Accepté en GET (paramètres d'URL) ou en POST (formulaire ou
// JSON). Seul ce rappel signé avec le secret partagé débloque une fiche.
async function traiter(params: Record<string, string>) {
  if (!pubActive()) return new NextResponse("désactivé", { status: 404 });
  const r = lireRappel(params);
  if (!rappelValide(r, APPLIXIR_API_KEY, secret("APPLIXIR_SECRET"))) {
    // Noms des paramètres reçus (jamais leurs valeurs) pour diagnostiquer un format inattendu.
    await journaliserRappel(false, `signature [${Object.keys(params).sort().join(",")}]`.slice(0, 300), r.userId, r.tid);
    return new NextResponse("signature invalide", { status: 400 });
  }
  const u = jetonValide(r.userId) ? await demandeDe(r.userId) : null;
  if (!u) {
    await journaliserRappel(false, "utilisateur", r.userId, r.tid);
    return new NextResponse("utilisateur invalide", { status: 400 });
  }
  // Sans identifiant de transaction, le jeton (usage unique) en tient lieu.
  const etat = await enregistrerDeblocage(u.userId, u.cible, r.tid || `jeton:${r.userId}`);
  await journaliserRappel(true, etat, r.userId, r.tid);
  // Copie Slack (canal contact) : une fiche vient d'être débloquée par pub.
  await copieSlack(SLACK_CONTACT, {
    subject: "Fiche débloquée (vidéo récompensée)",
    corpsHtml: `<p>Une fiche vient d'être débloquée via une publicité regardée en entier.</p><p>Cible : <code>${u.cible}</code></p>`,
    text: `Fiche débloquée (vidéo récompensée) — cible ${u.cible}`,
  });
  return new NextResponse("ok", { status: 200 });
}

export async function GET(req: Request) {
  return traiter(Object.fromEntries(new URL(req.url).searchParams));
}

export async function POST(req: Request) {
  const q = Object.fromEntries(new URL(req.url).searchParams);
  const brut = await req.text();
  let corps: Record<string, string> = {};
  try {
    const j = JSON.parse(brut);
    if (j && typeof j === "object") corps = Object.fromEntries(Object.entries(j).map(([k, v]) => [k, String(v ?? "")]));
  } catch {
    corps = Object.fromEntries(new URLSearchParams(brut));
  }
  return traiter({ ...q, ...corps });
}
