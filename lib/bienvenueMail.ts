import "server-only";
import { SITE_URL } from "./env";
import { expedier } from "./mail";
import { authAdmin } from "./supabaseAdmin";

// Mail de bienvenue (template validé le 23/10/2026), depuis
// bienvenue@dataparl.fr : jamais d'adresse personnelle comme expéditeur
// (règle absolue). Envoyé une seule fois par compte, à la création, depuis
// la route de consentement des CGU (appelée au moment de l'inscription).

export const FROM_BIENVENUE = "bienvenue@dataparl.fr";

const LIENS = {
  compte: `${SITE_URL}/mon-compte`,
  alertes: `${SITE_URL}/alertes`,
  telegram: "https://t.me/dataparl_daily",
  vigiparl: "https://vigiparl.fr",
  mixiparl: "https://mixiparl.fr",
  senatoriales: `${SITE_URL}/senatoriales2026`,
  contact: `${SITE_URL}/contact`,
  securite: `${SITE_URL}/mon-compte/securite`,
};

function corps(prenom: string): { html: string; text: string } {
  const bonjourHtml = prenom ? `Bonjour ${prenom},` : "Bonjour,";
  const html = [
    `<p style="margin:0 0 16px">${bonjourHtml}</p>`,
    "<p style=\"margin:0 0 16px\">Ton compte DataParl' est prêt : bienvenue ! Depuis ton espace, tu peux rechercher et suivre les élus et leurs collaborateurs, lancer des téléchargements et régler tes alertes.</p>",
    `<p style="margin:24px 0"><a href="${LIENS.compte}" style="display:inline-block;background:#0F172A;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 24px;border-radius:8px">Accéder à mon espace</a></p>`,
    "<p style=\"margin:0 0 8px\"><strong>Pour bien démarrer :</strong></p>",
    "<ul style=\"margin:0 0 16px;padding-left:22px\">",
    `<li style="margin-bottom:6px">Des alertes quotidiennes sur les mouvements qui t'intéressent : <a href="${LIENS.alertes}" style="color:#164DFF">dataparl.fr/alertes</a></li>`,
    `<li style="margin-bottom:6px\">Le canal Telegram pour la revue de presse parlementaire : <a href="${LIENS.telegram}" style="color:#164DFF">t.me/dataparl_daily</a></li>`,
    `<li style="margin-bottom:6px\">Les indices Vigiparl (<a href="${LIENS.vigiparl}" style="color:#164DFF">vigiparl.fr</a>) et Mixiparl (<a href="${LIENS.mixiparl}" style="color:#164DFF">mixiparl.fr</a>)</li>`,
    `<li style="margin-bottom:6px\">Les Sénatoriales 2026 : <a href="${LIENS.senatoriales}" style="color:#164DFF">dataparl.fr/senatoriales2026</a></li>`,
    "</ul>",
    "<p style=\"margin:0 0 16px\">Pense aussi à faire le tour de tes réglages de sécurité : mot de passe, validation en deux étapes, méthodes de connexion, le tout depuis « Mon compte ».</p>",
    "<p style=\"margin:24px 0 0;color:#475569\">L'équipe DataParl' — Le Parlement, pièce par pièce.</p>",
  ].join("\n");
  const text = [
    `${bonjourHtml}`,
    "",
    "Ton compte DataParl' est prêt : bienvenue ! Depuis ton espace, tu peux rechercher et suivre les élus et leurs collaborateurs, lancer des téléchargements et régler tes alertes.",
    "",
    `Accéder à mon espace : ${LIENS.compte}`,
    "",
    "Pour bien démarrer :",
    `- Des alertes quotidiennes : ${LIENS.alertes}`,
    `- Canal Telegram : ${LIENS.telegram}`,
    `- Indices Vigiparl (${LIENS.vigiparl}) et Mixiparl (${LIENS.mixiparl})`,
    `- Sénatoriales 2026 : ${LIENS.senatoriales}`,
    "",
    "Pense aussi à faire le tour de tes réglages de sécurité : mot de passe, validation en deux étapes, méthodes de connexion, depuis « Mon compte ».",
    "",
    "L'équipe DataParl' — Le Parlement, pièce par pièce.",
  ].join("\n");
  return { html, text };
}

// Best-effort, jamais bloquant pour l'inscription. Anti-doublon absolu :
// le mail de bienvenue n'est jamais renvoyé à la même adresse.
export async function envoyerBienvenue(userId: string): Promise<void> {
  try {
    const { data } = await authAdmin().auth.admin.getUserById(userId);
    const email = data?.user?.email;
    if (!email) return;
    const db = authAdmin();
    const { count } = await db.from("emails").select("id", { count: "exact", head: true })
      .eq("to_addr", email).eq("subject", "Bienvenue sur DataParl' 👋");
    if ((count ?? 0) > 0) return;
    const prenom = (((data?.user?.user_metadata ?? {}) as { prenom?: string }).prenom ?? "").trim();
    const c = corps(prenom ? prenom.charAt(0).toUpperCase() + prenom.slice(1) : "");
    await expedier({
      to: [email],
      from: FROM_BIENVENUE,
      nomExpediteur: "L'équipe DataParl'",
      subject: "Bienvenue sur DataParl' 👋",
      titre: "Bienvenue sur DataParl'",
      corpsHtml: c.html,
      text: c.text,
      pied: `Tu reçois ce message parce qu'un compte vient d'être créé avec ton adresse. Une question ? <a href="${LIENS.contact}" style="color:#4A5670">Écris-nous</a>.`,
      type: "transactionnel",
    });
  } catch (e) {
    console.error("bienvenue", String(e).slice(0, 200));
  }
}
