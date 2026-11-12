"use client";
// Session Firebase côté client pour jobs.dataparl.fr (projet dataparl-auth).
// Le cookie morcelé dp-firebase est posé sur .dataparl.fr par la webapp :
// une connexion faite sur www (ou sur tout autre sous-domaine) vaut ici.
// Le format de morceaux est identique à celui de la webapp (encodeURIComponent,
// morceaux « dp-firebase.0 », « .1 »…, 3000 caractères sans couper un %XX).
//
// Le SDK client est chargé dynamiquement depuis le CDN gstatic (pas de
// dépendance npm : le lockfile reste intact), via un module inline (Turbopack
// refuse les import() à URL variable). Le rafraîchissement du jeton passe
// par l'API REST securetoken, sans IndexedDB.

export const AUTH_FIREBASE_ACTIF = process.env.NEXT_PUBLIC_AUTH_FIREBASE === "1";

const VERSION_SDK = "12.4.0";
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_AUTH_API_KEY ?? "AIzaSyCtHIiGOh72ypE9vHAScrE60beU7VwD2NA";
const APP_ID = "1:78579330321:web:acd058cf1523da101bf0b0";
const AUTH_DOMAIN = "auth.dataparl.com";
const CLE_SESSION = "dp-firebase";
const CLE_EMAIL = "dp-fb-email";
const TAILLE = 3000;
const DUREE = 60 * 60 * 24 * 30; // 30 jours ; rafraîchi en pratique

export type SessionFirebase = {
  rt: string; // refresh token Firebase
  it: string; // id token courant
  exp: number; // expiration de l'id token (secondes epoch)
  email: string;
  uuid: string; // identifiant Postgres (auth.users), clé des données
  f: string[]; // fournisseurs Firebase
};

// --- Cookies morcelés, format webapp ------------------------------------

function domaineCookie(): string {
  const h = (typeof window === "undefined" ? "" : window.location.hostname).split(":")[0].toLowerCase();
  return h === "dataparl.fr" || h.endsWith(".dataparl.fr") ? "; Domain=.dataparl.fr" : "";
}

function ecrireCookie(nom: string, valeur: string, maxAge: number) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${encodeURIComponent(nom)}=${valeur}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}${domaineCookie()}`;
}

function lireCookies(): Map<string, string> {
  const m = new Map<string, string>();
  for (const part of document.cookie.split("; ")) {
    if (!part) continue;
    const i = part.indexOf("=");
    try {
      m.set(decodeURIComponent(part.slice(0, i)), part.slice(i + 1));
    } catch {
      m.set(part.slice(0, i), part.slice(i + 1));
    }
  }
  return m;
}

export function lireCookieSession(): SessionFirebase | null {
  if (typeof document === "undefined") return null;
  const cookies = lireCookies();
  if (!cookies.has(`${CLE_SESSION}.0`)) return null;
  let brut = "";
  for (let i = 0; cookies.has(`${CLE_SESSION}.${i}`); i++) brut += cookies.get(`${CLE_SESSION}.${i}`) ?? "";
  try {
    return JSON.parse(decodeURIComponent(brut)) as SessionFirebase;
  } catch {
    return null;
  }
}

export function ecrireCookieSession(s: SessionFirebase) {
  if (typeof document === "undefined") return;
  let enc = "";
  try {
    enc = encodeURIComponent(JSON.stringify(s));
  } catch {
    return;
  }
  let debut = 0;
  let i = 0;
  while (debut < enc.length || i === 0) {
    let fin = Math.min(debut + TAILLE, enc.length);
    const p = enc.lastIndexOf("%", fin - 1);
    if (p > fin - 3 && p >= debut && fin < enc.length) fin = p;
    ecrireCookie(`${CLE_SESSION}.${i}`, enc.slice(debut, fin), DUREE);
    debut = fin;
    i++;
  }
  for (let j = i; lireCookies().has(`${CLE_SESSION}.${j}`); j++) ecrireCookie(`${CLE_SESSION}.${j}`, "", 0);
}

export function supprimerCookieSession() {
  if (typeof document === "undefined") return;
  for (let j = 0; lireCookies().has(`${CLE_SESSION}.${j}`); j++) ecrireCookie(`${CLE_SESSION}.${j}`, "", 0);
}

// --- SDK CDN ------------------------------------------------------------

let promesseSdk: Promise<{ auth: any; mod: any }> | null = null;

async function sdk(): Promise<{ auth: any; mod: any }> {
  if (!promesseSdk) {
    promesseSdk = new Promise<{ app: any; mod: any }>((resoudre, rejeter) => {
      (window as unknown as { __dpJobsSdkFirebase?: (v: { app: any; mod: any }) => void }).__dpJobsSdkFirebase = (v) => resoudre(v);
      const s = document.createElement("script");
      s.type = "module";
      s.textContent =
        `import * as app from "https://www.gstatic.com/firebasejs/${VERSION_SDK}/firebase-app.js";` +
        `import * as mod from "https://www.gstatic.com/firebasejs/${VERSION_SDK}/firebase-auth.js";` +
        "window.__dpJobsSdkFirebase({ app, mod });";
      s.onerror = () => rejeter(new Error("SDK Firebase introuvable"));
      document.head.appendChild(s);
      setTimeout(() => rejeter(new Error("SDK Firebase : delai depasse")), 20_000);
    }).then((m) => {
      const config = { apiKey: API_KEY, authDomain: AUTH_DOMAIN, projectId: "dataparl-auth", appId: APP_ID };
      const existe = m.app.getApps().find((a: any) => a.name === "[DEFAULT]");
      const app = existe ?? m.app.initializeApp(config);
      const auth = m.mod.getAuth(app);
      if (typeof auth.useDeviceLanguage === "function") auth.useDeviceLanguage();
      return { auth, mod: m.mod };
    });
    promesseSdk.catch(() => {
      promesseSdk = null;
    });
  }
  return promesseSdk;
}

// --- Session ------------------------------------------------------------

// Session Firebase courante, avec rafraîchissement REST du jeton s'il expire
// dans moins de 60 s. Null si absente ou refusée (jeton révoqué…).
export async function sessionFirebase(): Promise<SessionFirebase | null> {
  let s = lireCookieSession();
  if (!s?.rt) return null;
  if (s.exp < Date.now() / 1000 + 60) {
    try {
      const r = await fetch(`https://securetoken.googleapis.com/v1/token?key=${API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grantType: "refresh_token", refreshToken: s.rt }),
      });
      if (!r.ok) throw new Error("refresh");
      const j = await r.json();
      s = { ...s, it: j.idToken, rt: j.refreshToken, exp: Math.floor(Date.now() / 1000 + Number(j.expiresIn ?? 3600)), email: j.email ?? s.email };
      ecrireCookieSession(s);
    } catch {
      await deconnexionFirebase();
      return null;
    }
  }
  return s;
}

// --- Connexions ---------------------------------------------------------

// Connexion popup OAuth (Google). Renvoie l'utilisateur Firebase, non
// finalisé : l'appelant doit passer par /api/auth/session puis
// finaliserSession.
export async function connexionPopup(fournisseur: "google"): Promise<any> {
  const { auth, mod } = await sdk();
  const r = await mod.signInWithPopup(auth, new mod.GoogleAuthProvider());
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

// Finalise l'arrivée depuis un lien magique (URL courante).
export async function connexionParLien(email: string): Promise<any> {
  const { auth, mod } = await sdk();
  const r = await mod.signInWithEmailLink(auth, email, window.location.href);
  return r.user;
}

// Enregistre la session dans le cookie .dataparl.fr une fois l'identité
// Postgres connue (uuid renvoyé par /api/auth/session).
export function finaliserSession(userFb: any, uuid: string): void {
  const exp = userFb?.stsTokenManager?.expirationTime;
  const fournisseurs = Array.isArray(userFb?.providerData)
    ? userFb.providerData.map((p: any) => p.providerId.replace(".com", "")).filter(Boolean)
    : [];
  ecrireCookieSession({
    rt: userFb.refreshToken,
    it: userFb.accessToken,
    exp: typeof exp === "number" ? Math.floor(exp / 1000) : Math.floor(Date.now() / 1000 + 3600),
    email: userFb.email ?? "",
    uuid,
    f: fournisseurs,
  });
}

export async function deconnexionFirebase(): Promise<void> {
  supprimerCookieSession();
  try {
    const { auth, mod } = await sdk();
    await mod.signOut(auth);
  } catch {}
}

// --- Replis pour les composants qui lisent la session --------------------

// E-mail de la session courante : cookie Firebase partagé si la bascule est
// active, sinon session GoTrue historique (localStorage).
export async function emailSessionCourante(): Promise<string | null> {
  if (AUTH_FIREBASE_ACTIF) return (await sessionFirebase())?.email ?? null;
  const { auth } = await import("./authSupabase");
  const { data } = await auth.auth.getSession();
  return data.session?.user?.email ?? null;
}

// Simple indicateur de connexion (en-tête).
export async function estConnecte(): Promise<boolean> {
  if (AUTH_FIREBASE_ACTIF) return Boolean(await sessionFirebase());
  const { auth } = await import("./authSupabase");
  const { data } = await auth.auth.getSession();
  return Boolean(data.session);
}

// Build relancé manuellement le 10/11 (échec Vercel transitoire, hors compilation).

// Redeploiement du 10/11 : promotion du build (checks Vercel) apres ouverture breve de la maintenance.
