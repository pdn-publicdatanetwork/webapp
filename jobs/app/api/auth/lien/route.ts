import { NextResponse } from "next/server";
import { verifierHumain } from "@/lib/turnstile";

// Envoi du lien magique de connexion (e-mail link Firebase, projet
// dataparl-auth). Le code est généré par l'API REST identitytoolkit :
// c'est Firebase qui envoie le message via le SMTP Resend configuré en
// console (expéditeur bienvenue@dataparl.fr), aucune infrastructure mail
// côté jobs. Turnstile protège le formulaire (optionnel : sans secret
// configuré, la vérification est passée). Validation manuelle (pas de zod).

export const dynamic = "force-dynamic";

const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_AUTH_API_KEY ?? "AIzaSyCtHIiGOh72ypE9vHAScrE60beU7VwD2NA";
const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req: Request) {
  const corps = (await req.json().catch(() => null)) as { email?: unknown; suite?: unknown; jeton?: unknown } | null;
  const email = typeof corps?.email === "string" ? corps.email.trim().toLowerCase() : "";
  if (email.length < 5 || email.length > 254 || !RE_EMAIL.test(email)) {
    return NextResponse.json({ erreur: "adresse e-mail invalide" }, { status: 400 });
  }
  let suite = typeof corps?.suite === "string" && corps.suite.startsWith("/") ? corps.suite : "/";
  if (suite.length > 200) suite = "/";
  const jeton = typeof corps?.jeton === "string" ? corps.jeton.slice(0, 4096) : "";

  if (!(await verifierHumain(jeton))) {
    return NextResponse.json({ erreur: "vérification anti-robot échouée, réessayez" }, { status: 400 });
  }

  let origine = req.headers.get("origin") ?? "https://jobs.dataparl.fr";
  if (!/^https:\/\/([\w-]+\.)?dataparl\.fr$/.test(origine)) origine = "https://jobs.dataparl.fr";
  // Porte unique : le lien atterrit sur auth.dataparl.fr, qui finalise le
  // lien magique puis ramène sur jobs (?suite=).
  const continueUrl = `https://auth.dataparl.fr/?hote=jobs.dataparl.fr&suite=${encodeURIComponent(suite)}`;

  try {
    const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestType: "EMAIL_SIGNIN", email, continueUrl }),
    });
    if (!r.ok) {
      return NextResponse.json({ erreur: "envoi impossible pour le moment" }, { status: 502 });
    }
  } catch {
    return NextResponse.json({ erreur: "envoi impossible pour le moment" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
