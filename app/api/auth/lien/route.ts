import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authFirebase } from "@/lib/firebaseAuthAdmin";
import { controleEmail } from "@/lib/antiAbus";
import { expedier } from "@/lib/mail";
import { SITE_URL } from "@/lib/env";

// Lien magique : généré par le SDK admin (jamais un lien @firebaseapp.com) et
// envoyé par notre relais depuis bienvenue@dataparl.fr. Anti-abus : filtre
// controleEmail + Turnstile si la secret key est configurée (absente = pas de
// captcha, comme avant la bascule où Supabase le vérifiait de son côté).
// Le lien ramène sur l'origine qui l'a demandée (www, api, media), suite
// comprise, la session est posée sur .dataparl.fr pour tous les sous-domaines.

const EMAIL_EQUIPE = "theo@dataparl.fr";
const Corps = z.object({
  email: z.string().min(5).max(200),
  suite: z.string().max(300).optional(),
  captchaToken: z.string().max(3000).optional(),
});

export async function POST(req: Request) {
  const corps = Corps.safeParse(await req.json().catch(() => null));
  if (!corps.success) return NextResponse.json({ error: "adresse invalide" }, { status: 400 });
  let email = corps.data.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return NextResponse.json({ error: "adresse invalide" }, { status: 400 });
  if (email.endsWith("@dataparl.fr")) email = EMAIL_EQUIPE;

  if (controleEmail(email).suspect) return NextResponse.json({ error: "demande refusée" }, { status: 400 });

  const cleTurnstile = process.env.TURNSTILE_SECRET_KEY;
  if (cleTurnstile) {
    if (!corps.data.captchaToken) return NextResponse.json({ error: "vérification de sécurité manquante" }, { status: 400 });
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: cleTurnstile, response: corps.data.captchaToken }),
    }).catch(() => null);
    if (!r?.ok || !(await r.json().catch(() => ({}))).success) {
      return NextResponse.json({ error: "vérification de sécurité échouée" }, { status: 400 });
    }
  }

  const suite = corps.data.suite && corps.data.suite.startsWith("/") && !corps.data.suite.startsWith("//") ? corps.data.suite : "/mon-compte";
  const origine = (req.headers.get("origin") ?? SITE_URL).replace(/\/$/, "");
  const lien = await authFirebase().generateSignInWithEmailLink(email, {
    url: `${origine}/connexion?suite=${encodeURIComponent(suite)}`,
    handleCodeInApp: true,
  });

  await expedier({
    from: "bienvenue@dataparl.fr",
    to: [email],
    subject: "Ton lien de connexion DataParl'",
    titre: "Ton lien de connexion",
    type: "transactionnel",
    corpsHtml:
      "<p style=\"margin:0 0 16px\">Clique sur ce bouton pour accéder à ton espace DataParl'. Le lien est à usage unique et expire dans une heure.</p>" +
      `<p style="margin:32px 0;text-align:center\"><a href="${lien}\" style="display:inline-block;background:#1a3f6f;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none\">Accéder à mon espace</a></p>` +
      "<p style=\"margin:0 0 8px;font-size:13px;color:#666\">Si le bouton ne s'affiche pas : <a href=\"" + lien + "\">ouvrir le lien</a></p>" +
      "<p style=\"margin:0;font-size:13px;color:#666\">Si tu n'es pas à l'origine de cette demande, ignore ce message.</p>",
    text: `Accéder à ton espace DataParl' : ${lien}\n\nLe lien est à usage unique et expire dans une heure. Si tu n'es pas à l'origine de cette demande, ignore ce message.`,
  });

  return NextResponse.json({ ok: true });
}
