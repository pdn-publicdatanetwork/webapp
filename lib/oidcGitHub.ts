import { createPublicKey, createVerify } from "node:crypto";
import { authAdmin } from "@/lib/supabaseAdmin";

// Validation des jetons OIDC GitHub Actions (audience « dataparl-ci ») :
// même architecture zéro-secret GitHub que les routes /api/cron/ci-jeton et
// /api/cron/heartbeat. Le workflow appelant prouve son identité par un jeton
// éphémère minté par GitHub ; ici : JWKS GitHub + signature RS256 + claims.
// Le claim job_workflow_ref contient le suffixe « @refs/heads/main » :
// comparer la valeur complète, jamais un préfixe. Le jeton GitHub expire en
// 5 minutes : le workflow le re-minte à chaque essai, aucun cache ici du
// côté des jetons (seul le JWKS est mis en cache, 1 h).

const ISSUER = "https://token.actions.githubusercontent.com";
const AUDIENCE = "dataparl-ci";
const REF_AUTORISE = "refs/heads/main";

export const DEPOT_COLLABORATEURS = "publicdatanetwork-dataparl/collaborateurs";
export const WORKFLOW_SUIVI = ".github/workflows/suivi.yml";
export const WORKFLOW_RATTRAPAGE_ALERTES = ".github/workflows/rattrapage-alertes.yml";

const b64url = (s: string) => Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");

type Jwk = { kid?: unknown; kty?: unknown; n?: unknown; e?: unknown };
let cacheJwks: { cles: Jwk[]; expire: number } | null = null;

export type VerdictOidc =
  | { ok: false; raison: string; claims: Record<string, unknown> }
  | { ok: true; claims: Record<string, unknown> };

// Journalisation best-effort dans ci_jeton_journal (mêmes colonnes que les
// routes ci-jeton/heartbeat) : chaque refus ET chaque OIDC réussi laissent
// une trace. Un appel rejeté ne doit plus jamais être invisible.
export async function journaliserOidc(etat: string, raison: string, claims: Record<string, unknown>): Promise<void> {
  try {
    await authAdmin().from("ci_jeton_journal").insert({ etat, raison, claims });
  } catch {
    // jamais bloquant
  }
}

async function clesJwks(): Promise<Jwk[]> {
  if (cacheJwks && cacheJwks.expire > Date.now()) return cacheJwks.cles;
  const r = await fetch(ISSUER + "/.well-known/jwks", { cache: "no-store" });
  if (!r.ok) throw new Error("JWKS GitHub indisponible");
  const corps = (await r.json()) as { keys?: Jwk[] };
  cacheJwks = { cles: corps.keys ?? [], expire: Date.now() + 3600_000 };
  return cacheJwks.cles;
}

function refus(raison: string, charge: Record<string, unknown>): { ok: false; raison: string; claims: Record<string, unknown> } {
  return { ok: false, raison, claims: charge };
}

export async function verifierJetonsOidc(jetons: string, depot: string, workflows: string[]): Promise<VerdictOidc> {
  const parties = jetons.split(".");
  if (parties.length !== 3 || !parties.every(Boolean)) return refus("format", {});
  const vide: Record<string, unknown> = {};
  let entete: { alg?: unknown; kid?: unknown };
  let charge: Record<string, unknown>;
  try {
    entete = JSON.parse(b64url(parties[0]).toString("utf8"));
    charge = JSON.parse(b64url(parties[1]).toString("utf8"));
  } catch {
    return refus("format-json", vide);
  }
  if (entete.alg !== "RS256" || typeof entete.kid !== "string") return refus("entete", charge);
  let cles: Jwk[];
  try {
    cles = await clesJwks();
  } catch {
    return refus("jwks", charge);
  }
  const jwk = cles.find((c) => c.kid === entete.kid && c.kty === "RSA");
  if (!jwk || typeof jwk.n !== "string" || typeof jwk.e !== "string") return refus("cle-inconnue", charge);
  try {
    const cle = createPublicKey({ key: { kty: "RSA", n: jwk.n, e: jwk.e }, format: "jwk" });
    const signatureValide = createVerify("RSA-SHA256")
      .update(parties[0] + "." + parties[1])
      .verify(cle, b64url(parties[2]));
    if (!signatureValide) return refus("signature", charge);
  } catch {
    return refus("signature-erreur", charge);
  }
  const aud = charge.aud;
  const audOk = aud === AUDIENCE || (Array.isArray(aud) && aud.includes(AUDIENCE));
  if (charge.iss !== ISSUER) return refus("iss", charge);
  if (!audOk) return refus("aud", charge);
  if (typeof charge.exp !== "number" || charge.exp < Math.floor(Date.now() / 1000)) return refus("exp", charge);
  if (charge.repository !== depot) return refus("repository", charge);
  if (charge.ref !== REF_AUTORISE) return refus("ref", charge);
  const acceptes = workflows.map((w) => depot + "/" + w + "@" + REF_AUTORISE);
  if (typeof charge.job_workflow_ref !== "string" || !acceptes.includes(charge.job_workflow_ref)) return refus("workflow", charge);
  return { ok: true, claims: charge };
}
