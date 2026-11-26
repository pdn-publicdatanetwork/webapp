import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authFirebase } from "@/lib/firebaseAuthAdmin";
import { controleEmail } from "@/lib/antiAbus";
import { expedier } from "@/lib/mail";
import { authAdmin } from "@/lib/supabaseAdmin";
import { SITE_URL } from "@/lib/env";

// Lien magique : généré par le SDK admin (jamais un lien @firebaseapp.com) et
// envoyé par notre relais depuis bienvenue@dataparl.fr. Anti-abus : filtre
// controleEmail + Turnstile si la secret key est configurée (absente = pas de
// captcha, comme avant la bascule où Supabase le vérifiait de son côté).
// Le lien ramène sur l'origine qui l'a demandée (www, api, media), suite
// comprise, la session est posée sur .dataparl.fr pour tous les sous-domaines.
// Depuis la porte unique auth.dataparl.fr (Firebase Hosting), appelée en
// cross-origin (CORS limité à cette origine) : le lien ramène sur la porte
// elle-même, avec l'hôte d'origine (?hote=) pour la redirection finale.
// Traçabilité : chaque demande (réussie ou refusée) est consignée dans
// public.journal_liens_connexion (IP, user-agent, hôte, origine) pour
// identifier l'origine des envois, base aussi de l'anti-abus.

const EMAIL_EQUIPE = "pdn@dataparl.fr";
const PORTE_AUTH = "https://auth.dataparl.fr";
const RE_HOTE = /^[\w-]+(\.[\w-]+)*\.dataparl\.fr$/;
const Corps = z.object({
  email: z.string().min(5).max(200),
  suite: z.string().max(300).optional(),
  hote: z.string().max(100).optional(),
  captchaToken: z.string().max(3000).optional(),
});

function corsAuth(req: Request): Record<string, string> {
  return req.headers.get("origin") === PORTE_AUTH
    ? {
        "Access-Control-Allow-Origin": PORTE_AUTH,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
        Vary: "Origin",
      }
    : {};
}

// Best effort : un échec d'écriture ne bloque jamais la demande de lien.
async function journaliser(req: Request, email: string, hote: string, evenement: string, reussi: boolean) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      null;
    await authAdmin().from("journal_liens_connexion").insert({
      site: "www",
      email,
      ip,
      agent: req.headers.get("user-agent")?.slice(0, 400) ?? null,
      hote,
      origine: req.headers.get("origin") ?? null,
      evenement,
      reussi,
    });
  } catch {
    // traçabilité best effort : jamais bloquante
  }
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: corsAuth(req) });
}

export async function POST(req: Request) {
  const cors = corsAuth(req);
  const corps = Corps.safeParse(await req.json().catch(() => null));
  if (!corps.success) return NextResponse.json({ error: "adresse invalide" }, { status: 400, headers: cors });
  let email = corps.data.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return NextResponse.json({ error: "adresse invalide" }, { status: 400, headers: cors });
  if (email.endsWith("@dataparl.fr")) email = EMAIL_EQUIPE;
  const hote = corps.data.hote && RE_HOTE.test(corps.data.hote) ? corps.data.hote : "www.dataparl.fr";

  if (controleEmail(email).suspect) {
    await journaliser(req, email, hote, "refus_controle", false);
    return NextResponse.json({ error: "demande refusée" }, { status: 400, headers: cors });
  }

  // F2 (audit du 26/11) : captcha OBLIGATOIRE, y compris si le secret
  // n'est pas configuré (fail-closed) : jamais de lien sans vérification.
  const cleTurnstile = process.env.TURNSTILE_SECRET_KEY;
  if (!cleTurnstile) {
    await journaliser(req, email, hote, "captcha_indisponible", false);
    return NextResponse.json({ error: "vérification de sécurité indisponible" }, { status: 503, headers: cors });
  }
  {
    if (!corps.data.captchaToken) {
      await journaliser(req, email, hote, "captcha_manquant", false);
      return NextResponse.json({ error: "vérification de sécurité manquante" }, { status: 400, headers: cors });
    }
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: cleTurnstile, response: corps.data.captchaToken }),
    }).catch(() => null);
    if (!r?.ok || !(await r.json().catch(() => ({}))).success) {
      await journaliser(req, email, hote, "captcha_echoue", false);
      return NextResponse.json({ error: "vérification de sécurité échouée" }, { status: 400, headers: cors });
    }
  }

  const suite = corps.data.suite && corps.data.suite.startsWith("/") && !corps.data.suite.startsWith("//") ? corps.data.suite : "/mon-compte";
  const origine = (req.headers.get("origin") ?? SITE_URL).replace(/\/$/, "");
  // Porte unique : le lien atterrit sur la porte (elle finalise le lien
  // magique, pose le cookie .dataparl.fr puis ramène sur l'hôte demandé).
  const url = origine === PORTE_AUTH
    ? `${PORTE_AUTH}/?hote=${hote}&suite=${encodeURIComponent(suite)}`
    : `${origine}/connexion?suite=${encodeURIComponent(suite)}`;
  const lien = await authFirebase().generateSignInWithEmailLink(email, {
    url,
    handleCodeInApp: true,
  });

  try {
    await expedier({
      from: "bienvenue@dataparl.fr",
      to: [email],
      subject: "Ton lien de connexion DataParl'",
      titre: "Ton lien de connexion",
      type: "transactionnel",
      corpsHtml:
        "<p style=\"margin:0 0 16px\">Clique sur ce bouton pour accéder à ton espace DataParl'. Le lien est à usage unique et expire dans une heure.</p>" +
        `<p style="margin:32px 0;text-align:center"><a href="${lien}" style="display:inline-block;background:#1a3f6f;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none">Accéder à mon espace</a></p>` +
        "<p style=\"margin:0 0 8px;font-size:13px;color:#666\">Si le bouton ne s'affiche pas : <a href=\"" + lien + "\">ouvrir le lien</a></p>" +
        "<p style=\"margin:0;font-size:13px;color:#666\">Si tu n'es pas à l'origine de cette demande, ignore ce message.</p>",
      text: `Accéder à ton espace DataParl' : ${lien}\n\nLe lien est à usage unique et expire dans une heure. Si tu n'es pas à l'origine de cette demande, ignore ce message.`,
    });
  } catch {
    await journaliser(req, email, hote, "erreur_envoi", false);
    throw new Error("envoi impossible");
  }

  await journaliser(req, email, hote, "envoye", true);
  return NextResponse.json({ ok: true }, { headers: cors });
}
