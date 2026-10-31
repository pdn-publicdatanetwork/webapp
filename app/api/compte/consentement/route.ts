import { NextResponse } from "next/server";
import { logConsent } from "@/lib/consent";
import { envoyerBienvenue } from "@/lib/bienvenueMail";
import { esc } from "@/lib/mail";
import { copieSlack, SLACK_NEW_USER } from "@/lib/slack";
import { normalizeEmail } from "@/lib/tokens";
import { utilisateur, fournisseurs } from "@/lib/userAuth";

// Journalise l'acceptation des CGU et de la politique de données lors de la
// création d'un compte (case cochée sur la page de connexion), puis envoie
// le mail de bienvenue (template validé le 23/10/2026) : une seule fois par
// compte, depuis bienvenue@dataparl.fr.

export async function POST(req: Request) {
  const user = await utilisateur(req);
  if (!user) return NextResponse.json({ error: "non connecté" }, { status: 401 });
  const email = normalizeEmail(user.email!);
  await logConsent(email, "subscribe", "compte");
  // Copie de traçabilité vers le canal Slack #new-user, uniquement pour un
  // compte réellement frais (cette route n'est appelée qu'au moment de la
  // création, mais on borne par sécurité). C'est aussi le point d'envoi du
  // mail de bienvenue : compte frais uniquement, jamais renvoyé.
  const meta = (user.user_metadata ?? {}) as { prenom?: string; nom?: string };
  const identite = [meta.prenom, meta.nom].filter(Boolean).join(" ");
  const frais = Date.now() - new Date(user.created_at ?? 0).getTime() < 24 * 3600_000;
  if (frais) {
    await copieSlack(SLACK_NEW_USER, {
      subject: `Nouveau compte : ${email}`,
      titre: "Nouveau compte",
      corpsHtml: `<p>Nouveau compte créé sur DataParl'.</p><p><strong>${esc(identite || email)}</strong> &lt;${esc(email)}&gt;</p><p>Connexion : ${esc(fournisseurs(user).join(", ") || "email")}</p>`,
      text: `Nouveau compte créé sur DataParl'.\n${identite || email} <${email}>\nConnexion : ${fournisseurs(user).join(", ") || "email"}`,
    });
    await envoyerBienvenue(user.id);
  }
  return NextResponse.json({ ok: true });
}
