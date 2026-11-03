import { z } from "zod";
import { inscritAlerte } from "@/lib/jobsFirestore";

export const dynamic = "force-dynamic";

// Inscription aux alertes emplois : les abonnés sont lus par la collecte
// GitLab (script alerte-nouvelles-offres) qui envoie les nouvelles offres
// validées via Resend.

const Corps = z.object({ email: z.string().trim().toLowerCase().email().max(300) });

export async function POST(req: Request) {
  const p = Corps.safeParse(await req.json().catch(() => null));
  if (!p.success) return Response.json({ erreur: "adresse e-mail invalide" }, { status: 400 });
  try {
    await inscritAlerte(p.data.email);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ erreur: "inscription impossible pour le moment" }, { status: 500 });
  }
}
