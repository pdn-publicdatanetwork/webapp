import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse,
  type AuthenticationResponseJSON, type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { secret } from "./env";

type AuthenticatorTransportFuture = NonNullable<NonNullable<Parameters<typeof generateAuthenticationOptions>[0]["allowCredentials"]>[number]["transports"]>[number];
import { authAdmin } from "./supabaseAdmin";

// Clés d'accès (passkeys, WebAuthn) de l'équipe : Touch ID, Face ID,
// empreinte ou code de l'appareil. La vérification de l'utilisateur est
// toujours exigée : une clé d'accès vaut donc deux facteurs (l'appareil et
// la biométrie). Le défi est porté par un cookie signé, valable 5 minutes.
const COOKIE = "dp-wa";
const DUREE_S = 300;
const HOTES = ["admin.dataparl.fr", "webmail.dataparl.fr", "www.dataparl.fr", "dataparl.fr"];

export function contexte(req: Request): { rpID: string; origine: string } | null {
  const hote = (req.headers.get("host") ?? "").toLowerCase();
  const nom = hote.split(":")[0];
  if (HOTES.includes(nom)) return { rpID: "dataparl.fr", origine: `https://${nom}` };
  if (nom === "localhost" && process.env.NODE_ENV !== "production") return { rpID: "localhost", origine: `http://${hote}` };
  return null;
}

const signer = (v: string) => createHmac("sha256", secret("ADMIN_OTP_SECRET")).update(`wa:${v}`).digest("base64url");

export function poserDefi(res: NextResponse, defi: string, lie: string, chemin = "/api/admin/passkeys"): void {
  const v = `${defi}.${lie}.${Math.floor(Date.now() / 1000) + DUREE_S}`;
  res.headers.append("Set-Cookie", `${COOKIE}=${v}.${signer(v)}; Path=${chemin}; Max-Age=${DUREE_S}; HttpOnly; SameSite=Strict; Secure`);
}

// Lit le défi (usage unique : le cookie est effacé par la réponse). `lie` : compte attendu, ou "" à la connexion.
export function lireDefi(req: Request, lie: string): string | null {
  const brut = (req.headers.get("cookie") ?? "").split(";").map((x) => x.trim()).find((x) => x.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  if (!brut) return null;
  const i = brut.lastIndexOf(".");
  const v = brut.slice(0, i), s = brut.slice(i + 1);
  const a = Buffer.from(signer(v)), b = Buffer.from(s);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const [defi, pour, exp] = v.split(".");
  if (pour !== lie || Number(exp) < Date.now() / 1000) return null;
  return defi;
}

export function effacerDefi(res: NextResponse, chemin = "/api/admin/passkeys"): void {
  res.headers.append("Set-Cookie", `${COOKIE}=; Path=${chemin}; Max-Age=0; HttpOnly; SameSite=Strict; Secure`);
}

// Un défi ne sert qu'une fois : rejouer une réponse capturée échoue.
async function consommer(defi: string): Promise<boolean> {
  const db = authAdmin();
  const { error } = await db.from("passkey_defis").insert({ defi });
  db.from("passkey_defis").delete().lt("le", new Date(Date.now() - 3600_000).toISOString()).then(() => {}, () => {});
  return !error;
}

type Ligne = { id: string; user_id: string; credential_id: string; cle_publique: string; compteur: number; transports: string[] };

export async function clesDe(userId: string): Promise<Ligne[]> {
  const { data } = await authAdmin().from("passkeys").select("id, user_id, credential_id, cle_publique, compteur, transports").eq("user_id", userId);
  return (data ?? []) as Ligne[];
}

export async function optionsEnregistrement(rpID: string, a: { userId: string; email: string; github: string }) {
  const existantes = await clesDe(a.userId);
  return generateRegistrationOptions({
    rpName: "DataParl'", rpID, userName: a.email, userDisplayName: a.github, userID: new TextEncoder().encode(a.userId),
    attestationType: "none", excludeCredentials: existantes.map((c) => ({ id: c.credential_id, transports: c.transports as AuthenticatorTransportFuture[] })),
    authenticatorSelection: { residentKey: "required", userVerification: "required" },
  });
}

export async function enregistrer(ctx: { rpID: string; origine: string }, userId: string, defi: string, reponse: RegistrationResponseJSON, nom: string): Promise<boolean> {
  const v = await verifyRegistrationResponse({ response: reponse, expectedChallenge: defi, expectedOrigin: ctx.origine, expectedRPID: ctx.rpID, requireUserVerification: true }).catch(() => null);
  if (!v?.verified || !v.registrationInfo || !(await consommer(defi))) return false;
  const c = v.registrationInfo.credential;
  const { error } = await authAdmin().from("passkeys").insert({
    user_id: userId, credential_id: c.id, cle_publique: Buffer.from(c.publicKey).toString("base64url"), compteur: c.counter,
    transports: c.transports ?? [], nom: nom.slice(0, 60),
  });
  return !error;
}

// `userId` connu (second facteur) : seules ses clés sont proposées. Sinon (connexion) : clé détectable.
export async function optionsAuthentification(rpID: string, userId?: string) {
  const cles = userId ? await clesDe(userId) : [];
  return generateAuthenticationOptions({
    rpID, userVerification: "required",
    allowCredentials: userId ? cles.map((c) => ({ id: c.credential_id, transports: c.transports as AuthenticatorTransportFuture[] })) : undefined,
  });
}

// Vérifie une réponse ; renvoie le compte propriétaire de la clé, ou null.
export async function authentifier(ctx: { rpID: string; origine: string }, defi: string, reponse: AuthenticationResponseJSON, userId?: string): Promise<string | null> {
  const db = authAdmin();
  const { data } = await db.from("passkeys").select("id, user_id, credential_id, cle_publique, compteur, transports").eq("credential_id", reponse.id).maybeSingle();
  const c = data as Ligne | null;
  if (!c || (userId && c.user_id !== userId)) return null;
  const v = await verifyAuthenticationResponse({
    response: reponse, expectedChallenge: defi, expectedOrigin: ctx.origine, expectedRPID: ctx.rpID, requireUserVerification: true,
    credential: { id: c.credential_id, publicKey: new Uint8Array(Buffer.from(c.cle_publique, "base64url")), counter: Number(c.compteur), transports: c.transports as AuthenticatorTransportFuture[] },
  }).catch(() => null);
  if (!v?.verified) return null;
  if (!(await consommer(defi))) return null;
  await db.from("passkeys").update({ compteur: v.authenticationInfo.newCounter, utilisee_le: new Date().toISOString() }).eq("id", c.id);
  return c.user_id;
}
