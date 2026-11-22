import { NextResponse } from "next/server";
import { utilisateur } from "@/lib/userAuth";
import { statutDemande } from "@/lib/association";
import { authAdmin, dataAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Import de CV pour Ma fiche : reçoit le PDF (base64) du compte associé à
// une fiche vérifiée, l'analyse sur place (OCR Mistral, puis extraction
// structurée des rubriques du profil CV DataParl') et renvoie les
// propositions à l'utilisateur. Ces fonctions étaient hébergées par dpchat
// (chat.dataparl.fr, disparu avec la résiliation Vercel du 22/11/2026) :
// elles vivent désormais directement dans ce worker, sans secret partagé.
// Le PDF n'est jamais stocké ; le texte OCR et les propositions brutes
// sont conservés (table cv_imports) pour édition par l'admin DataParl',
// mentionnée dans la case d'acceptation des CGU. L'acceptation de la case
// CGU du Chat est enregistrée à chaque import (cgu_acceptees, preuve RGPD).

const MISTRAL_OCR = "https://api.mistral.ai/v1/ocr";
const MISTRAL_CHAT = "https://api.mistral.ai/v1/chat/completions";
const MODEL = process.env.MISTRAL_MODEL ?? "mistral-medium-latest";
const TAILLE_MAX = 8 * 1024 * 1024; // base64 d'un PDF d'environ 5 Mo

const SYSTEM = [
  "Tu extrais d'un CV des propositions pour le profil public d'un collaborateur parlementaire sur DataParl'.",
  "Règles strictes :",
  "- Aucune adresse e-mail, aucun lien URL, aucun numéro de téléphone dans les valeurs (omets-les).",
  "- Aucune donnée sensible (santé, religion, opinions politiques privées), aucune mention de tiers privés.",
  "- Ne devine rien qui n'est pas écrit dans le CV. Champ absent : null.",
  "Rubriques et formats :",
  "- formation : diplômes, écoles, universités. libelle = diplôme ou formation ; precision_text = mention ou spécialité ; periode = années (ex. 2018 - 2023).",
  "- carriere : postes, y compris à venir. libelle = poste ; precision_text = missions ou employeur ; periode = période (ex. Depuis 2024) ; visible_a_partir_de = date YYYY-MM-DD uniquement si le poste commence dans le futur, sinon null.",
  "- autre_activite : associations, enseignement, publications. libelle = activité ; precision_text = précision ; periode = période.",
  "- langues : une entrée par langue. libelle = langue ; precision_text = niveau (ex. Courant (C1)).",
  "Limites : libelle 120 caractères max, precision_text 240 max, periode 60 max.",
  "Réponds uniquement en JSON conforme au schéma.",
].join("\n");

// Schéma strict : les propositions arrivent prêtes à être proposées telles
// quelles, avec les mêmes garde-fous que la saisie manuelle du site.
const item = (avecFutur: boolean) => ({
  type: "object", additionalProperties: false,
  required: ["libelle", "precision_text", "periode", ...(avecFutur ? ["visible_a_partir_de"] : [])],
  properties: {
    libelle: { type: "string" },
    precision_text: { type: ["string", "null"] },
    periode: { type: ["string", "null"] },
    ...(avecFutur ? { visible_a_partir_de: { type: ["string", "null"] } } : {}),
  },
});
const SCHEMA = {
  type: "object", additionalProperties: false,
  required: ["formation", "carriere", "autre_activite", "langues"],
  properties: {
    formation: { type: "array", maxItems: 10, items: item(false) },
    carriere: { type: "array", maxItems: 15, items: item(true) },
    autre_activite: { type: "array", maxItems: 10, items: item(false) },
    langues: { type: "array", maxItems: 8, items: item(false) },
  },
};

// Filtre en dur, seconde barrière après le prompt : aucune coordonnée
// (e-mail, téléphone, URL) ne survit dans une proposition, ni celle de
// l'intéressé ni celle d'un tiers cité dans le CV.
const MOTIFS: RegExp[] = [
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  /(?:\+33|0)\s?[1-9](?:[\s.-]?\d{2}){4}/g,
  /https?:\/\/\S+|www\.\S+/g,
];

function epurer(s: string | null | undefined): string | null {
  if (!s) return null;
  let out = s;
  for (const m of MOTIFS) out = out.replace(m, "");
  out = out.replace(/\s{2,}/g, " ").replace(/[\s,;·-]+$/g, "").replace(/^[\s,;·-]+/g, "").trim();
  return out.length ? out : null;
}

function epurerListe(liste: unknown): unknown[] {
  if (!Array.isArray(liste)) return [];
  return liste
    .map((p: Record<string, unknown>) => ({
      ...p,
      libelle: epurer(p.libelle as string),
      precision_text: epurer(p.precision_text as string | null),
      periode: epurer(p.periode as string | null),
    }))
    .filter((p: Record<string, unknown>) => p.libelle);
}

export async function POST(req: Request) {
  const u = await utilisateur(req);
  if (!u) return NextResponse.json({ error: "connexion requise" }, { status: 401 });
  const a = await statutDemande(u.id);
  if (a?.statut !== "verifie") {
    return NextResponse.json({ error: "fiche non associée" }, { status: 403 });
  }
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "import non configuré" }, { status: 503 });

  const corps = await req.json().catch(() => ({}));
  const pdf = corps?.pdf;
  if (typeof pdf !== "string" || pdf.length < 100 || pdf.length > TAILLE_MAX) {
    return NextResponse.json({ error: "pdf invalide ou trop volumineux (5 Mo max)" }, { status: 400 });
  }

  // Trace de consentement : la case « j'accepte les CGU » est cochée
  // côté client avant chaque import ; on l'horodate ici (preuve RGPD).
  if (corps?.accepte_cgu === true) {
    await authAdmin().from("cgu_acceptees")
      .upsert({ user_id: u.id, cgu: "chat" }, { onConflict: "user_id,cgu" });
  }

  // 1. OCR du PDF (les pages reviennent en markdown). Le CV ne transite
  // pas en base et n'est pas journalisé.
  let texte = "";
  try {
    const ocr = await fetch(MISTRAL_OCR, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "mistral-ocr-latest",
        document: { type: "document_url", document_url: `data:application/pdf;base64,${pdf}` },
      }),
      signal: AbortSignal.timeout(50000),
    });
    if (!ocr.ok) {
      console.error("OCR", ocr.status, (await ocr.text()).slice(0, 300));
      return NextResponse.json({ error: "ocr_indisponible" }, { status: 502 });
    }
    const data = await ocr.json();
    texte = (data.pages ?? []).map((p: { markdown?: string }) => p.markdown ?? "").join("\n\n").slice(0, 60000);
  } catch {
    console.error("OCR: échec réseau ou timeout");
    return NextResponse.json({ error: "ocr_indisponible" }, { status: 502 });
  }
  if (!texte.trim()) {
    return NextResponse.json({ error: "cv_illisible" }, { status: 422 });
  }

  // 2. Extraction structurée (JSON strict, température 0).
  try {
    const chat = await fetch(MISTRAL_CHAT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: texte },
        ],
        response_format: { type: "json_schema", json_schema: { name: "profil_cv", schema: SCHEMA, strict: true } },
      }),
      signal: AbortSignal.timeout(50000),
    });
    if (!chat.ok) {
      console.error("Extraction", chat.status, (await chat.text()).slice(0, 300));
      return NextResponse.json({ error: "extraction_indisponible" }, { status: 502 });
    }
    const r = await chat.json();
    const brut = JSON.parse(r.choices[0].message.content);
    const propositions = {
      formation: epurerListe(brut.formation),
      carriere: epurerListe(brut.carriere),
      autre_activite: epurerListe(brut.autre_activite),
      langues: epurerListe(brut.langues),
    };

    // Alimentation côté admin : texte OCR + propositions brutes conservés
    // (jamais le PDF). Best-effort : un souci côté base admin ne fait pas
    // échouer l'import de l'utilisateur.
    try {
      await dataAdmin().from("cv_imports").insert({
        user_id: u.id,
        collab_slug: a.collab_slug,
        texte: texte.slice(0, 60000),
        propositions,
      });
    } catch (e) {
      console.error("cv_imports: insertion impossible", e);
    }

    return NextResponse.json({ propositions });
  } catch {
    console.error("Extraction: échec réseau, timeout ou JSON invalide");
    return NextResponse.json({ error: "extraction_indisponible" }, { status: 502 });
  }
}
