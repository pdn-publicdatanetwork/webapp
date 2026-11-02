import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { controleEmail } from "@/lib/antiAbus";
import { expedier, esc, type Message } from "@/lib/mail";
import { authAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Anti-abus (cron horaire, à h15) : détecte les comptes dont l'adresse ne
// passe pas le contrôle automatique (lib/antiAbus.ts, appliqué aussi à
// l'inscription côté client), envoie le mail « Action requise », puis suspend
// le compte 48 h plus tard, à l'heure exacte annoncée, s'il n'a pas été
// régularisé. Régularisation = changement d'adresse OU ajout d'une méthode
// de connexion OAuth (Google, GitHub…) depuis /mon-compte/securite.
// Suspension = bannissement GoTrue réversible côté admin. Table de suivi :
// public.comptes_suspects (service_role uniquement, migration comptes_suspects).

const OBJET = "[DataParl] Action requise — vérification de votre adresse email";

// Formulations variées : la raison affichée change d'un mail à l'autre
// (choix stable par adresse, déterministe). Le motif technique précis reste
// consigné dans public.comptes_suspects.
const RAISONS = [
  "l'adresse est classée non valide par nos filtres automatiques",
  "le format de l'adresse est typique des adresses jetables",
  "l'adresse contient un motif repéré comme non conforme",
  "l'adresse a été détectée comme adresse de test ou jetable",
  "le contrôle automatique a rejeté le format de cette adresse",
];
const raisonPour = (email: string) => {
  let h = 0;
  for (const c of email) h = (h * 31 + c.charCodeAt(0)) % 100000;
  return RAISONS[h % RAISONS.length];
};

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

const heureSeule = (d: string) =>
  new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", hour12: false })
    .format(new Date(d))
    .replace(":", " h ");

// Prénom déclaré dans les métadonnées du compte (fourni par Google à
// l'inscription, ou saisi sur place) ; sans prénom, « Bonjour » seul.
const prenomDe = (u: any): string => {
  const m = u.user_metadata ?? {};
  if (typeof m.prenom === "string" && m.prenom.trim()) return m.prenom.trim();
  if (typeof m.name === "string" && m.name.trim()) return m.name.trim().split(/\s+/)[0];
  return "";
};

async function envoyerAvertissement(email: string, raison: string, prenom: string, creeLe: string, echeance: Date): Promise<boolean> {
  const salut = prenom ? `Bonjour ${esc(prenom)},` : "Bonjour,";
  const m: Message = {
    from: "abuse@dataparl.fr",
    nomExpediteur: "L'équipe DataParl'",
    to: [email],
    subject: OBJET,
    titre: "Action requise : vérification de votre adresse email",
    corpsHtml: `<p style="margin:0 0 16px">${salut}</p>
<p style="margin:0 0 16px">Notre système anti-abus a détecté que le compte créé le ${esc(dateFr(creeLe))} est associé à une adresse email dont le format est classé comme non valide par nos contrôles automatiques.</p>
<p style="margin:0 0 8px"><strong>Résultat du contrôle :</strong></p>
<ul style="margin:0 0 16px;padding-left:22px">
<li style="margin-bottom:6px">Compte : <strong>${esc(email)}</strong></li>
<li style="margin-bottom:6px">Date de création : ${esc(dateFr(creeLe))}</li>
<li style="margin-bottom:6px">Contrôle : ❌ Non conforme aux critères de validation automatique — ${esc(raison)}</li>
</ul>
<p style="margin:0 0 16px">Pour garantir la sécurité de la plateforme et la délivrabilité de nos alertes, les comptes concernés sont suspendus après 2 jours sans régularisation. Sans changement de votre part, votre compte sera suspendu le ${esc(dateFr(echeance.toISOString()))} (${esc(heureSeule(echeance.toISOString()))}, heure de Paris).</p>
<p style="margin:0 0 8px"><strong>Pour régulariser votre compte :</strong></p>
<ul style="margin:0 0 16px;padding-left:22px">
<li style="margin-bottom:6px">Connectez-vous et ajoutez un compte Google (ou GitHub) comme méthode de connexion depuis votre page <a href="https://www.dataparl.fr/mon-compte/securite" style="color:#164DFF">Sécurité et connexion</a> ;</li>
<li style="margin-bottom:6px">Ou recréez votre compte avec une adresse email valide.</li>
</ul>
<p style="margin:0 0 16px">Le contrôle est entièrement automatique : aucune intervention humaine n'est nécessaire.</p>
<p style="margin:0 0 16px">Ce message a été généré automatiquement par notre système anti-abus. Une question ? Répondez simplement à cet e-mail : nous le lirons.</p>
<p style="margin:0;color:#475569">— L'équipe DataParl'</p>`,
    text: `${salut}

Notre système anti-abus a détecté que le compte créé le ${dateFr(creeLe)} est associé à une adresse email dont le format est classé comme non valide par nos contrôles automatiques.

Résultat du contrôle :
- Compte : ${email}
- Date de création : ${dateFr(creeLe)}
- Contrôle : Non conforme aux critères de validation automatique — ${raison}

Pour garantir la sécurité de la plateforme et la délivrabilité de nos alertes, les comptes concernés sont suspendus après 2 jours sans régularisation. Sans changement de votre part, votre compte sera suspendu le ${dateFr(echeance.toISOString())} (${heureSeule(echeance.toISOString())}, heure de Paris).

Pour régulariser votre compte :
- Connectez-vous et ajoutez un compte Google (ou GitHub) comme méthode de connexion depuis votre page Sécurité et connexion : https://www.dataparl.fr/mon-compte/securite
- Ou recréez votre compte avec une adresse email valide.

Le contrôle est entièrement automatique : aucune intervention humaine n'est nécessaire.

Ce message a été généré automatiquement par notre système anti-abus. Une question ? Répondez simplement à cet e-mail : nous le lirons.

— L'équipe DataParl'`,
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

  const users: any[] = [];
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    users.push(...(data?.users ?? []));
    if (!data?.users || data.users.length < 200) break;
  }

  const delaEcoule = (d: string) => Date.now() - new Date(d).getTime() >= 48 * 3600 * 1000;
  const aUneMethodeOAuth = (u: any) =>
    ((u.identities ?? []) as any[]).some((i) => i.provider !== "email" && i.provider !== "phone");

  for (const u of users) {
    if (!u.email || u.banned_until) continue;
    const ligne = parId.get(u.id) as any;
    const ctrl = controleEmail(u.email);
    const oauth = aUneMethodeOAuth(u);

    // Régularisé : adresse devenue conforme, changée depuis le marquage,
    // ou méthode OAuth ajoutée (Google, GitHub…).
    if (!ctrl.suspect || oauth) {
      if (ligne && !ligne.regularise_le) {
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
      // Échéance annoncée = marquage + 48 h, à l'heure exacte.
      const echeance = new Date(Date.now() + 48 * 3600 * 1000);
      if (await envoyerAvertissement(u.email, raisonPour(u.email), prenomDe(u), u.created_at, echeance)) {
        await admin.from("comptes_suspects").update({ notifie_le: new Date().toISOString() }).eq("user_id", u.id);
        bilan.avertis++;
      }
    } else if (!ligne.suspendu_le && !ligne.regularise_le && u.email === ligne.email && delaEcoule(ligne.marque_le)) {
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
