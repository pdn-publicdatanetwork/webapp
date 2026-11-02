import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { controleEmail } from "@/lib/antiAbus";
import { expedier, esc, type Message } from "@/lib/mail";
import { authAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Anti-abus (cron quotidien, 08 h 15 UTC) : détecte les comptes dont l'adresse
// ne passe pas le contrôle automatique (lib/antiAbus.ts, appliqué aussi à
// l'inscription côté client), envoie le mail « Action requise » puis suspend
// le compte après 7 jours sans régularisation (changement d'adresse).
// Suspension = bannissement GoTrue réversible côté admin. Table de suivi :
// public.comptes_suspects (service_role uniquement, migration comptes_suspects).

const OBJET = "[DataParl] Action requise — vérification de votre adresse email";

function autorise(req: Request): boolean {
  const s = process.env.CRON_SECRET ?? "";
  const recu = req.headers.get("authorization") ?? "";
  const attendu = `Bearer ${s}`;
  return !!s && recu.length === attendu.length && timingSafeEqual(Buffer.from(recu), Buffer.from(attendu));
}

const dateFr = (d: string) =>
  new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })
    .format(new Date(d))
    .replace(",", " à");

async function envoyerAvertissement(email: string, motif: string, creeLe: string): Promise<boolean> {
  const m: Message = {
    from: "bienvenue@dataparl.fr",
    nomExpediteur: "Système anti-abus DataParl'",
    to: [email],
    subject: OBJET,
    titre: "Action requise : vérification de votre adresse email",
    corpsHtml: `<p style="margin:0 0 16px">Bonjour,</p>
<p style="margin:0 0 16px">Notre système anti-abus a détecté que le compte créé le ${esc(dateFr(creeLe))} est associé à une adresse email dont le format est classé comme non valide par nos contrôles automatiques.</p>
<p style="margin:0 0 8px"><strong>Résultat du contrôle :</strong></p>
<ul style="margin:0 0 16px;padding-left:22px">
<li style="margin-bottom:6px">Compte : <strong>${esc(email)}</strong></li>
<li style="margin-bottom:6px">Date de création : ${esc(dateFr(creeLe))}</li>
<li style="margin-bottom:6px">Contrôle : <strong>Non conforme aux critères de validation automatique</strong> (${esc(motif)})</li>
</ul>
<p style="margin:0 0 16px">Pour garantir la sécurité de la plateforme et la délivrabilité de nos alertes, les comptes dont l'adresse ne passe pas le contrôle automatique sont suspendus après 7 jours sans régularisation.</p>
<p style="margin:0 0 8px"><strong>Pour régulariser votre compte :</strong></p>
<p style="margin:0 0 16px">Recréez votre compte avec une adresse email valide. Le contrôle est entièrement automatique à l'inscription : aucune intervention humaine n'est nécessaire.</p>
<p style="margin:0 0 16px">Ce message a été généré automatiquement par notre système anti-abus. Inutile d'y répondre.</p>
<p style="margin:0;color:#475569">— Système anti-abus DataParl'</p>`,
    text: `Bonjour,

Notre système anti-abus a détecté que le compte créé le ${dateFr(creeLe)} est associé à une adresse email dont le format est classé comme non valide par nos contrôles automatiques.

Résultat du contrôle :
- Compte : ${email}
- Date de création : ${dateFr(creeLe)}
- Contrôle : Non conforme aux critères de validation automatique (${motif})

Pour garantir la sécurité de la plateforme et la délivrabilité de nos alertes, les comptes dont l'adresse ne passe pas le contrôle automatique sont suspendus après 7 jours sans régularisation.

Pour régulariser votre compte : recréez votre compte avec une adresse email valide. Le contrôle est entièrement automatique à l'inscription : aucune intervention humaine n'est nécessaire.

Ce message a été généré automatiquement par notre système anti-abus. Inutile d'y répondre.

— Système anti-abus DataParl'`,
    type: "auto",
  };
  const r = await expedier(m);
  return r.ok;
}

export async function GET(req: Request) {
  if (!autorise(req)) return NextResponse.json({ error: "non autorisé" }, { status: 401 });
  const admin = authAdmin();
  const bilan = { marques: 0, avertis: 0, suspendus: 0, regularises: 0, erreurs: [] as string[] };

  const { data: suspects, error: errLecture } = await admin.from("comptes_suspects").select("user_id,email,marque_le,suspendu_le,regularise_le");
  if (errLecture) return NextResponse.json({ ok: false, error: errLecture.message }, { status: 500 });
  const parId = new Map((suspects ?? []).map((l: any) => [l.user_id, l]));

  const users: Array<{ id: string; email: string; created_at: string; banned_until: string | null }> = [];
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    users.push(...((data?.users ?? []) as any[]));
    if (!data?.users || data.users.length < 200) break;
  }

  const septJoursEcoules = (d: string) => Date.now() - new Date(d).getTime() >= 7 * 24 * 3600 * 1000;

  for (const u of users) {
    if (!u.email || u.banned_until) continue;
    const ligne = parId.get(u.id) as any;
    const ctrl = controleEmail(u.email);

    if (!ctrl.suspect) {
      // Régularisation : l'adresse a changé depuis le marquage.
      if (ligne && !ligne.regularise_le && u.email !== ligne.email) {
        await admin.from("comptes_suspects").update({ regularise_le: new Date().toISOString(), email: u.email }).eq("user_id", u.id);
        bilan.regularises++;
      }
      continue;
    }

    if (!ligne) {
      const { error: errInsert } = await admin.from("comptes_suspects").insert({ user_id: u.id, email: u.email, motif: ctrl.motif });
      if (errInsert) {
        bilan.erreurs.push(`marquage ${u.email} : ${errInsert.message}`);
        continue;
      }
      bilan.marques++;
      if (await envoyerAvertissement(u.email, ctrl.motif!, u.created_at)) {
        await admin.from("comptes_suspects").update({ notifie_le: new Date().toISOString() }).eq("user_id", u.id);
        bilan.avertis++;
      }
    } else if (!ligne.suspendu_le && !ligne.regularise_le && u.email === ligne.email && septJoursEcoules(ligne.marque_le)) {
      const { error } = await admin.auth.admin.updateUserById(u.id, { ban_duration: "876000h" });
      if (error) {
        bilan.erreurs.push(`suspension ${u.email} : ${error.message}`);
        continue;
      }
      await admin.from("comptes_suspects").update({ suspendu_le: new Date().toISOString(), email: u.email }).eq("user_id", u.id);
      bilan.suspendus++;
    }
  }
  return NextResponse.json({ ok: true, ...bilan });
}
