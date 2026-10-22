import "server-only";
import { authAdmin } from "./supabaseAdmin";
import { randomToken, sha256 } from "./tokens";

// Clés API : « dp_ » + 32 caractères aléatoires. Seule l'empreinte SHA-256 est
// stockée ; la clé en clair n'est montrée qu'une fois, à la création.

export const MAX_CLES = 1;

export async function genererCle(): Promise<{ cle: string; prefixe: string; hash: string }> {
  const cle = `dp_${randomToken(24)}`;
  return { cle, prefixe: cle.slice(0, 10), hash: await sha256(cle) };
}

export function cleDepuisRequete(req: Request): string | null {
  const x = req.headers.get("x-api-key");
  if (x?.startsWith("dp_")) return x.trim();
  const auth = req.headers.get("authorization") ?? "";
  if (auth.startsWith("Bearer dp_")) return auth.slice(7).trim();
  return null;
}

export type Verdict =
  | { ok: true; cleId: string; requetes: number; quota: number }
  | { ok: false; status: 401 | 429 | 503; message: string; requetes?: number; quota?: number };

export async function consommer(req: Request): Promise<Verdict> {
  const cle = cleDepuisRequete(req);
  if (!cle || cle.length > 80) {
    return { ok: false, status: 401, message: "clé API requise : en-tête Authorization: Bearer <clé> (gratuite, à demander sur https://api.dataparl.fr/request-access)" };
  }
  const { data, error } = await authAdmin().rpc("api_consommer", { p_hash: await sha256(cle) });
  if (error || !data?.[0]) return { ok: false, status: 503, message: "vérification de la clé impossible, réessaie" };
  const r = data[0] as { ok: boolean; cle_valide: boolean; requetes: number; quota: number; cle_id: string | null };
  if (!r.cle_valide) return { ok: false, status: 401, message: "clé API invalide ou révoquée" };
  if (!r.ok) return { ok: false, status: 429, message: "quota du jour atteint, remise à zéro à minuit (heure de Paris)", requetes: r.requetes, quota: r.quota };
  return { ok: true, cleId: r.cle_id!, requetes: r.requetes, quota: r.quota };
}
