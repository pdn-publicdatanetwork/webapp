import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logConsent } from "@/lib/consent";
import { esc, expedier, hashJeton } from "@/lib/mail";
import { normalizeEmail } from "@/lib/tokens";
import { authAdmin } from "@/lib/supabaseAdmin";
import { copieSlack, SLACK_MAINTENANCE } from "@/lib/slack";

// « Prévenez-moi quand le site est de retour » sur la page de maintenance.
// Double opt-in : un email de confirmation part immédiatement ; l'adresse
// n'est enregistrée qu'au clic sur le lien qu'il contient.
// Table dédiée maintenance_prevenus (one-shot) : ces adresses reçoivent
// uniquement l'email « le site est de retour », pas les mailings newsletter.
// Visibles dans l'admin → Utilisateurs → « Prévenus maintenance ».

const Email = z.string().trim().email().max(254).transform(normalizeEmail);
const SITE = "https://www.dataparl.fr";
const EXPIRATION = 48 * 3600_000;

function page(titre: string, texte: string, ok: boolean) {
  return new NextResponse(
    `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${titre} — DataParl'</title>` +
      `<style>body{font-family:system-ui,sans-serif;background:#FFFDF5;color:#071A41;display:flex;min-height:100vh;align-items:center;justify-content:center}div{max-width:480px;padding:32px;text-align:center}h1{font-size:1.4rem}p{line-height:1.5;color:#4A5670}a{color:#164DFF}</style>` +
      `</head><body><div><h1>Data<span style="background:#FFD23F;padding:0 .12em">Parl&rsquo;</span></h1><h2>${titre}</h2><p>${texte}</p>` +
      `<p><a href="/contact">Formulaire de contact</a></p></div></body></html>`,
    { status: ok ? 200 : 400, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

export async function POST(req: NextRequest) {
  const parsed = z.object({ email: Email }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "adresse invalide" }, { status: 400 });
  const email = parsed.data.email;
  const db = authAdmin();
  const now = new Date();

  // Déjà confirmé : rien à refaire, on le dit sans révéler plus.
  const { data: deja } = await db.from("maintenance_prevenus").select("confirmed").eq("email", email).maybeSingle();
  if (deja?.confirmed) return NextResponse.json({ ok: true, deja: true });

  const jeton = randomBytes(24).toString("hex");
  const { error } = await db.from("maintenance_prevenus").upsert(
    {
      email,
      confirmed: false,
      confirm_token_hash: hashJeton(jeton),
      confirm_expires_at: new Date(now.getTime() + EXPIRATION).toISOString(),
    },
    { onConflict: "email" },
  );
  if (error) return NextResponse.json({ error: "inscription impossible, réessaie" }, { status: 500 });

  const lien = `${SITE}/api/maintenance/prevenir?t=${jeton}`;
  const r = await expedier({
    from: "hello@dataparl.fr", replyTo: "hello@dataparl.fr", to: [email],
    subject: "Confirme ton adresse pour être prévenu·e du retour de DataParl'",
    titre: "Un clic, et on te prévient",
    corpsHtml:
      "<p style=\"margin:0 0 12px\">Tu as demandé à être prévenu·e quand DataParl' sera de retour après la maintenance.</p>" +
      "<p style=\"margin:0 0 12px\">Confirme ton adresse en un clic — c'est ce qui prouve que l'adresse est bien la tienne :</p>" +
      `<p style="margin:24px 0"><a href="${lien}" style="display:inline-block;background:#F0444F;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:bold">Confirmer mon adresse</a></p>` +
      "<p style=\"margin:0;color:#4A5670;font-size:14px\">Ce lien expire dans 48 heures. Si tu n'es pas à l'origine de cette demande, ignore cet email : rien ne sera enregistré.</p>",
    text: `Tu as demandé à être prévenu·e quand DataParl' sera de retour. Confirme ton adresse : ${lien}\n\nCe lien expire dans 48 heures. Si tu n'es pas à l'origine de cette demande, ignore cet email.`,
    pied: "Message envoyé par DataParl' suite à une action faite avec ton adresse. Si ce n'est pas toi, ignore-le.",
    type: "transactionnel",
  });
  if (!r.ok) return NextResponse.json({ error: "envoi impossible, réessaie dans quelques minutes" }, { status: 502 });
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const t = req.nextUrl.searchParams.get("t") ?? "";
  if (!/^[0-9a-f]{48}$/.test(t)) return page("Lien invalide", "Ce lien de confirmation n'est pas valide.", false);
  const db = authAdmin();
  const { data: sub } = await db.from("maintenance_prevenus").select("id, email, confirmed, confirm_expires_at")
    .eq("confirm_token_hash", hashJeton(t)).maybeSingle();
  if (!sub) return page("Lien déjà utilisé", "Cette demande a déjà été confirmée, ou le lien a expiré. Tu peux en refaire une depuis la page de maintenance.", true);
  if (sub.confirmed) return page("C'est déjà fait", "Ton adresse est déjà confirmée : tu recevras un email dès le retour du site.", true);
  if (sub.confirm_expires_at && new Date(sub.confirm_expires_at).getTime() < Date.now()) {
    return page("Lien expiré", "Ce lien de confirmation a expiré (48 heures). Relance une inscription depuis la page de maintenance.", false);
  }
  const now = new Date().toISOString();
  await db.from("maintenance_prevenus").update({
    confirmed: true, confirmed_at: now, confirm_token_hash: null, confirm_expires_at: null,
  }).eq("id", sub.id);
  await logConsent(sub.email as string, "confirm", "newsletter");
  // Copie de traçabilité vers le canal Slack #inscription-maintenance.
  await copieSlack(SLACK_MAINTENANCE, {
    subject: `Inscription maintenance : ${sub.email}`,
    titre: "Prévenu·e du retour de la maintenance",
    corpsHtml: `<p>Nouvelle adresse confirmée pour être prévenu·e du retour du site : <strong>${esc(String(sub.email))}</strong></p>`,
    text: `Nouvelle adresse confirmée pour être prévenu·e du retour du site : ${sub.email}`,
  });
  return page("Adresse confirmée", "Tu recevras un email dès que DataParl' sera de retour. À très vite !", true);
}
