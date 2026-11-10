"use client";
// Session Firebase côté client (projet dataparl-auth) pour les comptes du
// site (www, api, media). GoTrue reste actif en parallèle (double-run) et
// admin.dataparl.fr ne passe jamais ici : la page de connexion ne monte ce
// module que derrière le flag NEXT_PUBLIC_AUTH_FIREBASE.
//
// Le SDK client est chargé dynamiquement depuis le CDN gstatic (pas de
// dépendance npm : le lockfile reste intact). La session est stockée dans le
// cookie morcelé dp-firebase sur .dataparl.fr : connecté sur www = connecté
// sur media et api. Le rafraîchissement du jeton passe par l'API REST
// securetoken (works sur tous les sous-domaines, sans IndexedDB).

import type { Session } from "@supabase/supabase-js";
import { FIREBASE_AUTH_API_KEY, FIREBASE_AUTH_APP_ID } from "./env";
import { cookieStorage } from "./cookieStorage";

const VERSION_SDK = "12.4.0";
const CLE_SESSION = "dp-firebase";
const CLE_EMAIL = "dp-fb-email";
export const AUTH_DOMAIN_FIREBASE = "dataparl-auth.firebaseapp.com";

type SessionFirebase = {
  rt: string; // refresh token Firebase
  it: string; // id token courant
  exp: number; // expiration de l'id token (secondes epoch)
  email: string;
  uuid: string; // identifiant Postgres (auth.users), clé de toutes les données
  prenom?: string;
  nom?: string;
  f: string[]; // fournisseurs Firebase
};

let promesseSdk: Promise<{ auth: any; mod: any }> | null = null;

// Chargement (unique) du SDK Auth depuis le CDN via un module inline : les
// import() dynamiques à URL variable sont le terrain de jeu des bundlers
// (Turbopack refuse les chemins non analysables statiquement), alors qu'un
// <script type="module"> importe les URLs absolues lui-même. La CSP laisse
// passer le module inline ('unsafe-inline') et le CDN (gstatic, ajouté).
async function sdk(): Promise<{ auth: any; mod: any }> {
  if (!promesseSdk) {
    promesseSdk = new Promise<{ app: any; mod: any }>((resoudre, rejeter) => {
      (window as unknown as { __dpSdkFirebase?: (v: { app: any; mod: any }) => void }).__dpSdkFirebase = (v) => resoudre(v);
      const s = document.createElement("script");
      s.type = "module";
      s.textContent =
        `import * as app from "https://www.gstatic.com/firebasejs/${VERSION_SDK}/firebase-app.js";` +
        `import * as mod from "https://www.gstatic.com/firebasejs/${VERSION_SDK}/firebase-auth.js";` +
        "window.__dpSdkFirebase({ app, mod });";
      s.onerror = () => rejeter(new Error("SDK Firebase introuvable"));
      document.head.appendChild(s);
      setTimeout(() => rejeter(new Error("SDK Firebase : delai depasse")), 20_000);
    }).then((m) => {
      const config = {
        apiKey: FIREBASE_AUTH_API_KEY,
        authDomain: AUTH_DOMAIN_FIREBASE,
        projectId: "dataparl-auth",
        appId: FIREBASE_AUTH_APP_ID,
      };
      const existe = m.app.getApps().find((a: any) => a.name === "[DEFAULT]");
      const app = existe ?? m.app.initializeApp(config);
      const auth = m.mod.getAuth(app);
      if (typeof auth.useDeviceLanguage === "function") auth.useDeviceLanguage();
      return { auth, mod: m.mod };
    });
    // Échec de chargement : on permettra une nouvelle tentative au prochain appel.
    promesseSdk.catch(() => {
      promesseSdk = null;
    });
  }
  return promesseSdk;
}

function lireCookie(): SessionFirebase | null {
  try {
    const brut = cookieStorage.getItem(CLE_SESSION);
    return brut ? (JSON.parse(brut) as SessionFirebase) : null;
  } catch {
    return null;
  }
}

function ecrireCookie(s: SessionFirebase) {
  try {
    cookieStorage.setItem(CLE_SESSION, JSON.stringify(s));
  } catch {}
}

// Session Firebase courante, avec rafraîchissement REST du jeton s'il expire
// dans moins de 60 s. Null si absente ou révocable (refresh refusé : compte
// désactivé, jeton révoqué…).
export async function sessionFirebase(): Promise<SessionFirebase | null> {
  let s = lireCookie();
  if (!s?.rt) return null;
  if (s.exp < Date.now() / 1000 + 60) {
    try {
      const r = await fetch(`https://securetoken.googleapis.com/v1/token?key=${FIREBASE_AUTH_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grantType: "refresh_token", refreshToken: s.rt }),
      });
      if (!r.ok) throw new Error("refresh");
      const j = await r.json();
      s = { ...s, it: j.idToken, rt: j.refreshToken, exp: Math.floor(Date.now() / 1000 + Number(j.expiresIn ?? 3600)), email: j.email ?? s.email };
      ecrireCookie(s);
    } catch {
      await deconnexionFirebase();
      return null;
    }
  }
  return s;
}

// Synthèse au format Session supabase-js : les composants qui lisent la
// session (mon-compte, menu, journal de connexion…) fonctionnent sans patch.
// L'identifiant exposé est l'uuid Postgres, jamais l'uid Firebase.
export async function sessionFirebaseSynthese(): Promise<Session | null> {
  const s = await sessionFirebase();
  if (!s) return null;
  const user = {
    id: s.uuid,
    aud: "authenticated",
    role: "authenticated",
    email: s.email,
    app_metadata: { provider: "firebase", providers: s.f },
    user_metadata: s.prenom || s.nom ? { prenom: s.prenom, nom: s.nom } : {},
    identities: [],
    created_at: "",
    last_sign_in_at: new Date().toISOString(),
  } as unknown as Session["user"];
  return {
    access_token: s.it,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(s.exp),
    refresh_token: s.rt,
    token: s.it,
    user,
  } as unknown as Session;
}

// Connexion popup OAuth (Google, GitHub) : renvoie l'utilisateur Firebase
// (non finalisé : l'appelant doit passer par /api/auth/session puis
// finaliserConnexion).
export async function connexionPopup(fournisseur: "google" | "github"): Promise<any> {
  const { auth, mod } = await sdk();
  const fournisseurId = fournisseur === "google" ? new mod.GoogleAuthProvider() : new mod.GithubAuthProvider();
  const r = await mod.signInWithPopup(auth, fournisseurId);
  return r.user;
}

export async function lienConnexionActif(): Promise<boolean> {
  const { auth, mod } = await sdk();
  return mod.isSignInWithEmailLink(auth, window.location.href);
}

export function emailLienMemorise(): string | null {
  try {
    return localStorage.getItem(CLE_EMAIL);
  } catch {
    return null;
  }
}

export function memoriserEmailLien(email: string) {
  try {
    localStorage.setItem(CLE_EMAIL, email);
  } catch {}
}

export function oublierEmailLien() {
  try {
    localStorage.removeItem(CLE_EMAIL);
  } catch {}
}

// Finalise l'arrivée depuis un lien magique (URL courante).
export async function connexionParLien(email: string): Promise<any> {
  const { auth, mod } = await sdk();
  const r = await mod.signInWithEmailLink(auth, email, window.location.href);
  return r.user;
}

// Enregistre la session complète dans le cookie .dataparl.fr une fois
// l'identité Postgres connue (uuid renvoyé par /api/auth/session).
export function finaliserSession(userFb: any, uuid: string, prenom?: string, nom?: string): void {
  const exp = userFb?.stsTokenManager?.expirationTime;
  const fournisseurs = Array.isArray(userFb?.providerData)
    ? userFb.providerData.map((p: any) => p.providerId.replace(".com", "")).filter(Boolean)
    : [];
  ecrireCookie({
    rt: userFb.refreshToken,
    it: userFb.accessToken,
    exp: typeof exp === "number" ? Math.floor(exp / 1000) : Math.floor(Date.now() / 1000 + 3600),
    email: userFb.email ?? "",
    uuid,
    prenom,
    nom,
    f: fournisseurs,
  });
}

export async function deconnexionFirebase(): Promise<void> {
  try {
    cookieStorage.removeItem(CLE_SESSION);
  } catch {}
  try {
    const { auth, mod } = await sdk();
    await mod.signOut(auth);
  } catch {}
}
