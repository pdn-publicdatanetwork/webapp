import { NextResponse } from "next/server";
import { createPublicKey, createVerify } from "node:crypto";
import { authAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const runtime = "nodejs";

// Pousser les secrets runtime vers les Workers Cloudflare (migration 22/11/2026).
// Les valeurs sensibles ne sont lisibles ni par l API Vercel ni par le pull non
// interactif : seule la webapp Vercel les connait en execution. Meme garde que
// /api/cron/ci-jeton-cloudflare : jeton OIDC GitHub (audience « dataparl-ci »)
// valide (JWKS + claims), workflow autorise = env-push-cloudflare.yml sur main.
// La route lit process.env, pousse chaque secret via l API Cloudflare
// (PUT .../workers/scripts/{worker}/secrets) et ne renvoie JAMAIS de valeurs :
// uniquement des noms et des statuts. Journal : ci_jeton_journal.
// A SUPPRIMER apres validation de la bascule (rollback = supprimer la route).

const ISSUER = "https://token.actions.githubusercontent.com";
const AUDIENCE = "dataparl-ci";
const REPO = "pdn-publicdatanetwork/webapp";
const REF_AUTORISE = "refs/heads/main";
const WORKFLOW_AUTORISE = "pdn-publicdatanetwork/webapp/.github/workflows/env-push-cloudflare.yml@refs/heads/main";

const WORKER_WWW = "dataparl";
const WORKER_JOBS = "dataparl-jobs";

// Secrets www (Worker « dataparl ») : les 37 declares chez Vercel + Turnstile.
const SECRETS_WWW = [
  "ADMIN_GITHUB_LOGINS",
  "ADMIN_OTP_SECRET",
  "ADMIN_VAULT_KEY",
  "APPLIXIR_SECRET",
  "APP_SECRET",
  "AUTH_SUPABASE_SERVICE_ROLE_KEY",
  "BETTERSTACK_API_KEY",
  "BETTERSTACK_HEARTBEAT_URL",
  "BUFFER_API_KEY",
  "CLE_EXTRACTION_CV",
  "CONSENT_SALT",
  "CRON_SECRET",
  "DATA_SUPABASE_SERVICE_ROLE_KEY",
  "FIREBASE_AUTH_SERVICE_ACCOUNT",
  "FIREBASE_SERVICE_ACCOUNT",
  "MAINTENANCE_TOKEN",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "NOTION_DATABASE_ID",
  "NOTION_TOKEN",
  "PAPPERS_API_KEY",
  "RESEND_API_KEY",
  "RESEND_WEBHOOK_SECRET",
  "SENTRY_AUTH_TOKEN",
  "SENTRY_DSN",
  "SLACK_BOT_TOKEN",
  "SLACK_CONTACT",
  "SLACK_MAILAPP_BOT_TOKEN",
  "SLACK_MAINTENANCE",
  "SLACK_NEW_USER",
  "SLACK_WEBHOOK_URL",
  "STRIPE_MCP_KEY",
  "STRIPE_PUBLISHABLE_KEY",
  "STRIPE_SECRET_KEY",
  "TELEGRAM_BOT_TOKEN",
  "TURNSTILE_SECRET_KEY",
  "UPTIMEROBOT_API_KEY",
  "dataparl_API_key",
  "mediadataparl_api_key",
];

// Secrets jobs (Worker « dataparl-jobs »).
const SECRETS_JOBS = [
  "FIREBASE_AUTH_SERVICE_ACCOUNT",
  "FIREBASE_SERVICE_ACCOUNT",
  "SUPABASE_SERVICE_ROLE_KEY",
  "TURNSTILE_SECRET_KEY",
  "TURNSTILE_SITE_KEY",
];

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
  if (charge.job_workflow_ref !== WORKFLOW_AUTORISE) return refus("workflow", charge);
  return { ok: true, claims: charge };
}

function lireEnv(nom: string): string | null {
  const direct = process.env[nom];
  if (direct && direct !== "null") return direct;
  const cle = Object.keys(process.env).find((c) => c.toUpperCase() === nom.toUpperCase());
  const v = cle ? process.env[cle] : undefined;
  return v && v !== "null" ? v : null;
}

type Resultat = { ok: number; absents: string[]; erreurs: { nom: string; statut: number }[] };

export async function GET(req: Request) {
  const jetons = req.headers.get("x-oidc") ?? "";
  if (!jetons) {
    return NextResponse.json({ error: "non autorise", raison: "absent" }, { status: 401 });
  }
  const verdict = await validerJetonsOidc(jetons);
  if (!verdict.ok) {
    await journaliser("refus", verdict.raison, verdict.claims);
    return NextResponse.json({ error: "non autorise", raison: verdict.raison }, { status: 401 });
  }
  const { data, error } = await authAdmin()
    .from("ci_secrets")
    .select("cle,valeur")
    .in("cle", ["cloudflare_deploy_token", "cloudflare_account_id", "cloudflare_build_vars_www"]);
  if (error || !data) {
    await journaliser("secret-indisponible", "ci_secrets: " + (error?.message ?? "?"), verdict.claims);
    return NextResponse.json({ error: "secret CI indisponible" }, { status: 503 });
  }
  const parCle = new Map((data ?? []).map((l: { cle: string; valeur: string }) => [l.cle, l.valeur] as const));
  const token = parCle.get("cloudflare_deploy_token");
  const account = parCle.get("cloudflare_account_id");
  if (!token || !account) {
    await journaliser("secret-indisponible", "ligne(s) cloudflare manquante(s)", verdict.claims);
    return NextResponse.json({ error: "secret CI indisponible" }, { status: 503 });
  }
  async function pousser(worker: string, noms: string[]): Promise<Resultat> {
    const res: Resultat = { ok: 0, absents: [], erreurs: [] };
    for (let i = 0; i < noms.length; i += 8) {
      const tranche = noms.slice(i, i + 8);
      await Promise.all(tranche.map(async (nom) => {
        const valeur = lireEnv(nom);
        if (!valeur) { res.absents.push(nom); return; }
        try {
          const url = "https://api.cloudflare.com/client/v4/accounts/" + account + "/workers/scripts/" + worker + "/secrets";
          const r = await fetch(url, {
            method: "PUT",
            headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
            body: JSON.stringify({ name: nom, text: valeur, type: "secret_text" }),
          });
          if (r.status === 200 || r.status === 201) res.ok += 1; else res.erreurs.push({ nom, statut: r.status });
        } catch {
          res.erreurs.push({ nom, statut: 0 });
        }
      }));
    }
    return res;
  }
  const www = await pousser(WORKER_WWW, SECRETS_WWW);
  const jobs = await pousser(WORKER_JOBS, SECRETS_JOBS);
  let buildVarsMaj = false;
  const stripe = lireEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
  const bvTexte = parCle.get("cloudflare_build_vars_www") ?? "{}";
  if (stripe) {
    try {
      const bv = JSON.parse(bvTexte) as Record<string, string>;
      bv["NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"] = stripe;
      const maj = await authAdmin().from("ci_secrets").update({ valeur: JSON.stringify(bv) }).eq("cle", "cloudflare_build_vars_www");
      buildVarsMaj = !maj.error;
    } catch {
      buildVarsMaj = false;
    }
  }
  const resume = "www ok=" + www.ok + " absents=" + www.absents.length + " erreurs=" + www.erreurs.length
    + " ; jobs ok=" + jobs.ok + " absents=" + jobs.absents.length + " erreurs=" + jobs.erreurs.length
    + " ; build_vars_maj=" + buildVarsMaj;
  await journaliser("env-push", resume, verdict.claims);
  return NextResponse.json({ ok: true, resume, www, jobs, build_vars_maj: buildVarsMaj });
}
