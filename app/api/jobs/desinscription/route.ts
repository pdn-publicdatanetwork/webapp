import { createHash, createHmac, timingSafeEqual } from "crypto";
import { desinscritAlerte } from "@/lib/jobsFirestore";

export const dynamic = "force-dynamic";

// Désinscription aux alertes emplois : lien signé présent dans les e-mails
// « nouvelles offres » (la route /desinscription de jobs.dataparl.fr redirige
// ici en conservant l'adresse et le jeton). Le jeton est constitué des 32
// premiers caractères hexadécimaux du HMAC-SHA256 de l'adresse e-mail.
// Clé : APP_SECRET si le projet Vercel le porte, sinon le sha256 de
// FIREBASE_SERVICE_ACCOUNT (repli utilisé par la route d'envoi
// /api/cron/alertes-jobs tant que APP_SECRET n'est pas posé côté Vercel).
// Les deux clés sont acceptées : un lien ancien reste valide quel que soit
// le secret qui l'a signé. La désinscription écrit dans la collection
// Firestore alert_subscriptions partagée avec l'app jobs (actif: false).

const sha256hex = (s: string) => createHash("sha256").update(s).digest("hex");

const clesPossibles = () =>
  [process.env.APP_SECRET ?? "", sha256hex(process.env.FIREBASE_SERVICE_ACCOUNT ?? "")]
    .filter((c) => c.length > 0 && c !== sha256hex(""));

const page = (titre: string, texte: string) =>
  new Response(
    "<!doctype html><html lang=\"fr\"><head><meta charset=\"utf-8\">" +
      "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">" +
      "<title>" + titre + "</title></head>" +
      "<body style=\"font-family:system-ui,sans-serif;max-width:560px;margin:48px auto;padding:0 16px;line-height:1.6;color:#071A41\">" +
      "<h1>" + titre + "</h1><p>" + texte + "</p>" +
      "<p><a href=\"https://jobs.dataparl.fr\">Voir les offres d'emploi</a></p></body></html>",
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = (searchParams.get("email") ?? "").toLowerCase().trim();
  const jeton = searchParams.get("jeton") ?? "";
  if (!email || !jeton || !clesPossibles().length)
    return page("Lien invalide", "Ce lien de désinscription est incomplet ou expiré.");
  const jetonValide = clesPossibles().some((cle) => {
    const attendu = createHmac("sha256", cle).update(email).digest("hex").slice(0, 32);
    const a = Buffer.from(jeton);
    const b = Buffer.from(attendu);
    return a.length === b.length && timingSafeEqual(a, b);
  });
  if (!jetonValide)
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
