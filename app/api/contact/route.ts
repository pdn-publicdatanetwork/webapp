import { NextResponse } from "next/server";
import { z } from "zod";
import { clientFingerprint } from "@/lib/consent";
import { SUJETS } from "@/lib/contact";
import { CONTACT_INBOX } from "@/lib/env";
import { esc, expedier } from "@/lib/mail";
import { copieSlack, SLACK_CONTACT } from "@/lib/slack";
import { authAdmin } from "@/lib/supabaseAdmin";
import { normalizeEmail } from "@/lib/tokens";
import { accuserReception } from "@/lib/webmail";

const Corps = z.object({
  prenom: z.string().trim().min(1).max(80),
  nom: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254),
  sujet: z.enum(SUJETS.map((s) => s.v) as [string, ...string[]]),
  message: z.string().trim().min(5).max(5000),
  site: z.string().max(200).optional().nullable(),
});

export async function POST(req: Request) {
  const parsed = Corps.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Vérifie les champs : tous sont obligatoires, avec une adresse email valide." }, { status: 400 });
  const d = parsed.data;
  const ok = NextResponse.json({ message: "Merci, ton message est bien arrivé. On te répond par email." });
  if (d.site) return ok; // robot

  const db = authAdmin();
  const { ipHash } = await clientFingerprint();
  if (ipHash) {
    const depuis = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await db.from("contact_messages").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", depuis);
    if ((count ?? 0) >= 5) return NextResponse.json({ error: "Trop de messages envoyés. Réessaie dans une heure." }, { status: 429 });
  }

  const email = normalizeEmail(d.email);
  const { error } = await db.from("contact_messages").insert({
    prenom: d.prenom, nom: d.nom, email, sujet: d.sujet, message: d.message, ip_hash: ipHash,
  });
  if (error) return NextResponse.json({ error: "Envoi impossible, réessaie plus tard." }, { status: 500 });

  const libelle = SUJETS.find((s) => s.v === d.sujet)?.l ?? d.sujet;
  const objet = `[Contact · ${libelle}] ${d.prenom} ${d.nom}`;
  // Les demandes presse arrivent (et sont accusées) sur presse@dataparl.fr.
  const boite = d.sujet === "presse" ? "presse@dataparl.fr" : "hello@dataparl.fr";

  // 1. Le message arrive dans la webmail (Reçus) ; « Répondre » vise l'expéditeur.
  await db.from("emails").insert({
    direction: "in", communication_type: "contact", from_addr: `${d.prenom} ${d.nom} <${email}>`,
    to_addr: boite, reply_to: email, subject: objet, body_text: d.message,
    folder: "inbox", read: false, source: "site",
  });

  // 2. Accusé de réception à l'expéditeur.
  await accuserReception({ to: email, from: boite, objet: libelle, extrait: d.message, prenom: d.prenom, contact: true });

  // 3. Copie vers le canal Slack #contact (archive de l'équipe).
  await copieSlack(SLACK_CONTACT, {
    subject: objet, titre: libelle,
    corpsHtml: `<p><strong>${esc(d.prenom)} ${esc(d.nom)}</strong> &lt;${esc(email)}&gt;</p><p style="white-space:pre-wrap;line-height:1.6">${esc(d.message)}</p>`,
    text: `${libelle}\n${d.prenom} ${d.nom} <${email}>\n\n${d.message}`,
  });

  // 4. Copie facultative vers une boîte externe (variable CONTACT_INBOX).
  if (CONTACT_INBOX) {
    await expedier({
      to: [CONTACT_INBOX], replyTo: email, subject: objet, titre: libelle, type: "transactionnel",
      corpsHtml: `<p><strong>${esc(d.prenom)} ${esc(d.nom)}</strong> &lt;${esc(email)}&gt;</p><p style="white-space:pre-wrap;line-height:1.6">${esc(d.message)}</p>`,
      text: `${libelle}\n${d.prenom} ${d.nom} <${email}>\n\n${d.message}`,
      pied: "Message reçu via le formulaire de contact DataParl'. Réponds directement à cet email.",
    });
  }
  return ok;
}
