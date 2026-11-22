import { NextResponse } from "next/server";
import { utilisateur } from "@/lib/userAuth";
import { statutDemande } from "@/lib/association";
import { dataAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Photo de profil de la fiche : upload par la personne associée à la fiche
// vérifiée, stockage dans le bucket photos-profils (data). L'URL publique
// est servie par media.dataparl.fr/cldb/<collab_id>.<ext> (règle proxy,
// route app/media/cldb) ; colonne photo_url de collaborateurs.
// Limites : 2 Mo, JPEG/PNG/WebP, vérification de la signature du fichier
// (l'extension seule ne prouve rien) et contrôle vision : l'image doit
// représenter une personne (anti-troll ; indisponibilité du service ne
// bloque pas l'upload, l'incident est journalisé). DELETE retire la photo
// (fiche publique et Ma fiche) sans délai.

const TAILLE_MAX = 2 * 1024 * 1024;
const BUCKET = "photos-profils";
const MEDIA_BASE = (process.env.NEXT_PUBLIC_MEDIA_BASE ?? "https://media.dataparl.fr").replace(/\/$/, "");
const MISTRAL_CHAT = "https://api.mistral.ai/v1/chat/completions";
const MODEL_VISION = process.env.MISTRAL_MODEL_VISION ?? "pixtral-12b-2409";


function extensionValide(f: File): "jpg" | "png" | "webp" | null {
  const t = f.type;
  if (t === "image/jpeg") return "jpg";
  if (t === "image/png") return "png";
  if (t === "image/webp") return "webp";
  return null;
}

// Signature du contenu (les en-têtes et l'extension sont forgeables) :
// JPEG FFD8FF, PNG 89504E47, WEBP RIFF....WEBP.
function signatureValide(b: Uint8Array): boolean {
  if (b.length < 12) return false;
  const jpg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  const png = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
  const riff = b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46
    && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50;
  return jpg || png || riff;
}

export async function POST(req: Request) {
  const u = await utilisateur(req);
  if (!u) return NextResponse.json({ error: "connexion requise" }, { status: 401 });
  const a = await statutDemande(u.id);
  if (a?.statut !== "verifie" || !a.collab_id) {
    return NextResponse.json({ error: "fiche non associée" }, { status: 403 });
  }
  const form = await req.formData().catch(() => null);
  const fichier = form?.get("photo");
  if (!(fichier instanceof File)) {
    return NextResponse.json({ error: "fichier manquant" }, { status: 400 });
  }
  if (fichier.size > TAILLE_MAX) {
    return NextResponse.json({ error: "photo trop lourde (2 Mo max)" }, { status: 400 });
  }
  const ext = extensionValide(fichier);
  if (!ext) return NextResponse.json({ error: "format non accepté (JPEG, PNG ou WebP)" }, { status: 400 });

  const octets = new Uint8Array(await fichier.arrayBuffer());
  if (!signatureValide(octets)) {
    return NextResponse.json({ error: "fichier image invalide" }, { status: 400 });
  }

  // Anti-troll : le modèle vision de Mistral vérifie que l'image représente
  // une personne (ni logo, ni meme, ni photo d'objet). Contrôle porté depuis
  // dpchat (résilié avec Vercel) directement dans ce worker ; l'image n'est
  // ni stockée ni journalisée. En cas d'indisponibilité de l'API, l'upload
  // passe (jamais de blocage sur une panne tierce) et l'incident est
  // journalisé.
  const apiKeyVision = process.env.MISTRAL_API_KEY;
  if (apiKeyVision) {
    try {
      const v = await fetch(MISTRAL_CHAT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKeyVision}` },
        body: JSON.stringify({
          model: MODEL_VISION,
          temperature: 0,
          max_tokens: 4,
          messages: [{
            role: "user",
            content: [
              {
                type: "text",
                text: "Cette image est-elle une photographie representant une ou plusieurs personnes (visage humain reel) ? Reponds uniquement OUI ou NON.",
              },
              { type: "image_url", image_url: `data:image/jpeg;base64,${Buffer.from(octets).toString("base64")}` },
            ],
          }],
        }),
        signal: AbortSignal.timeout(25000),
      });
      if (v.ok) {
        const d = await v.json().catch(() => ({}));
        const reponse = String(d.choices?.[0]?.message?.content ?? "").toUpperCase();
        if (!reponse.includes("OUI")) {
          return NextResponse.json({ error: "La photo doit représenter une personne : choisissez un portrait net de vous." }, { status: 422 });
        }
      } else {
        console.error("verifier-photo indisponible", v.status);
      }
    } catch (e) {
      console.error("verifier-photo: échec", e);
    }
  }

  const db = dataAdmin();
  const chemin = `${a.collab_id}.${ext}`;
  const up = await db.storage.from(BUCKET).upload(chemin, octets, {
    contentType: fichier.type, upsert: true, cacheControl: "3600",
  });
  if (up.error) return NextResponse.json({ error: "enregistrement impossible" }, { status: 500 });

  // URL publique sur media.dataparl.fr ; le cache-buster force le
  // rafraîchissement (la fiche publique se revalidate toutes les heures).
  const photo = `${MEDIA_BASE}/cldb/${chemin}?v=${Date.now()}`;
  await db.from("collaborateurs").update({ photo_url: photo }).eq("collab_id", a.collab_id);
  return NextResponse.json({ ok: true, photo_url: photo });
}

export async function DELETE(req: Request) {
  const u = await utilisateur(req);
  if (!u) return NextResponse.json({ error: "connexion requise" }, { status: 401 });
  const a = await statutDemande(u.id);
  if (a?.statut !== "verifie" || !a.collab_id) {
    return NextResponse.json({ error: "fiche non associée" }, { status: 403 });
  }
  const db = dataAdmin();
  const { data: fichiers } = await db.storage.from(BUCKET).list("", { search: a.collab_id });
  const chemins = (fichiers ?? []).map((f) => f.name).filter((n) => n.startsWith(a.collab_id + "."));
  if (chemins.length) await db.storage.from(BUCKET).remove(chemins);
  await db.from("collaborateurs").update({ photo_url: null }).eq("collab_id", a.collab_id);
  return NextResponse.json({ ok: true });
}
