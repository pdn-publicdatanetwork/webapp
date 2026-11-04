import { verifierHumain } from "@/lib/turnstile";

export const dynamic = "force-dynamic";

// Contact DataParl' Jobs : proxy vers la même destination que dataparl.fr/contact
// (API du site principal : webmail, accusé de réception, Slack, boîte équipe).

export async function POST(req: Request) {
  const c = (await req.json().catch(() => null)) ?? {};
  const texte = (x: unknown, max: number) => (typeof x === "string" ? x.trim().slice(0, max) : "");
  const corps = {
    prenom: texte(c.prenom, 80),
    nom: texte(c.nom, 80),
    email: texte(c.email, 254).toLowerCase(),
    sujet: texte(c.sujet, 40),
    message: texte(c.message, 5000),
    site: texte(c.site, 200),
  };
  if (!corps.prenom || !corps.nom || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(corps.email) || corps.message.length < 5) {
    return Response.json({ error: "Vérifie les champs : tous sont obligatoires, avec une adresse e-mail valide." }, { status: 400 });
  }
  if (!(await verifierHumain(c.turnstile))) {
    return Response.json({ error: "Confirmez la vérification anti-robot." }, { status: 400 });
  }
  try {
    const res = await fetch("https://www.dataparl.fr/api/contact", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(corps),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      return Response.json({ error: j?.error ?? "Envoi impossible, réessaie plus tard." }, { status: res.status });
    }
    return Response.json({ message: j?.message ?? "Merci, votre message est bien arrivé. On vous répond par e-mail." });
  } catch {
    return Response.json({ error: "Envoi impossible, réessaie plus tard." }, { status: 500 });
  }
}
