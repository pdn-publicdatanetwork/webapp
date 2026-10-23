import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { authAdmin } from "@/lib/supabaseAdmin";
import { bouton, expedier, hashJeton } from "@/lib/mail";
import { randomToken } from "@/lib/tokens";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const SITE = "https://www.dataparl.fr";

// Enquête utilisateurs à J+3 : chaque compte créé il y a 3 jours ou plus,
// jamais invité et toujours actif, reçoit une invitation à répondre au
// questionnaire (survey.dataparl.fr). Appelé chaque matin par la tâche
// planifiée de Vercel (vercel.json). Idempotent : un compte déjà présent
// dans survey_reponses (ligne d'invitation, répondue ou non) n'est jamais
// réinvité ; les comptes supprimés sont exclus via audit_comptes. Un envoi
// en échec supprime la ligne d'invitation pour retenter le lendemain.
function autorise(req: Request): boolean {
  const s = process.env.CRON_SECRET ?? "";
  const recu = req.headers.get("authorization") ?? "";
  const attendu = `Bearer ${s}`;
  return !!s && recu.length === attendu.length && timingSafeEqual(Buffer.from(recu), Buffer.from(attendu));
}

type Compte = { id: string; email: string | null; user_metadata: Record<string, unknown> | null; created_at: string };

// « Bonjour {{ prénom }} » : prénom du compte si connu, sinon sans nom.
function salut(c: Compte): string {
  const m = (c.user_metadata ?? {}) as Record<string, string>;
  const prenom = String(m.prenom ?? "").trim();
  if (prenom) return `Bonjour ${prenom},`;
  const complet = String(m.full_name ?? m.name ?? "").trim();
  if (complet) return `Bonjour ${complet.split(/\s+/)[0]},`;
  return "Bonjour,";
}

export async function GET(req: Request) {
  if (!autorise(req)) return NextResponse.json({ error: "non autorisé" }, { status: 401 });
  const db = authAdmin();

  // Comptes créés il y a 3 jours ou plus (la fenêtre ouverte rattrape
  // d'elle-même un éventuel jour de cron manqué).
  const limite = new Date(Date.now() - 3 * 86400_000).toISOString();
  const { data: comptes, error } = await db.from("comptes_utilisateurs")
    .select("id, email, user_metadata, created_at")
    .lte("created_at", limite)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const [{ data: invites }, { data: supprimes }] = await Promise.all([
    db.from("survey_reponses").select("email"),
    db.from("audit_comptes").select("email").in("evenement", ["suppression", "suppression_logique"]),
  ]);
  const dejaInvites = new Set(((invites ?? []) as { email: string }[]).map((r) => r.email.toLowerCase()));
  const horsLigne = new Set(((supprimes ?? []) as { email: string }[]).map((r) => r.email.toLowerCase()));

  const aInviter = ((comptes ?? []) as Compte[]).filter((c) => {
    const e = (c.email ?? "").toLowerCase();
    return e.includes("@") && !dejaInvites.has(e) && !horsLigne.has(e);
  });

  let envoyes = 0;
  const erreurs: string[] = [];
  for (const c of aInviter.slice(0, 50)) {
    const email = c.email!;
    const jeton = randomToken(24);
    const { error: errInsert } = await db.from("survey_reponses").insert({
      user_id: c.id, email, jeton_hash: hashJeton(jeton),
    });
    if (errInsert) { erreurs.push(`${email} : insert ${errInsert.message}`); continue; }

    const url = `https://survey.dataparl.fr/?j=${jeton}`;
    const salutation = salut(c);
    const r = await expedier({
      from: "enquetes@dataparl.fr",
      to: [email],
      subject: "Votez pour le futur DataParl' 🗳️",
      titre: "Votez pour le futur DataParl'",
      corpsHtml: [
        `<p>${salutation}</p>`,
        "<p>DataParl' est un projet en construction — et ceux qui le connaissent le mieux sont ses utilisateurs. C'est vous.</p>",
        "<p>Au Parlement, tout commence par un vote. Aujourd'hui, c'est à vous de voter : <strong>pour quelles évolutions de dataparl.fr êtes-vous ?</strong></p>",
        "<p>Nouvelles données à recenser, fonctionnalités manquantes, irritants au quotidien : dites-nous tout, on lit chaque réponse.</p>",
        bouton(url, "Voter maintenant (3 min)"),
        `<p style="color:#4A5670">Si le bouton ne fonctionne pas, copie-colle ce lien : <a href="${url}" style="color:#4A5670">${url}</a></p>`,
      ].join(""),
      text: [
        salutation,
        "",
        "DataParl' est un projet en construction — et ceux qui le connaissent le mieux sont ses utilisateurs. C'est vous.",
        "",
        "Au Parlement, tout commence par un vote. Aujourd'hui, c'est à vous de voter : pour quelles évolutions de dataparl.fr êtes-vous ?",
        "",
        "Nouvelles données à recenser, fonctionnalités manquantes, irritants au quotidien : dites-nous tout, on lit chaque réponse.",
        "",
        `Voter maintenant (3 min) : ${url}`,
        "",
        "Merci — chaque réponse compte vraiment.",
        "L'équipe DataParl' — Le Parlement, pièce par pièce.",
      ].join("\n"),
      type: "transactionnel",
      pied: `<a href="${SITE}/contact" style="color:#4A5670">Une question ? Contactez-nous</a> · <a href="${SITE}/informations-legales/confidentialite" style="color:#4A5670">Données personnelles</a>`,
    });

    if (!r.ok) {
      // La ligne d'invitation est retirée : le compte sera de nouveau
      // éligible demain (l'échec d'envoi ne doit pas griller l'invitation).
      await db.from("survey_reponses").delete().eq("jeton_hash", hashJeton(jeton));
      erreurs.push(`${email} : ${r.error}`);
      continue;
    }
    envoyes += 1;
  }

  return NextResponse.json({
    ok: erreurs.length === 0,
    eligibles: aInviter.length,
    envoyes,
    erreurs: erreurs.slice(0, 5),
  });
}
