import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifierHumain } from "@/lib/turnstile";

// Envoi du lien magique de connexion (e-mail link Firebase, projet
// dataparl-auth). Le code est généré par l'API REST identitytoolkit :
// c'est Firebase qui envoie le message via le SMTP Resend configuré en
// console (expéditeur bienvenue@dataparl.fr), aucune infrastructure mail
// côté jobs. Turnstile protège le formulaire (optionnel : sans secret
// configuré, la vérification est passée). Validation manuelle (pas de zod).
// Traçabilité : chaque demande (réussie ou refusée) est consignée dans
// public.journal_liens_connexion (IP, user-agent, hôte, origine).

export const dynamic = "force-dynamic";

const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_AUTH_API_KEY ?? "AIzaSyCtHIiGOh72ypE9vHAScrE60beU7VwD2NA";
const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_SUPABASE_URL ?? "https://kuywydrsfuixppchugpe.supabase.co";

// Best effort : un échec d'écriture ne bloque jamais la demande de lien.
async function journaliser(req: Request, email: string, evenement: string, reussi: boolean) {
  try {
    const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!cle) return;
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      null;
    await createClient(AUTH_URL, cle, { auth: { persistSession: false, autoRefreshToken: false } })
      .from("journal_liens_connexion")
      .insert({
        site: "jobs",
        email,
        ip,
        agent: req.headers.get("user-agent")?.slice(0, 400) ?? null,
        hote: "jobs.dataparl.fr",
        origine: req.headers.get("origin") ?? null,
        evenement,
        reussi,
      });
  } catch {
    // traçabilité best effort : jamais bloquante
  }
}

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
    await journaliser(req, email, "captcha_echoue", false);
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
      await journaliser(req, email, "erreur_envoi", false);
      return NextResponse.json({ erreur: "envoi impossible pour le moment" }, { status: 502 });
    }
  } catch {
    await journaliser(req, email, "erreur_envoi", false);
    return NextResponse.json({ erreur: "envoi impossible pour le moment" }, { status: 502 });
  }
  await journaliser(req, email, "envoye", true);
  return NextResponse.json({ ok: true });
}
