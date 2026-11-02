import { NextResponse } from "next/server";
import { z } from "zod";
import { authAdmin } from "@/lib/supabaseAdmin";
import { normalizeEmail, sha256 } from "@/lib/tokens";
import { utilisateur } from "@/lib/userAuth";
import { mailCodeEmailSecondaire, mailEmailSecondaireModifie } from "@/lib/securiteMail";

export const dynamic = "force-dynamic";

const MAX_ADRESSES = 5;
const VALIDITE_CODE_MS = 15 * 60 * 1000;
const ANTI_RENVOI_MS = 60 * 1000;

function code6(): string {
  const buf = new Uint8Array(4);
  crypto.getRandomValues(buf);
  const n = ((buf[0] << 24) >>> 0) + (buf[1] << 16) + (buf[2] << 8) + buf[3];
  return String(n % 1000000).padStart(6, "0");
}

// GET : adresses secondaires du compte (confirmées et en attente).
export async function GET(req: Request) {
  const user = await utilisateur(req);
  if (!user) return NextResponse.json({ error: "non connecté" }, { status: 401 });
  const { data } = await authAdmin().from("emails_secondaires")
    .select("id, email, confirme_le, dernier_envoi_le")
    .eq("user_id", user.id).order("cree_le");
  return NextResponse.json({ adresses: (data ?? []).map((r) => ({ id: r.id, email: r.email, confirme_le: r.confirme_le, envoi_le: r.dernier_envoi_le })) });
}

// POST : ajoute une adresse secondaire et lui envoie un code de confirmation.
export async function POST(req: Request) {
  const user = await utilisateur(req);
  if (!user) return NextResponse.json({ error: "non connecté" }, { status: 401 });
  const parsed = z.object({ email: z.string().email().max(320) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "adresse invalide" }, { status: 400 });
  const email = normalizeEmail(parsed.data.email);
  const db = authAdmin();
  if (email === normalizeEmail(user.email!)) return NextResponse.json({ error: "c'est déjà l'adresse principale de ton compte" }, { status: 400 });
  const { data: existante } = await db.from("emails_secondaires").select("id, confirme_le, dernier_envoi_le")
    .eq("user_id", user.id).eq("email", email).maybeSingle();
  const { count } = await db.from("emails_secondaires").select("id", { count: "exact", head: true }).eq("user_id", user.id);
  if (!existante && (count ?? 0) >= MAX_ADRESSES)
    return NextResponse.json({ error: "maximum " + MAX_ADRESSES + " adresses secondaires par compte" }, { status: 400 });
  if (existante?.confirme_le) return NextResponse.json({ error: "cette adresse est déjà ajoutée à ton compte" }, { status: 400 });
  if (existante?.dernier_envoi_le && Date.now() - new Date(existante.dernier_envoi_le).getTime() < ANTI_RENVOI_MS)
    return NextResponse.json({ error: "un code vient d'être envoyé, attends un instant" }, { status: 429 });
  const code = code6();
  const codeHash = await sha256(code);
  const maintenant = new Date().toISOString();
  const { error: errUpsert } = await db.from("emails_secondaires").upsert(
    { user_id: user.id, email, code_hash: codeHash, dernier_envoi_le: maintenant, confirme_le: null },
    { onConflict: "user_id,email" },
  );
  if (errUpsert) return NextResponse.json({ error: "ajout impossible, réessaie" }, { status: 500 });
  const prenom = (((user.user_metadata ?? {}) as { prenom?: string }).prenom ?? "").trim();
  try {
    await mailCodeEmailSecondaire(email, prenom, code);
  } catch (e) {
    if (!existante) await db.from("emails_secondaires").delete().eq("user_id", user.id).eq("email", email).eq("confirme_le", null);
    console.error("envoi code email secondaire", String(e).slice(0, 200));
    return NextResponse.json({ error: "l'e-mail n'a pas pu être envoyé, réessaie plus tard" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, enAttente: true });
}

// PUT : confirme une adresse secondaire avec le code à 6 chiffres reçu.
export async function PUT(req: Request) {
  const user = await utilisateur(req);
  if (!user) return NextResponse.json({ error: "non connecté" }, { status: 401 });
  const parsed = z.object({ id: z.string().uuid(), code: z.string().regex(/^[0-9]{6}$/) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "requête invalide" }, { status: 400 });
  const db = authAdmin();
  const { data: ligne } = await db.from("emails_secondaires").select("id, email, code_hash, dernier_envoi_le, confirme_le")
    .eq("id", parsed.data.id).eq("user_id", user.id).maybeSingle();
  if (!ligne) return NextResponse.json({ error: "adresse introuvable" }, { status: 404 });
  if (ligne.confirme_le) return NextResponse.json({ error: "cette adresse est déjà confirmée" }, { status: 400 });
  if (!ligne.code_hash || !ligne.dernier_envoi_le || Date.now() - new Date(ligne.dernier_envoi_le).getTime() > VALIDITE_CODE_MS)
    return NextResponse.json({ error: "code expiré, renvoie un code" }, { status: 400 });
  if ((await sha256(parsed.data.code)) !== ligne.code_hash)
    return NextResponse.json({ error: "code incorrect" }, { status: 400 });
  const { error: errMaj } = await db.from("emails_secondaires")
    .update({ confirme_le: new Date().toISOString(), code_hash: null }).eq("id", ligne.id).eq("user_id", user.id);
  if (errMaj) return NextResponse.json({ error: "confirmation impossible, réessaie" }, { status: 500 });
  await mailEmailSecondaireModifie(user.id, ligne.email, true).catch(() => {});
  return NextResponse.json({ ok: true });
}

// DELETE : retire une adresse secondaire (confirmée ou en attente).
export async function DELETE(req: Request) {
  const user = await utilisateur(req);
  if (!user) return NextResponse.json({ error: "non connecté" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "requête invalide" }, { status: 400 });
  const db = authAdmin();
  const { data: ligne } = await db.from("emails_secondaires").select("email, confirme_le")
    .eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!ligne) return NextResponse.json({ error: "adresse introuvable" }, { status: 404 });
  const { error: errSup } = await db.from("emails_secondaires").delete().eq("id", id).eq("user_id", user.id);
  if (errSup) return NextResponse.json({ error: "suppression impossible, réessaie" }, { status: 500 });
  if (ligne.confirme_le) await mailEmailSecondaireModifie(user.id, ligne.email, false).catch(() => {});
  return NextResponse.json({ ok: true });
}
