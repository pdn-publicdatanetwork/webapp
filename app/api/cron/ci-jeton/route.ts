import { NextResponse } from "next/server";
import { createPublicKey, createVerify } from "node:crypto";
import { authAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Remise du jeton GitLab à la CI Jobs (workflows GitHub « Collecte Jobs » et
// « Promo Daily Jobs » du repo pdn-publicdatanetwork/webapp, dépôt PUBLIC).
// Le workflow ne porte AUCUN secret GitHub : il prouve son identité avec un
// jeton OIDC éphémère signé par GitHub (permissions: id-token: write,
// audience « dataparl-ci »). Cette route valide ce jeton (signature via les
// JWKS de GitHub + contrôles de claims ci-dessous) puis renvoie le PAT GitLab
// lu dans la table ci_secrets du projet dataparl-auth (service_role
// uniquement). Rotation future du PAT : POST /personal_access_tokens/:id/rotate
// côté GitLab puis mise à jour de la ligne SQL, rien d'autre (ni GitHub, ni
// ce fichier, ni Vercel).
//
// Chaque appel portant un jeton est tracé dans public.ci_jeton_journal
// (etat ok/refus, raison détaillée, claims reçus) pour diagnostiquer un refus
// sans accès aux logs GitHub Actions. Le journal ne doit jamais faire
// échouer la remise.

const ISSUER = "https://token.actions.githubusercontent.com";
const AUDIENCE = "dataparl-ci";
const REPO = "pdn-publicdatanetwork/webapp";
const PREFIXE_WORKFLOW = "pdn-publicdatanetwork/webapp/.github/workflows/";
const REF_AUTORISE = "refs/heads/main";

const b64url = (s: string) => Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");

type Jwk = { kid?: unknown; kty?: unknown; n?: unknown; e?: unknown };
let cacheJwks: { cles: Jwk[]; expire: number } | null = null;

type Refus = { ok: false; raison: string; claims: Record<string, unknown> };
type Verdict = Refus | { ok: true; claims: Record<string, unknown> };

async function journaliser(etat: string, raison: string, claims: Record<string, unknown>): Promise<void> {
  try {
    await authAdmin().from("ci_jeton_journal").insert({ etat, raison, claims });
  } catch {
    // jamais bloquant
  }
}

async function clesJwks(): Promise<Jwk[]> {
  if (cacheJwks && cacheJwks.expire > Date.now()) return cacheJwks.cles;
  const r = await fetch(`${ISSUER}/.well-known/jwks.json`, { cache: "no-store" });
  if (!r.ok) throw new Error("JWKS GitHub indisponible");
  const corps = (await r.json()) as { keys?: Jwk[] };
  cacheJwks = { cles: corps.keys ?? [], expire: Date.now() + 3600_000 };
  return cacheJwks.cles;
}

function refus(raison: string, charge: Record<string, unknown>): Refus {
  return { ok: false, raison, claims: charge };
}

async function validerJetonsOidc(jetons: string): Promise<Verdict> {
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
      .update(`${parties[0]}.${parties[1]}`)
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
  if (charge.repository !== REPO) return refus("repository", charge);
  if (charge.ref !== REF_AUTORISE) return refus("ref", charge);
  if (typeof charge.job_workflow_ref !== "string" || !charge.job_workflow_ref.startsWith(PREFIXE_WORKFLOW)) {
    return refus("job_workflow_ref", charge);
  }
  return { ok: true, claims: charge };
}

export async function GET(req: Request) {
  const jetons = req.headers.get("x-oidc") ?? "";
  if (!jetons) {
    return NextResponse.json({ error: "non autorisé", raison: "absent" }, { status: 401 });
  }
  const verdict = await validerJetonsOidc(jetons);
  if (!verdict.ok) {
    await journaliser("refus", verdict.raison, verdict.claims);
    return NextResponse.json({ error: "non autorisé", raison: verdict.raison }, { status: 401 });
  }
  await journaliser("ok", "", verdict.claims);
  const { data, error } = await authAdmin()
    .from("ci_secrets")
    .select("valeur")
    .eq("cle", "gitlab_token_jobs")
    .maybeSingle();
  if (error || !data?.valeur) {
    await journaliser("secret-indisponible", "ci_secrets", {});
    return NextResponse.json({ error: "secret CI indisponible" }, { status: 503 });
  }
  return NextResponse.json({ token: data.valeur });
}
