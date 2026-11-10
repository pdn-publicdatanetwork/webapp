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
// CLI) échappent parfois les \n du champ private_key une fois de trop : le PEM
// arrive alors avec des retours à la ligne littéraux et « Failed to parse
// private key ». On normalise : \n échappés -> vrais retours à la ligne.
function configClé(): Record<string, unknown> {
  const conf = JSON.parse(secret("FIREBASE_AUTH_SERVICE_ACCOUNT"));
  if (typeof conf.private_key === "string") {
    conf.private_key = conf.private_key.replace(/\\n/g, "\n").replace(/\\r/g, "\r");
  }
  return conf;
}
