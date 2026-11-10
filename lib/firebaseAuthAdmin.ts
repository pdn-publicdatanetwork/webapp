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
    { credential: cert(JSON.parse(secret("FIREBASE_AUTH_SERVICE_ACCOUNT"))) },
    nom,
  );
  return getAuth(app);
}
