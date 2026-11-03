import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { controleEmail } from "@/lib/antiAbus";
import { expedier, esc, type Message } from "@/lib/mail";
import { authAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Anti-abus (cron horaire, h15) : détecte les comptes dont l'adresse ne passe
// pas le contrôle automatique (lib/antiAbus.ts, appliqué aussi à l'inscription),
// envoie le mail « Action requise » puis suspend le compte après 48 h sans
// régularisation (changement d'adresse ou ajout d'un compte Google/GitHub).
// Suspension = bannissement GoTrue réversible côté admin. Table de suivi :
// public.comptes_suspects (service_role uniquement, migration comptes_suspects).

const OBJET = "[DataParl] Action requise — vérification de votre adresse email";

function autorise(req: Request): boolean {
  const s = process.env.CRON_SECRET ?? "";
  const recu = req.headers.get("authorization") ?? "";
  const attendu = `Bearer ${s}`;
  return !!s && recu.length === attendu.length && timingSafeEqual(Buffer.from(recu), Buffer.from(attendu));
}

// « le 04/11/2026 à 21 h 15, heure de Paris »
const dateHeureFr = (d: string) =>
  new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })
    .format(new Date(d))
    .replace(",", " à")
    .replace(/(\d\d):(\d\d)$/, "$1 h $2");

// Raisons tournées, choisies de façon déterministe par adresse (stable d'un mail à l'autre).
const RAISONS = [
  "l'adresse contient un motif repéré comme non conforme",
  "le format de l'adresse correspond à une adresse temporaire ou jetable",
  "l'adresse ne remplit pas les critères de validation automatique",
  "l'adresse présente un format couramment utilisé pour créer des comptes fictifs",
  "le format de l'adresse est classé non valide par nos contrôles",
];

function raisonPour(email: string): string {
  let h = 0;
  for (const c of email.toLowerCase()) h = (h * 31 + c.charCodeAt(0)) % 1000000007;
  return RAISONS[h % RAISONS.length];
}

// Prénom déclaré dans les métadonnées du compte ; repli sur le nom complet, sinon rien.
function prenomDe(u: any): string {
  const md = u?.user_metadata ?? {};
  const p = (md.prenom ?? "").trim();
  if (p) return p;
  const n = (md.name ?? "").trim();
  return n ? n.split(" ")[0] : "";
}

async function envoyerAvertissement(email: string, raison: string, prenom: string, creeLe: string, echeance: Date): Promise<boolean> {
  const salut = prenom ? `Bonjour ${esc(prenom)},` : "Bonjour,";
  const dateCrea = esc(dateHeureFr(creeLe));
  const dateEch = esc(dateHeureFr(echeance.toISOString()));
  const raisonAffichee = esc(raison);
  const corpsHtml = `<p style="margin:0 0 16px">${salut}</p>
<p style="margin:0 0 16px">Notre système anti-abus a détecté que le compte créé le ${dateCrea} est associé à une adresse email dont le format est classé comme non valide par nos contrôles automatiques.</p>
<p style="margin:0 0 8px"><strong>Résultat du contrôle :</strong></p>
<ul style="margin:0 0 16px;padding-left:22px">
<li style="margin-bottom:6px">Compte : <strong>${esc(email)}</strong></li>
<li style="margin-bottom:6px">Date de création : ${dateCrea}</li>
<li style="margin-bottom:6px">Contrôle : ❌ Non conforme aux critères de validation automatique — ${raisonAffichee}</li>
</ul>
<p style="margin:0 0 16px">Pour garantir la sécurité de la plateforme et la délivrabilité de nos alertes, les comptes concernés sont suspendus après 2 jours sans régularisation. Sans changement de votre part, votre compte sera suspendu le ${dateEch}, heure de Paris.</p>
<p style="margin:0 0 8px"><strong>Pour régulariser votre compte :</strong></p>
<ul style="margin:0 0 16px;padding-left:22px">
<li style="margin-bottom:6px">Connectez-vous et ajoutez un compte Google (ou GitHub) comme méthode de connexion depuis votre page <a href="https://www.dataparl.fr/mon-compte/securite" style="color:#164DFF">Sécurité et connexion</a> ;</li>
<li style="margin-bottom:6px">Ou recréez votre compte avec une adresse email valide.</li>
</ul>
<p style="margin:0 0 16px">Le contrôle est entièrement automatique : aucune intervention humaine n'est nécessaire.</p>
<p style="margin:0 0 16px">Ce message a été généré automatiquement par notre système anti-abus. Une question ? Répondez simplement à cet e-mail : nous le lirons.</p>
<p style="margin:0;color:#475569">— L'équipe DataParl'`;

  const salutT = prenom ? `Bonjour ${prenom},` : "Bonjour,";
  const text = `${salutT}

Notre système anti-abus a détecté que le compte créé le ${dateHeureFr(creeLe)} est associé à une adresse email dont le format est classé comme non valide par nos contrôles automatiques.

Résultat du contrôle :

- Compte : ${email}
- Date de création : ${dateHeureFr(creeLe)}
- Contrôle : Non conforme aux critères de validation automatique — ${raison}

Pour garantir la sécurité de la plateforme et la délivrabilité de nos alertes, les comptes concernés sont suspendus après 2 jours sans régularisation. Sans changement de votre part, votre compte sera suspendu le ${dateHeureFr(echeance.toISOString())}, heure de Paris.

Pour régulariser votre compte :

- Connectez-vous et ajoutez un compte Google (ou GitHub) comme méthode de connexion depuis votre page Sécurité et connexion : https://www.dataparl.fr/mon-compte/securite
- Ou recréez votre compte avec une adresse email valide.

Le contrôle est entièrement automatique : aucune intervention humaine n'est nécessaire.

Ce message a été généré automatiquement par notre système anti-abus. Une question ? Répondez simplement à cet e-mail : nous le lirons.

— L'équipe DataParl'
https://www.dataparl.fr/`;

  const m: Message = {
    from: "abuse@dataparl.fr",
    nomExpediteur: "L'équipe DataParl'",
    to: [email],
    subject: OBJET,
    titre: "Action requise : vérification de votre adresse email",
    corpsHtml,
    text,
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

  // Liste des comptes via la vue public.comptes_utilisateurs (PostgREST) :
  // l'API GoTrue auth.admin.listUsers renvoie un 500 « Database error finding
  // users » sur ce projet — même contournement que app/api/admin/users/route.ts.
  // Bannissement et fournisseurs de connexion se lisent dans app_metadata
  // (banned_until, providers), écrits par GoTrue.
  const users: any[] = [];
  for (let page = 0; page < 50; page++) {
    const { data, error } = await admin
      .from("comptes_utilisateurs")
      .select("id, email, created_at, user_metadata, app_metadata")
      .order("created_at", { ascending: true })
      .range(page * 200, page * 200 + 199);
    if (error) return NextResponse.json({ ok: false, error: `vue comptes_utilisateurs : ${error.message}` }, { status: 500 });
    users.push(...(data ?? []));
    if (!data || data.length < 200) break;
  }

  // Régularisation : adresse changée OU méthode de connexion OAuth (Google, GitHub…) ajoutée.
  // Fournisseurs listés par GoTrue dans app_metadata.providers.
  const aOAuth = (u: any) => ((u.app_metadata?.providers ?? []) as string[]).some((p) => p !== "email" && p !== "phone");
  const delaEcoule = (d: string) => Date.now() - new Date(d).getTime() >= 48 * 3600 * 1000;

  for (const u of users) {
    if (!u.email || u.app_metadata?.banned_until) continue;
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

    // Régularisation : un compte Google/GitHub a été lié depuis le marquage.
    if (ligne && !ligne.regularise_le && aOAuth(u)) {
      await admin.from("comptes_suspects").update({ regularise_le: new Date().toISOString() }).eq("user_id", u.id);
      bilan.regularises++;
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
