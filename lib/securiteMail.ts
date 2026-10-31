import "server-only";
import { IP_QUOTA_JOUR } from "./apiKeys";
import { SITE_URL } from "./env";
import { expedier, esc } from "./mail";
import { authAdmin } from "./supabaseAdmin";

// Notifications de sécurité : chaque changement sensible du compte déclenche
// un e-mail à la personne, depuis securite@dataparl.fr (les clés API depuis
// api@dataparl.fr). Toujours best-effort : un échec d'envoi ne bloque jamais
// l'action qui l'a déclenchée. Anti-doublon : un même objet n'est jamais
// renvoyé à la même adresse sous 24 h (le bruit des IP mobiles qui tournent
// reste ainsi borné à un message par jour et par événement).

export const FROM_SECURITE = "securite@dataparl.fr";
export const FROM_API = "api@dataparl.fr";

const PIED_SECURITE =
  "Message envoyé automatiquement pour la sécurité de ton compte. Si tu n'es pas à l'origine de cette action, change ton mot de passe depuis « Mon compte », puis écris-nous : " +
  `<a href="${SITE_URL}/contact" style="color:#164DFF">formulaire de contact</a>.`;

const heureParis = () =>
  new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", dateStyle: "long", timeStyle: "short" }).format(new Date());

// IP tronquée dans les e-mails (jamais l'adresse complète, même à la personne).
export function tronquerIp(ip: string | null): string {
  if (!ip) return "adresse inconnue";
  if (ip.includes(":")) return ip.split(":").slice(0, 3).join(":") + "::…";
  return ip.split(".").slice(0, 3).join(".") + ".xxx.xxx";
}

function blocLignes(lignes: Array<[string, string]>): string {
  const tr = lignes.map(([k, v]) =>
    `<tr><td style="padding:6px 12px 6px 0;color:#4A5670;white-space:nowrap">${esc(k)}</td><td style="padding:6px 0"><strong>${esc(v)}</strong></td></tr>`).join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;padding:12px 16px;background:#FBFAF5;border:1px solid #E6E3D8;border-radius:10px">${tr}</table>`;
}

type MessageSecurite = {
  sujet: string; titre: string; corpsHtml: string; text: string;
  from?: string; // défaut : securite@dataparl.fr
};

// Point d'envoi commun : résout l'adresse et le prénom, applique l'anti-doublon
// 24 h, habille du gabarit et n'envoie jamais de lien de saisie d'identifiants.
export async function notifierSecurite(userId: string, m: MessageSecurite): Promise<void> {
  try {
    const { data } = await authAdmin().auth.admin.getUserById(userId);
    const email = data?.user?.email;
    if (!email) return;
    const db = authAdmin();
    const { count } = await db.from("emails").select("id", { count: "exact", head: true })
      .eq("to_addr", email).eq("subject", m.sujet)
      .gte("created_at", new Date(Date.now() - 86400_000).toISOString());
    if ((count ?? 0) > 0) return;
    const prenom = (((data?.user?.user_metadata ?? {}) as { prenom?: string }).prenom ?? "").trim();
    const p = prenom ? prenom.charAt(0).toUpperCase() + prenom.slice(1) : "";
    const bonjourHtml = p ? `<p style="margin:0 0 16px">Bonjour ${esc(p)},</p>` : "<p style=\"margin:0 0 16px\">Bonjour,</p>";
    await expedier({
      to: [email],
      from: m.from ?? FROM_SECURITE,
      nomExpediteur: "DataParl'",
      subject: m.sujet,
      titre: m.titre,
      corpsHtml: bonjourHtml + m.corpsHtml,
      text: (p ? `Bonjour ${p},` : "Bonjour,") + "\n\n" + m.text,
      pied: PIED_SECURITE,
      type: "transactionnel",
    });
  } catch (e) {
    console.error("notification sécurité", m.sujet, String(e).slice(0, 200));
  }
}

// Changement de mot de passe (depuis « Mon compte »).
export async function mailMotDePasseModifie(userId: string, ip: string | null): Promise<void> {
  const quand = heureParis();
  await notifierSecurite(userId, {
    sujet: "Ton mot de passe DataParl' a été modifié",
    titre: "Mot de passe modifié",
    corpsHtml:
      "<p style=\"margin:0 0 16px\">Le mot de passe de ton compte DataParl' vient d'être modifié.</p>" +
      blocLignes([["Quand", quand], ["Depuis", tronquerIp(ip)]]) +
      "<p style=\"margin:0 0 16px\">Si c'était bien toi, rien à faire. Autrement, sécurise ton compte sans attendre : change ton mot de passe puis écris-nous via le formulaire de contact.</p>" +
      `<p style="margin:24px 0"><a href="${SITE_URL}/mon-compte/securite" style="display:inline-block;background:#0F172A;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 24px;border-radius:8px">Vérifier mes réglages</a></p>`,
    text:
      `Le mot de passe de ton compte DataParl' vient d'être modifié.\n\nQuand : ${quand}\nDepuis : ${tronquerIp(ip)}\n\nSi c'était bien toi, rien à faire. Autrement, change ton mot de passe (${SITE_URL}/mon-compte/securite) puis écris-nous via le formulaire de contact.`,
  });
}

// Validation en deux étapes (TOTP) activée ou désactivée.
export async function mail2FA(userId: string, active: boolean): Promise<void> {
  const quand = heureParis();
  await notifierSecurite(userId, active
    ? {
        sujet: "La validation en deux étapes est activée sur ton compte",
        titre: "Validation en deux étapes activée",
        corpsHtml:
          "<p style=\"margin:0 0 16px\">La validation en deux étapes vient d'être activée sur ton compte DataParl'. Ta connexion exige désormais ton mot de passe, puis un code de ton application d'authentification.</p>" +
          blocLignes([["Quand", quand]]) +
          "<p style=\"margin:0\">Si tu n'es pas à l'origine de ce changement, quelqu'un a peut-être accès à ton compte : change ton mot de passe puis écris-nous via le formulaire de contact.</p>",
        text: `La validation en deux étapes vient d'être activée sur ton compte DataParl'. Ta connexion exige désormais ton mot de passe, puis un code de ton application d'authentification.\n\nQuand : ${quand}\n\nSi tu n'es pas à l'origine de ce changement, change ton mot de passe (${SITE_URL}/mon-compte/securite) puis écris-nous via le formulaire de contact.`,
      }
    : {
        sujet: "La validation en deux étapes a été désactivée",
        titre: "Validation en deux étapes désactivée",
        corpsHtml:
          "<p style=\"margin:0 0 16px\">La validation en deux étapes vient d'être <strong>désactivée</strong> : ton mot de passe seul suffit désormais à te connecter.</p>" +
          blocLignes([["Quand", quand]]) +
          "<p style=\"margin:0 0 16px\">Si tu n'es pas à l'origine de ce changement, réactive-la et change ton mot de passe sans attendre.</p>" +
          `<p style="margin:24px 0"><a href="${SITE_URL}/mon-compte/securite" style="display:inline-block;background:#0F172A;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 24px;border-radius:8px">Réactiver la validation</a></p>`,
        text: `La validation en deux étapes vient d'être désactivée : ton mot de passe seul suffit désormais à te connecter.\n\nQuand : ${quand}\n\nSi tu n'es pas à l'origine de ce changement, réactive-la et change ton mot de passe : ${SITE_URL}/mon-compte/securite`,
      });
}

// Méthode de connexion OAuth ajoutée ou retirée (Google, GitHub, X).
const NOMS_FOURNISSEURS: Record<string, string> = { google: "Google", github: "GitHub", twitter: "X" };
export async function mailMethodeConnexion(userId: string, fournisseur: string, ajoute: boolean): Promise<void> {
  const nom = NOMS_FOURNISSEURS[fournisseur] ?? fournisseur;
  const quand = heureParis();
  await notifierSecurite(userId, {
    sujet: ajoute ? `${nom} a été ajouté à tes méthodes de connexion` : `${nom} a été retiré de tes méthodes de connexion`,
    titre: ajoute ? `${nom} ajouté comme méthode de connexion` : `${nom} retiré de tes méthodes de connexion`,
    corpsHtml:
      `<p style="margin:0 0 16px">${ajoute
        ? `Le compte ${nom} peut désormais ouvrir une session sur ton compte DataParl'.`
        : `Le compte ${nom} ne peut plus ouvrir de session sur ton compte DataParl'.`}</p>` +
      blocLignes([["Quand", quand]]) +
      "<p style=\"margin:0\">Si tu n'es pas à l'origine de ce changement, vérifie tes réglages puis écris-nous via le formulaire de contact.</p>",
    text: `${ajoute
      ? `Le compte ${nom} peut désormais ouvrir une session sur ton compte DataParl'.`
      : `Le compte ${nom} ne peut plus ouvrir de session sur ton compte DataParl'.`}\n\nQuand : ${quand}\n\nSi tu n'es pas à l'origine de ce changement, vérifie tes réglages (${SITE_URL}/mon-compte/securite) puis écris-nous via le formulaire de contact.`,
  });
}

// Connexion depuis un appareil (ou un pays) jamais vu : mail d'information,
// la personne confirme ou agit. Jamais de lien de connexion dans le message.
export async function mailConnexionInhabituelle(userId: string, p: { ip: string | null; appareil: string | null; pays: string | null }): Promise<void> {
  const quand = heureParis();
  const depuis = [p.pays, tronquerIp(p.ip)].filter(Boolean).join(", ");
  await notifierSecurite(userId, {
    sujet: "Nouvelle connexion à ton compte DataParl'",
    titre: "Nouvelle connexion détectée",
    corpsHtml:
      "<p style=\"margin:0 0 16px\">Une nouvelle connexion à ton compte vient d'être détectée. Si c'était toi (nouvel appareil, nouveau lieu, voyage…), ignore ce message.</p>" +
      blocLignes([["Quand", quand], ["Appareil", p.appareil ?? "appareil inconnu"], ["Depuis", depuis || "adresse inconnue"]]) +
      "<p style=\"margin:0 0 16px\">Sinon, quelqu'un a peut-être ton mot de passe : change-le sans attendre, puis écris-nous via le formulaire de contact.</p>" +
      `<p style="margin:24px 0"><a href="${SITE_URL}/mon-compte/securite" style="display:inline-block;background:#0F172A;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 24px;border-radius:8px">Sécuriser mon compte</a></p>`,
    text: `Une nouvelle connexion à ton compte vient d'être détectée. Si c'était toi, ignore ce message.\n\nQuand : ${quand}\nAppareil : ${p.appareil ?? "appareil inconnu"}\nDepuis : ${depuis || "adresse inconnue"}\n\nSinon, change ton mot de passe (${SITE_URL}/mon-compte/securite) puis écris-nous via le formulaire de contact.`,
  });
}

// Clé API : création et révocation, depuis api@dataparl.fr. La clé en clair ne
// figure jamais dans le message : seul le préfixe (affiché aussi dans l'admin).
export async function mailCleApi(userId: string, cle: { nom: string; prefixe: string }, creation: boolean): Promise<void> {
  const quand = heureParis();
  await notifierSecurite(userId, creation
    ? {
        from: FROM_API,
        sujet: "Ta clé API DataParl' est active",
        titre: "Clé API active",
        corpsHtml:
          "<p style=\"margin:0 0 16px\">Une clé API vient d'être créée sur ton compte. Elle permet d'interroger les données publiques de DataParl' depuis tes propres outils.</p>" +
          blocLignes([["Nom", cle.nom], ["Préfixe", cle.prefixe + "…"], ["Quota", `${IP_QUOTA_JOUR} requêtes/jour`], ["Quand", quand]]) +
          "<p style=\"margin:0 0 16px\">Conseils : garde la clé hors de tes dépôts Git (fichier .env), utilise-la côté serveur quand tu peux, et révoque-la depuis « Mon compte » si elle n'est plus utile. La clé complète ne s'affiche qu'une fois, à la création.</p>" +
          `<p style="margin:24px 0"><a href="${SITE_URL}/mon-compte" style="display:inline-block;background:#0F172A;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 24px;border-radius:8px">Gérer ma clé</a></p>`,
        text: `Une clé API vient d'être créée sur ton compte.\n\nNom : ${cle.nom}\nPréfixe : ${cle.prefixe}…\nQuota : ${IP_QUOTA_JOUR} requêtes/jour\nQuand : ${quand}\n\nGarde la clé hors de tes dépôts Git, utilise-la côté serveur quand tu peux, et révoque-la depuis ${SITE_URL}/mon-compte si elle n'est plus utile. La clé complète ne s'affiche qu'une fois, à la création.`,
      }
    : {
        from: FROM_API,
        sujet: "Ta clé API DataParl' a été révoquée",
        titre: "Clé API révoquée",
        corpsHtml:
          "<p style=\"margin:0 0 16px\">Ta clé API vient d'être révoquée : les requêtes qui l'utilisent seront désormais refusées.</p>" +
          blocLignes([["Nom", cle.nom], ["Préfixe", cle.prefixe + "…"], ["Quand", quand]]) +
          "<p style=\"margin:0\">Si tu n'es pas à l'origine de cette révocation, vérifie tes réglages puis écris-nous via le formulaire de contact.</p>",
        text: `Ta clé API vient d'être révoquée : les requêtes qui l'utilisent seront désormais refusées.\n\nNom : ${cle.nom}\nPréfixe : ${cle.prefixe}…\nQuand : ${quand}\n\nSi tu n'es pas à l'origine de cette révocation, vérifie tes réglages (${SITE_URL}/mon-compte) puis écris-nous via le formulaire de contact.`,
      });
}
