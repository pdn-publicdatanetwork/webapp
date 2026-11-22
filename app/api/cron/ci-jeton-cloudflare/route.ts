import { NextResponse } from "next/server";
import { createPublicKey, createVerify } from "node:crypto";
import { authAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Remise des identifiants Cloudflare au workflow « Deploy Cloudflare Workers »
// (migration Vercel -> Cloudflare Workers, 22/11/2026). Même architecture
// zéro-secret GitHub que /api/cron/ci-jeton : le workflow prouve son identité
// par jeton OIDC GitHub éphémère (audience « dataparl-ci »), cette route valide
// le jeton (JWKS GitHub + claims — NOTE: le claim job_workflow_ref envoyé par
// GitHub contient le suffixe « @refs/heads/main ») puis sert selon
// ?app=www|jobs :
//   - token API Cloudflare : ci_secrets.cle « cloudflare_deploy_token »,
//   - account id : ci_secrets.cle « cloudflare_account_id »,
//   - variables de build NEXT_PUBLIC_* (JSON) : « cloudflare_build_vars_www »
//     ou « cloudflare_build_vars_jobs », intégrées au bundle par le build.
// Rotation du token : nouvelle valeur dans la ligne SQL, rien d'autre.
// Les secrets d'exécution (Supabase, Resend…) ne passent PAS par ici : ils
// sont posés directement sur les Workers via l'API Cloudflare.

const ISSUER = "https://token.actions.githubusercontent.com";
const AUDIENCE = "dataparl-ci";
const REPO = "pdn-publicdatanetwork/webapp";
const REF_AUTORISE = "refs/heads/main";
const WORKFLOW_DEPLOY = "pdn-publicdatanetwork/webapp/.github/workflows/deploy-cloudflare.yml@refs/heads/main";

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
  const r = await fetch(ISSUER + "/.well-known/jwks", { cache: "no-store" });
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
  if (charge.repository !== REPO) return refus("repository", charge);
  if (charge.ref !== REF_AUTORISE) return refus("ref", charge);
  if (charge.job_workflow_ref !== WORKFLOW_DEPLOY) return refus("workflow", charge);
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
  const app = new URL(req.url).searchParams.get("app") === "jobs" ? "jobs" : "www";
  const { data, error } = await authAdmin()
    .from("ci_secrets")
    .select("cle,valeur")
    .in("cle", ["cloudflare_deploy_token", "cloudflare_account_id", "cloudflare_build_vars_" + app]);
  if (error) {
    await journaliser("secret-indisponible", "ci_secrets: " + error.message, {});
    return NextResponse.json({ error: "secret CI indisponible" }, { status: 503 });
  }
  const parCle = new Map((data ?? []).map((l: { cle: string; valeur: string }) => [l.cle, l.valeur] as const));
  const token = parCle.get("cloudflare_deploy_token");
  const account = parCle.get("cloudflare_account_id");
  const buildVarsTexte = parCle.get("cloudflare_build_vars_" + app);
  if (!token || !account || !buildVarsTexte) {
    await journaliser("secret-indisponible", "ligne(s) cloudflare manquante(s) pour " + app, {});
    return NextResponse.json({ error: "secret CI indisponible" }, { status: 503 });
  }
  let buildVars: Record<string, string>;
  try {
    buildVars = JSON.parse(buildVarsTexte);
  } catch {
    await journaliser("secret-indisponible", "cloudflare_build_vars_" + app + " n'est pas un JSON valide", {});
    return NextResponse.json({ error: "secret CI indisponible" }, { status: 503 });
  }
  return NextResponse.json({ token, account_id: account, build_vars: buildVars });
}
