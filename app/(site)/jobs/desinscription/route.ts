import { createHmac, timingSafeEqual } from "crypto";
import { desinscritAlerte } from "@/lib/jobsFirestore";

export const dynamic = "force-dynamic";

// Désinscription aux alertes emplois : lien signé présent dans les e-mails
// envoyés par la collecte GitLab (collection alert_subscriptions). Le jeton
// est constitué des 32 premiers caractères hexadécimaux du HMAC-SHA256 de
// l'adresse e-mail, calculé avec APP_SECRET (même valeur que la variable du
// projet GitLab de la collecte).

const page = (titre: string, texte: string) =>
  new Response(
    "<!doctype html><html lang=\"fr\"><head><meta charset=\"utf-8\">" +
      "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">" +
      "<title>" + titre + "</title></head>" +
      "<body style=\"font-family:system-ui,sans-serif;max-width:560px;margin:48px auto;padding:0 16px;line-height:1.6;color:#071A41\">" +
      "<h1>" + titre + "</h1><p>" + texte + "</p>" +
      "<p><a href=\"/jobs\">Voir les offres d'emploi</a></p></body></html>",
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = (searchParams.get("email") ?? "").toLowerCase().trim();
  const jeton = searchParams.get("jeton") ?? "";
  const secret = process.env.APP_SECRET ?? "";
  if (!email || !jeton || !secret)
    return page("Lien invalide", "Ce lien de désinscription est incomplet ou expiré.");
  const attendu = createHmac("sha256", secret).update(email).digest("hex").slice(0, 32);
  const a = Buffer.from(jeton);
  const b = Buffer.from(attendu);
  if (a.length !== b.length || !timingSafeEqual(a, b))
    return page("Lien invalide", "Ce lien de désinscription est incomplet ou expiré.");
  try {
    await desinscritAlerte(email);
  } catch {
    return page("Désinscription impossible", "Une erreur est survenue, réessayez dans quelques instants.");
  }
  return page(
    "Désinscription enregistrée",
    "Vous ne recevrez plus les alertes d'offres d'emploi de DataParl'.",
  );
}
