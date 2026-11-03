import { inscritAlerte } from "@/lib/firestore";

export const dynamic = "force-dynamic";

// Inscription aux alertes emplois : les abonnés sont lus par la collecte
// qui envoie les nouvelles offres validées. Validation manuelle (pas de zod).

export async function POST(req: Request) {
  const corps = await req.json().catch(() => null);
  const email = typeof corps?.email === "string" ? corps.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 300) {
    return Response.json({ erreur: "adresse e-mail invalide" }, { status: 400 });
  }
  try {
    await inscritAlerte(email);
    return Response.json({ ok: true, message: "Inscription confirmée. À très vite !" });
  } catch {
    return Response.json({ erreur: "inscription impossible pour le moment" }, { status: 500 });
  }
}
