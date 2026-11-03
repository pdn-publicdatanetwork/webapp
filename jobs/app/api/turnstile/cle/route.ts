import { cleTurnstile } from "@/lib/turnstile";

export const dynamic = "force-dynamic";

// Petite route pour que le widget client récupère la clé publique
// Turnstile sans qu'elle soit posée en variable NEXT_PUBLIC.

export function GET() {
  return Response.json({ cle: cleTurnstile() });
}
