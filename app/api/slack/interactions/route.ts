import { NextResponse } from "next/server";
import { CODE, destinationValide, genererCode } from "@/lib/liens";
import { authAdmin } from "@/lib/supabaseAdmin";
import { canaux, creerPost, type ModePost } from "@/lib/buffer";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Soumission du formulaire /post (Interactivity Request URL de l'app
// Slack, configurée avec ?t=<MAINTENANCE_TOKEN>). Étapes : génère un code
// court par réseau choisi (<slug>-x, <slug>-bsky), insère les liens tracés
// (table liens, même système que /l/daily…), crée les posts Buffer (texte
// + lien court dédié → clics attribués par réseau dans liens_clics), puis
// répond la confirmation avec les liens courts.

function repondre(urlReponse: string, texte: string) {
  if (!urlReponse) return;
  fetch(urlReponse, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ response_type: "in_channel", text: texte }),
    cache: "no-store",
  }).catch(() => {});
}

function valeur(bloc: Record<string, unknown>, action: string): string {
  const e = (bloc as { [k: string]: { value?: string } | undefined })[action];
  return e?.value ?? "";
}

function valeursCochees(bloc: Record<string, unknown>, action: string): string[] {
  const e = (bloc as { [k: string]: { selected_options?: { value: string }[] } | undefined })[action];
  return (e?.selected_options ?? []).map((o) => o.value);
}

// Slug lisible depuis la destination (dernier segment du chemin).
function slugDe(destination: string): string {
  try {
    const chemin = new URL(destination).pathname.replace(/\/$/, "");
    const segments = chemin.split("/").filter(Boolean);
    let slug = (segments.at(-1) ?? "partage").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30);
    if (!slug) slug = "partage";
    return slug;
  } catch { return "partage"; }
}

export async function POST(req: Request) {
  const attendu = process.env.MAINTENANCE_TOKEN ?? "";
  const u = new URL(req.url);
  if (!attendu || u.searchParams.get("t") !== attendu) {
    return NextResponse.json({ text: "Non autorisé." }, { status: 401 });
  }
  const corps = new URLSearchParams(await req.text());
  const charge = JSON.parse(corps.get("payload") ?? "{}") as {
    type?: string; view?: { callback_id?: string; state?: { values?: Record<string, Record<string, unknown>> } }; response_url?: string; user?: { name?: string };
  };
  if (charge.type !== "view_submission" || charge.view?.callback_id !== "post_publication") {
    return NextResponse.json({});
  }
  const v = charge.view.state?.values ?? {};
  const destination = destinationValide(String((v.destination?.v as { value?: string })?.value ?? ""));
  const texte = String((v.texte?.v as { value?: string })?.value ?? "").trim();
  const reseaux = valeursCochees(v.reseaux?.v ?? {}, "v");
  const mode = (valeur(v.mode?.v ?? {}, "v") || "file") as ModePost;
  const urlReponse = charge.response_url ?? "";
  const qui = charge.user?.name ?? "slack";

  if (!destination) {
    return NextResponse.json({ response_action: "errors", errors: { destination: "Adresse https invalide." } });
  }
  if (!texte) {
    return NextResponse.json({ response_action: "errors", errors: { texte: "Le texte du post est vide." } });
  }
  if (!reseaux.length) {
    return NextResponse.json({ response_action: "errors", errors: { reseaux: "Choisis au moins un réseau." } });
  }

  // Code court par réseau : <slug>-x, <slug>-bsky (déjà suivi si collision).
  const db = authAdmin();
  const base = slugDe(destination);
  const codeDe = async (suffixe: string) => {
    for (let i = 0; i < 5; i++) {
      const code = (base + "-" + suffixe + (i ? "-" + genererCode(3) : "")).slice(0, 40);
      if (!CODE.test(code)) continue;
      const { data: existe } = await db.from("liens").select("code").eq("code", code).maybeSingle();
      if (!existe) return code;
    }
    return base + "-" + suffixe + "-" + genererCode(6);
  };

  try {
    const lignes: { code: string; suffixe: string }[] = [];
    for (const r of reseaux) {
      const code = await codeDe(r);
      const { error } = await db.from("liens").insert({ code, destination, titre: texte.slice(0, 200), actif: true });
      if (error) throw new Error("Table liens : " + error.message);
      lignes.push({ code, suffixe: r });
    }

    // Buffer : un post par réseau, avec SON lien court (tracking dédié).
    const resultats: string[] = [];
    const canauxDispo = await canaux();
    for (const { code, suffixe } of lignes) {
      const service = suffixe === "x" ? "twitter" : "bluesky";
      const canal = canauxDispo.find((c) => c.service === service);
      if (!canal) {
        resultats.push("⚠️ " + (suffixe === "x" ? "X" : "Bluesky") + " : aucun canal connecté dans Buffer (publish.buffer.com → Connect Channel) — lien créé : https://link.dataparl.fr/" + code);
        continue;
      }
      const lienCourt = "https://link.dataparl.fr/" + code;
      const p = await creerPost(canal.id, texte + "\n" + lienCourt, mode);
      resultats.push(("id" in p ? "✅" : "⚠️") + " " + (suffixe === "x" ? "X" : "Bluesky") + " : " + ("id" in p ? (mode === "maintenant" ? "publié" : mode === "brouillon" ? "brouillon créé dans Buffer" : "ajouté à la file Buffer") : "erreur : " + p.erreur) + " — " + lienCourt);
    }

    repondre(urlReponse, "📣 Post envoyé par " + qui + " :\n" + resultats.join("\n") + "\nDestination : " + destination);
    return NextResponse.json({ response_action: "clear" });
  } catch (e) {
    repondre(urlReponse, "Erreur /post : " + (e instanceof Error ? e.message : String(e)));
    return NextResponse.json({ response_action: "errors", errors: { destination: "Erreur : " + (e instanceof Error ? e.message : String(e)) } });
  }
}
