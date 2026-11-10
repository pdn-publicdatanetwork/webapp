import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";

// SDK Firebase côté serveur pour l'authentification (projet dataparl-auth),
// initialisé à la demande depuis FIREBASE_AUTH_SERVICE_ACCOUNT (JSON de la
// clé de service sur une ligne, même convention que FIREBASE_SERVICE_ACCOUNT
// pour Firestore). Flag inactif = jamais initialisé (GoTrue seul).

export function authFirebase(): Auth {
  const nom = "dpauth";
  const app = getApps().find((a) => a.name === nom) ?? initializeApp({ credential: cert(configClé()) }, nom);
  return getAuth(app);
}

// Audience attendue dans les id tokens : le projet Firebase dataparl-auth.
export const AUD_FIREBASE = "dataparl-auth";

// Vérifie un id token Firebase et renvoie l'e-mail du compte.
// Jeton invalide ou d'un autre projet : null.
export async function emailDepuisJetonFirebase(jeton: string): Promise<string | null> {
  const p = jeton.split(".");
  if (p.length !== 3) return null;
  let aud = "";
  try {
    const charge = JSON.parse(Buffer.from(p[1], "base64url").toString("utf8")) as { aud?: string };
    aud = typeof charge.aud === "string" ? charge.aud : "";
  } catch {
    return null;
  }
  if (aud !== AUD_FIREBASE) return null;
  try {
    const dec = await authFirebase().verifyIdToken(jeton, false);
    return typeof dec.email === "string" ? dec.email.toLowerCase() : null;
  } catch {
    return null;
  }
}

// Clé de service depuis FIREBASE_AUTH_SERVICE_ACCOUNT. Les interfaces (Vercel,
// CLI) abîment parfois le champ private_key : \n échappés une fois de trop,
// retours à la ligne réels ou CR. On normalise tout ce qui est réparable et
// on refuse le reste avec un diagnostic lisible (jamais le secret lui-même).
function configClé(): Record<string, unknown> {
  const brut = process.env.FIREBASE_AUTH_SERVICE_ACCOUNT;
  if (!brut) throw new Error("FIREBASE_AUTH_SERVICE_ACCOUNT absent");
  let conf: Record<string, unknown>;
  try {
    conf = JSON.parse(brut) as Record<string, unknown>;
  } catch (e) {
    throw new Error(`FIREBASE_AUTH_SERVICE_ACCOUNT : JSON invalide (${(e as Error).message.slice(0, 120)})`);
  }
  const k = typeof conf.private_key === "string" ? conf.private_key : "";
  if (!k) throw new Error("FIREBASE_AUTH_SERVICE_ACCOUNT : champ private_key absent");
  if (!k.includes("BEGIN")) throw new Error(`FIREBASE_AUTH_SERVICE_ACCOUNT : private_key sans en-tête PEM (longueur ${k.length})`);
  let cle = k
    .replace(/\r\n/g, "\n")
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\n")
    .trim();
  const lignes = cle.split("\n").filter((l) => l.trim().length > 0);
  if (lignes.length < 3 || !lignes[0].startsWith("-----BEGIN") || !/^-----END PRIVATE KEY-----$/.test(lignes[lignes.length - 1].trim())) {
    throw new Error(`FIREBASE_AUTH_SERVICE_ACCOUNT : private_key de forme inattendue (${lignes.length} lignes)`);
  }
  const corps = lignes.slice(1, -1).join("").replace(/[^A-Za-z0-9+/=]/g, "");
  if (!corps || corps.length % 4 !== 0) {
    throw new Error(`FIREBASE_AUTH_SERVICE_ACCOUNT : corps base64 invalide (${corps.length} caractères utiles)`);
  }
  const corps64 = (corps.match(/.{1,64}/g) ?? []).join("\n");
  conf.private_key = `-----BEGIN PRIVATE KEY-----\n${corps64}\n-----END PRIVATE KEY-----\n`;
  return conf;
}
