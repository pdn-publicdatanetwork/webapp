import { NextResponse } from "next/server";
import { utilisateur } from "@/lib/userAuth";
import { statutDemande } from "@/lib/association";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Import de CV pour Ma fiche : reçoit le PDF (base64) du compte associé à
// une fiche vérifiée, le transmet au moteur d'extraction de dpchat
// (chat.dataparl.fr/api/extraire-cv) avec le secret partagé
// CLE_EXTRACTION_CV, et renvoie les propositions à l'utilisateur.
// Le CV n'est jamais stocké ni journalisé : la réponse seule est affichée,
// et rien n'est publié sans validation explicite dans la page Ma fiche.

const DPCHAT_URL = (process.env.DPCHAT_URL ?? "https://chat.dataparl.fr").replace(//$/, "");
const TAILLE_MAX = 8 * 1024 * 1024; // base64 d'un PDF d'environ 5 Mo

export async function POST(req: Request) {
  const u = await utilisateur(req);
  if (!u) return NextResponse.json({ error: "connexion requise" }, { status: 401 });
  const a = await statutDemande(u.id);
  if (a?.statut !== "verifie") {
    return NextResponse.json({ error: "fiche non associée" }, { status: 403 });
  }
  const cle = process.env.CLE_EXTRACTION_CV ?? "";
  if (!cle) return NextResponse.json({ error: "import non configuré" }, { status: 503 });

  const { pdf } = await req.json().catch(() => ({}));
  if (typeof pdf !== "string" || pdf.length < 100 || pdf.length > TAILLE_MAX) {
    return NextResponse.json({ error: "pdf invalide ou trop volumineux (5 Mo max)" }, { status: 400 });
  }

  try {
    const res = await fetch(`${DPCHAT_URL}/api/extraire-cv`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-cle-cv": cle },
      body: JSON.stringify({ pdf }),
      signal: AbortSignal.timeout(55000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("extraire-cv", res.status, data.error);
      return NextResponse.json({ error: data.error ?? "extraction échouée" }, { status: 502 });
    }
    return NextResponse.json({ propositions: data.propositions ?? null });
  } catch (e) {
    console.error("extraire-cv: échec réseau ou timeout", e);
    return NextResponse.json({ error: "extraction échouée" }, { status: 502 });
  }
}
