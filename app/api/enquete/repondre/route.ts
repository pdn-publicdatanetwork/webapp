import { NextResponse } from "next/server";
import { z } from "zod";
import { PRIORITES } from "@/lib/enquete";
import { hashJeton } from "@/lib/mail";
import { authAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Enregistrement des réponses du questionnaire survey.dataparl.fr, par jeton.
// Une ligne déjà répondue n'est pas modifiée.
const Reponses = z.object({
  j: z.string().trim().min(20).max(200),
  note_experience: z.coerce.number().int().min(1).max(5),
  note_contenu: z.coerce.number().int().min(1).max(5),
  note_global: z.coerce.number().int().min(1).max(5),
  priorites: z.array(z.enum(PRIORITES)).max(PRIORITES.length).optional().default([]),
  commentaire: z.string().trim().max(2000).optional().default(""),
});

export async function POST(req: Request) {
  const p = Reponses.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "réponses invalides" }, { status: 400 });
  const db = authAdmin();
  const { data: ligne } = await db
    .from("survey_reponses")
    .select("id, repondu_le")
    .eq("jeton_hash", hashJeton(p.data.j))
    .limit(1);
  const r = ligne?.[0];
  if (!r) return NextResponse.json({ error: "invitation inconnue ou expirée" }, { status: 404 });
  if (r.repondu_le) return NextResponse.json({ error: "déjà répondu" }, { status: 409 });
  const { error } = await db.from("survey_reponses").update({
    note_experience: p.data.note_experience,
    note_contenu: p.data.note_contenu,
    note_global: p.data.note_global,
    priorites: p.data.priorites,
    commentaire: p.data.commentaire,
    repondu_le: new Date().toISOString(),
  }).eq("id", r.id);
  if (error) {
    console.error("survey update", error);
    return NextResponse.json({ error: "enregistrement impossible" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
