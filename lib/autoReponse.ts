// Faut-il envoyer un accusé de réception automatique à un email reçu ?
// Règle du 14/11/2026 : réponse auto PAR EXCEPTION (liste blanche).
// On ne répond qu'aux personnes identifiées : collaborateurs de l'AN
// (clb-an.fr, flux ASSOC compris) et users connus. Tout le reste reste
// silencieux (Google, DMARC, bounces, newsletters, fournisseurs…).
// Les scams confirmés sont bloqués et ne reçoivent jamais de réponse.
// Sans dépendance (testé).

export type Entrant = { from: string; subject: string; headers: Record<string, string> };

// Scams confirmés le 14/11/2026 : silence total, jamais de réponse.
const SCAMS = new Set(["debicamil@gmail.com"]);
const DOMAINES_SCAM = ["coinn.trade"];

// Personnes autorisées : users confirmés de DataParl'.
const PERSONNES = new Set(["dmitri.pozniak@sinch.com"]);

// Collaborateurs de l'Assemblée nationale : flux ASSOC et écrits directs.
const DOMAINE_COLLABS_AN = "@clb-an.fr";

export function entetes(brut: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (Array.isArray(brut)) {
    for (const h of brut) if (h && typeof h === "object" && "name" in h) out[String(h.name).toLowerCase()] = String((h as { value?: unknown }).value ?? "");
  } else if (brut && typeof brut === "object") {
    for (const [k, v] of Object.entries(brut)) out[k.toLowerCase()] = Array.isArray(v) ? v.join(", ") : String(v);
  }
  return out;
}

export function adresseNue(s: string): string {
  const m = s.match(/<([^>]+)>/);
  return (m ? m[1] : s).trim().toLowerCase();
}

export function estScam(de: string): boolean {
  return SCAMS.has(de) || DOMAINES_SCAM.some((d) => de.endsWith("@" + d) || de.endsWith("." + d));
}

export function doitRepondre(e: Entrant): boolean {
  const de = adresseNue(e.from);
  if (!de.includes("@")) return false;
  if (estScam(de)) return false;
  if (PERSONNES.has(de)) return true;
  if (de.endsWith(DOMAINE_COLLABS_AN)) return true;
  // Règle par défaut : silence (décision du 14/11/2026).
  return false;
}
