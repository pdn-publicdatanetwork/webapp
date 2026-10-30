import { hashJeton } from "@/lib/mail";
import { authAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Version en ligne d'un email envoyé (lien « consulte-le en ligne »).
// Servie sur mail.dataparl.fr/lire/<jeton> ; seul le hash du jeton est stocké.
const ENTETES = {
  "Content-Type": "text/html; charset=utf-8",
  "Content-Security-Policy": "default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
  "Cache-Control": "private, no-store",
};

const introuvable = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Email introuvable, DataParl'</title></head>
<body style="margin:0;background:#FFFDF5;font-family:Arial,Helvetica,sans-serif;color:#071A41;text-align:center;padding:80px 16px">
<p style="font-family:Georgia,serif;font-weight:bold;font-size:24px">Data<span style="background:#FFD23F;padding:0 3px">Parl'</span></p>
<h1 style="font-family:Georgia,serif">Cet email est introuvable</h1>
<p>Le lien est incomplet ou l'email a été supprimé.</p>
<p><a href="https://www.dataparl.fr" style="color:#164DFF">Aller sur DataParl'</a></p></body></html>`;

export async function GET(_req: Request, { params }: { params: Promise<{ jeton: string }> }) {
  const { jeton } = await params;
  if (!/^[a-f0-9]{40}$/.test(jeton)) return new Response(introuvable, { status: 404, headers: ENTETES });
  const { data } = await authAdmin().from("emails").select("body_html").eq("web_token_hash", hashJeton(jeton)).maybeSingle();
  if (!data?.body_html) return new Response(introuvable, { status: 404, headers: ENTETES });
  return new Response(data.body_html as string, { headers: ENTETES });
}
