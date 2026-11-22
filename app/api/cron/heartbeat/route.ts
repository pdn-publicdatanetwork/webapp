import { NextResponse } from "next/server";
import { createPublicKey, createVerify } from "node:crypto";
import { authAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Remise des URL de heartbeat Better Stack aux workflows de collecte du repo
// collaborateurs (22/11/2026). Même architecture zéro-secret GitHub que
// /api/cron/ci-jeton : le workflow prouve son identité par jeton OIDC GitHub
// éphémère (audience « dataparl-ci »), cette route valide le jeton (JWKS
// GitHub + claims — le claim job_workflow_ref contient le suffixe
// « @refs/heads/main ») puis sert l'URL du pipeline demandé (?p=…), lue dans
// ci_secrets. Les URL de ping sont des canarys : elles ne vivent QUE dans
// ci_secrets, jamais dans les dépôts GitHub. Le workflow décide lui-même de
// pinger sur succès ou à chaque tentative ; l'absence de ping déclenche
// l'alerte Better Stack après la grâce.

const ISSUER = "https://token.actions.githubusercontent.com";
const AUDIENCE = "dataparl-ci";
const REF_AUTORISE = "refs/heads/main";

const PIPELINES: Record<string, { depot: string; workflow: string; cle: string }> = {
  suivi: {
    depot: "publicdatanetwork-dataparl/collaborateurs",
    workflow: ".github/workflows/suivi.yml",
    cle: "heartbeat_suivi_an_senat",
  },
  pe: {
    depot: "publicdatanetwork-dataparl/collaborateurs",
    workflow: ".github/workflows/suivi-europarl.yml",
    cle: "heartbeat_parlement_europeen",
  },
  jorf: {
    depot: "publicdatanetwork-dataparl/collaborateurs",
    workflow: ".github/workflows/gouvernement-quotidien.yml",
    cle: "heartbeat_jorf",
  },
};

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

async function validerJetonsOidc(jetons: string, pipeline: { depot: string; workflow: string }): Promise<Verdict> {
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
  if (charge.repository !== pipeline.depot) return refus("repository", charge);
  if (charge.ref !== REF_AUTORISE) return refus("ref", charge);
  const attendu = pipeline.depot + "/" + pipeline.workflow + "@" + REF_AUTORISE;
  if (charge.job_workflow_ref !== attendu) return refus("workflow", charge);
  return { ok: true, claims: charge };
}

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams.get("p") ?? "";
  const pipeline = PIPELINES[p];
  if (!pipeline) {
    return NextResponse.json({ error: "pipeline inconnu" }, { status: 400 });
  }
  const jetons = req.headers.get("x-oidc") ?? "";
  if (!jetons) {
    return NextResponse.json({ error: "non autorisé", raison: "absent" }, { status: 401 });
  }
  const verdict = await validerJetonsOidc(jetons, pipeline);
  if (!verdict.ok) {
    await journaliser("refus", "heartbeat " + p + " : " + verdict.raison, verdict.claims);
    return NextResponse.json({ error: "non autorisé", raison: verdict.raison }, { status: 401 });
  }
  await journaliser("heartbeat", "ok " + p, verdict.claims);
  const { data, error } = await authAdmin()
    .from("ci_secrets")
    .select("valeur")
    .eq("cle", pipeline.cle)
    .maybeSingle();
  if (error || !data?.valeur) {
    await journaliser("secret-indisponible", pipeline.cle, {});
    return NextResponse.json({ error: "heartbeat indisponible" }, { status: 503 });
  }
  return NextResponse.json({ url: data.valeur });
}
