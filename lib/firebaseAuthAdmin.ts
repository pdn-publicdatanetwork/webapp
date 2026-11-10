import "server-only";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { secret } from "./env";

// SDK Firebase côté serveur pour l'authentification (projet dataparl-auth),
// initialisé à la demande depuis FIREBASE_AUTH_SERVICE_ACCOUNT (JSON de la
// clé de service, sur une ligne, même convention que FIREBASE_SERVICE_ACCOUNT
// pour jobsFirestore). Flag inactif = jamais initialisé (GoTrue seul).

export function authFirebase(): Auth {
  const nom = "dpauth";
  const app = getApps().find((a) => a.name === nom) ?? initializeApp(
    { credential: cert(configClé()) },
    nom,
  );
  return getAuth(app);
}

// Clé de service depuis FIREBASE_AUTH_SERVICE_ACCOUNT. Les interfaces (Vercel,
// CLI) abîment parfois le champ private_key : \n échappés une fois de trop,
// retours à la ligne réels ou CR. On normalise tout ce qui est réparable et
// on refuse le reste avec un diagnostic lisible (jamais le secret lui-même).
function configClé(): Record<string, unknown> {
  const brut = secret("FIREBASE_AUTH_SERVICE_ACCOUNT");
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
    .replace(/\r\n/g, "\n")  // CRLF réels
    .replace(/\\r\\n/g, "\n") // séquences littérales \r\n
    .replace(/\\n/g, "\n")   // séquences littérales \n
    .replace(/\\r/g, "\n")
    .trim();
  const lignes = cle.split("\n").filter((l) => l.trim().length > 0);
  if (lignes.length < 3 || !lignes[0].startsWith("-----BEGIN") || !/^-----END PRIVATE KEY-----$/.test(lignes[lignes.length - 1].trim())) {
    throw new Error(`FIREBASE_AUTH_SERVICE_ACCOUNT : private_key de forme inattendue (${lignes.length} lignes, en-tête : ${(lignes[0] || "").slice(0, 32)})`);
  }
  // Le corps base64 est ré-assemblé : tout caractère parasite (espaces
  // glissés par un copier-coller avec retour automatique à la ligne) est
  // écarté, puis le PEM est reconstitué en lignes de 64, forme canonique
  // acceptée par OpenSSL.
  const corps = lignes.slice(1, -1).join("").replace(/[^A-Za-z0-9+/=]/g, "");
  if (!corps || corps.length % 4 !== 0) {
    throw new Error(`FIREBASE_AUTH_SERVICE_ACCOUNT : corps base64 invalide (${corps.length} caractères utiles)`);
  }
  const corps64 = (corps.match(/.{1,64}/g) ?? []).join("\n");
  conf.private_key = `-----BEGIN PRIVATE KEY-----\n${corps64}\n-----END PRIVATE KEY-----\n`;
  return conf;
}
