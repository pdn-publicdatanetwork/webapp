import { NextResponse } from "next/server";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { secret } from "@/lib/env";
import { abonnesAlerte, ecrireEtatAlerte, lireEtatAlerte, offresDepuisAlerte, type Offre } from "@/lib/jobsFirestore";
import { authAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Envoi des alertes e-mail « nouvelles offres » de DataParl' Jobs, appelé par
// la collecte (workflow GitHub « Collecte Jobs », 12h00 et 18h00 heure de
// Paris) après le balayage IA. L'envoi vit ici plutôt que dans la CI : la clé
// Resend du projet GitLab appartenait à un compte où dataparl.fr n'est pas
// vérifié (403 sur chaque envoi), alors que le webapp envoie tous ses e-mails
// avec la clé du projet Vercel (compte où le domaine EST vérifié). Chaque
// envoi est rangé dans la table emails (visible dans la webmail), comme tous
// les e-mails du site (cf. lib/mail.ts).
//
// Règles héritées de scripts/alerte-nouvelles-offres.mjs :
// - expéditeur : alerte-job@dataparl.fr (jamais d'adresse personnelle) ;
// - offres « active » ET « approved » dont updated_at dépasse le dernier
//   envoi (une offre validée en retard est notifiée à sa validation) ;
// - fenêtre mémorisée dans alert_state/last : rien n'est envoyé deux fois ;
// - l'état n'avance qu'après au moins un envoi réussi (ou s'il n'y a rien à
//   envoyer) : un refus total laisse la fenêtre en place, le run suivant
//   réessaie.

const SITE_URL = "https://jobs.dataparl.fr";
const EXPEDITEUR = "\"DataParl' Jobs\" <alerte-job@dataparl.fr>";
const FENETRE_DEFAUT_MS = 4 * 24 * 3600 * 1000;

const CHAMBRES: Record<string, string> = { an: "Assemblée nationale", senat: "Sénat", pe: "Parlement européen" };

// Authentification machine-à-machine : APP_SECRET (si le projet Vercel le
// porte) ou le sha256 hexadécimal de FIREBASE_SERVICE_ACCOUNT, secret déjà
// partagé avec la collecte (tant que APP_SECRET n'est pas posé côté Vercel,
// la CI ne connaît que celui-là). Le sha256 n'expose pas la clé : c'est une
// preuve de connaissance, le JSON n'est jamais transmis par l'appelant.
const sha256hex = (s: string) => createHash("sha256").update(s).digest("hex");

function jetonsAttendus(): string[] {
  const attendus: string[] = [];
  if (process.env.APP_SECRET) attendus.push(`Bearer ${process.env.APP_SECRET}`);
  if (process.env.FIREBASE_SERVICE_ACCOUNT)
    attendus.push(`Bearer ${sha256hex(process.env.FIREBASE_SERVICE_ACCOUNT)}`);
  return attendus;
}

function autorise(req: Request): boolean {
  const recu = req.headers.get("authorization") ?? "";
  return jetonsAttendus().some(
    (attendu) => recu.length === attendu.length && timingSafeEqual(Buffer.from(recu), Buffer.from(attendu)),
  );
}

const str = (v: unknown) => String(v ?? "");

// Slug identique à celui du site (jobs/lib/jobs.ts) : le lien de l'e-mail doit
// pointer sur la vraie page /offre/<slug>.
const titrePoste = (t: unknown) => {
  const n = str(t).replace(/\s*dans\s+l['’]\s*équipes?\b.*/i, "").replace(/\s+/g, " ").trim();
  return n.length >= 3 ? n : str(t);
};
const slugPart = (x: string) =>
  x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const slugOffre = (o: Offre) => [str(o.id), slugPart(titrePoste(o.titre)).slice(0, 48)].filter(Boolean).join("_");

// Lien de désinscription signé : même formule que la route
// /api/jobs/desinscription (HMAC-SHA256 de l'adresse, 32 premiers hexadécimaux).
// Clé : APP_SECRET si le projet Vercel le porte, sinon le sha256 de
// FIREBASE_SERVICE_ACCOUNT (repli des deux côtés, cf. cette même route).
const cleJetons = () =>
  process.env.APP_SECRET || sha256hex(process.env.FIREBASE_SERVICE_ACCOUNT ?? "");

const jetonPour = (email: string) =>
  createHmac("sha256", cleJetons())
    .update(email.toLowerCase().trim())
    .digest("hex")
    .slice(0, 32);

const lienDesinscription = (email: string) =>
  `${SITE_URL}/desinscription?email=${encodeURIComponent(email)}&jeton=${jetonPour(email)}`;

const echapper = (s: unknown) =>
  str(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Carte d'offre au gabarit graphique DataParl' Jobs (HTML e-mail-safe :
// tables et styles en ligne, pas de CSS externe).
const carteOffre = (o: Offre) => {
  const lieu = [str(o.localisation), str(o.departement)].filter((x) => x && x !== "null").join(", ");
  const qui = [str(o.elu_prenom), str(o.elu_nom)].filter((x) => x && x !== "null").join(" ");
  const chambre = CHAMBRES[str(o.chambre)] ?? "";
  const url = `${SITE_URL}/offre/${slugOffre(o)}`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;margin-bottom:16px">
<tr><td style="padding:16px 20px;background:#F8FAFC;border-radius:12px 12px 0 0">
<span style="display:inline-block;background:#E4BDE9;color:#4E2E53;font-size:11px;font-weight:bold;padding:4px 12px;border-radius:999px;margin-right:6px">${echapper(chambre)}</span>
<span style="display:inline-block;background:#EEF2FF;color:#4E2E53;font-size:11px;font-weight:bold;padding:4px 12px;border-radius:999px">${echapper(str(o.type_poste) || "Offre")}</span>
</td></tr>
<tr><td style="padding:16px 20px">
<p style="margin:0 0 6px;font-size:17px;font-weight:bold;color:#1e293b">${echapper(titrePoste(o.titre))}</p>
<p style="margin:0 0 16px;font-size:13px;color:#475569">${echapper([qui, chambre, lieu].filter(Boolean).join(" - "))}</p>
<a href="${url}" style="display:inline-block;background:#4E2E53;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;padding:11px 24px;border-radius:10px">Voir l'offre</a>
</td></tr>
</table>`;
};

// Chaque envoi est rangé dans la table emails (webmail), comme tous les
// e-mails du site. Jamais bloquant : l'alerte compte envoyée dès que Resend
// l'accepte.
async function archiverEnvoi(email: string, sujet: string, html: string, texte: string, resendId: string): Promise<void> {
  try {
    const { error } = await authAdmin().from("emails").insert({
      direction: "out", communication_type: "alerte", from_addr: "alerte-job@dataparl.fr",
      to_addr: email, cc_addr: null, reply_to: null, subject: sujet, body_text: texte, body_html: html,
      in_reply_to: null, resend_id: resendId,
      web_token_hash: createHash("sha256").update(randomBytes(20).toString("hex")).digest("hex"),
      folder: "sent", read: true, source: "resend",
    });
    if (error) console.error("emails insert", error);
  } catch (e) {
    console.error("emails insert", e);
  }
}

export async function GET(req: Request) {
  if (!autorise(req)) return NextResponse.json({ error: "non autorisé" }, { status: 401 });

  const debut = new Date().toISOString();
  const etat = await lireEtatAlerte();
  const dernierEnvoi =
    etat.envoye_le && /\d{4}-\d{2}-\d{2}T/.test(etat.envoye_le)
      ? etat.envoye_le
      : new Date(Date.now() - FENETRE_DEFAUT_MS).toISOString();

  // Offres nouvelles depuis le dernier envoi (fenêtre sur updated_at).
  const offres = await offresDepuisAlerte(dernierEnvoi);
  if (!offres.length) {
    await ecrireEtatAlerte({ envoye_le: debut, offres: 0 });
    return NextResponse.json({ ok: true, depuis: dernierEnvoi, offres: 0, abonnes: 0, envoyes: 0 });
  }

  const abonnes = [...new Set((await abonnesAlerte()).map((a) => str(a.email).toLowerCase().trim()).filter(Boolean))];
  if (!abonnes.length) {
    await ecrireEtatAlerte({ envoye_le: debut, offres: offres.length });
    return NextResponse.json({ ok: true, depuis: dernierEnvoi, offres: offres.length, abonnes: 0, envoyes: 0 });
  }

  const sujet =
    offres.length === 1
      ? "Nouvelle offre parlementaire : " + titrePoste(offres[0].titre).slice(0, 60)
      : `${offres.length} nouvelles offres parlementaires`;
  const cartes = offres.map(carteOffre).join("");
  const intro =
    offres.length === 1
      ? "Une nouvelle offre de collaborateur parlementaire vient d'être publiée."
      : `${offres.length} nouvelles offres de collaborateur parlementaire viennent d'être publiées.`;

  const gabarit = (email: string) => `<!DOCTYPE html>
<html lang="fr"><body style="margin:0;padding:0;background-color:#ECF1FC;font-family:Arial,Helvetica,sans-serif;color:#1e293b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ECF1FC;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
<tr><td style="padding:0 12px 16px;text-align:center">
<span style="font-size:22px;font-weight:bold;color:#4E2E53;font-family:Georgia,'Times New Roman',serif">DataParl' Jobs</span>
</td></tr>
<tr><td style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:28px 24px">
<p style="margin:0 0 6px;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:1px">Vos alertes emploi</p>
<h1 style="margin:0 0 12px;font-size:22px;color:#4E2E53;font-family:Georgia,serif">${offres.length === 1 ? "Nouvelle offre au Parlement" : `${offres.length} nouvelles offres au Parlement`}</h1>
<p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#334155">${intro} Voici les offres publiées depuis le dernier envoi.</p>
${cartes}
<p style="margin:24px 0 0;font-size:13px"><a href="${SITE_URL}" style="color:#6C84B0">Voir toutes les offres sur DataParl' Jobs</a></p>
</td></tr>
<tr><td style="padding:20px 12px;text-align:center">
<p style="margin:0 0 8px;font-size:12px;color:#64748b">Vous recevez cet e-mail car vous avez activé une alerte sur jobs.dataparl.fr.</p>
<p style="margin:0 0 8px;font-size:12px"><a href="${lienDesinscription(email)}" style="color:#6C84B0">Me désinscrire</a></p>
<p style="margin:0;font-size:11px;color:#94a3b8">DataParl' - Le Parlement, pièce par pièce.</p>
</td></tr>
</table></td></tr></table></body></html>`;

  const corpsTexte = (email: string) =>
    `${intro}\n\n${offres.map((o) => `- ${titrePoste(o.titre)} : ${SITE_URL}/offre/${slugOffre(o)}`).join("\n")}\n\n` +
    `Toutes les offres : ${SITE_URL}\n\n` +
    `Vous recevez cet e-mail car vous avez activé une alerte sur jobs.dataparl.fr.\n` +
    `Me désinscrire : ${lienDesinscription(email)}\n\nDataParl' - Le Parlement, pièce par pièce.`;

  const cle = secret("RESEND_API_KEY");
  let envoyes = 0;
  const echecs: string[] = [];
  for (const email of abonnes) {
    const html = gabarit(email);
    const texte = corpsTexte(email);
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${cle}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: EXPEDITEUR, to: [email], subject: sujet, html, text: texte }),
      });
      if (!r.ok) {
        echecs.push(`${email} : Resend ${r.status} ${(await r.text()).slice(0, 120)}`);
        continue;
      }
      const id = ((await r.json()) as { id: string }).id;
      await archiverEnvoi(email, sujet, html, texte, id);
      envoyes += 1;
    } catch (e) {
      echecs.push(`${email} : ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // L'état n'avance que si au moins un envoi a réussi : un refus total laisse
  // la fenêtre en place pour le run suivant.
  if (envoyes > 0 || echecs.length === 0) {
    await ecrireEtatAlerte({
      envoye_le: debut,
      dernier_envoi_stats: `${envoyes}/${abonnes.length}`,
      offres: offres.length,
    });
  }
  return NextResponse.json(
    {
      ok: echecs.length === 0,
      depuis: dernierEnvoi,
      offres: offres.length,
      abonnes: abonnes.length,
      envoyes,
      echecs: echecs.slice(0, 5),
    },
    { status: envoyes === 0 && echecs.length ? 502 : 200 },
  );
}
