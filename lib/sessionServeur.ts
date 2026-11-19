import "server-only";
import type { User } from "@supabase/supabase-js";
import { FIREBASE_AUTH_API_KEY } from "./env";
import { domaineCookie } from "./domaine";
import { utilisateurFirebase } from "./userAuth";

// Session Firebase du cookie dp-firebase, lue côté serveur. Le cookie est
// écrit par la porte auth.dataparl.fr (et par lib/sessionFirebase.ts côté
// client) au format de lib/cookieStorage.ts : la valeur JSON est encodée
// encodeURIComponent puis morcelée en dp-firebase.0, .1… sur le domaine
// .dataparl.fr. Une navigation classique (lien « Télécharger » de
// data.gouv.fr, retour de la porte vers ?suite=…) ne porte jamais l'en-tête
// Authorization : c'est ce cookie qui identifie le visiteur connecté.
//
// Réservé aux routes de téléchargement CSV (servirCSV) : les autres routes
// /api/* restent sur l'en-tête Bearer uniquement, où le jeton de session ne
// transite pas dans les requêtes mutantes d'un tiers (CSRF).

export type SessionFirebaseCookie = {
  rt: string; // refresh token Firebase
  it: string; // id token courant
  exp: number; // expiration de l'id token (secondes epoch)
  email: string;
  uuid: string; // identifiant Postgres (auth.users)
  prenom?: string;
  nom?: string;
  f: string[]; // fournisseurs Firebase
};

const CLE = "dp-firebase";
// (Le cookie est pose par la porte, lib/sessionFirebase.ts et ce module.)
const TAILLE = 3000; // même découpe que lib/cookieStorage.ts
const DUREE = 60 * 60 * 24 * 30; // 30 jours, rafraîchie au fil des visites

function lireCookies(req: Request): Map<string, string> {
  const m = new Map<string, string>();
  for (const part of (req.headers.get("cookie") ?? "").split(";")) {
    const p = part.trim();
    if (!p) continue;
    const i = p.indexOf("=");
    if (i < 0) continue;
    m.set(p.slice(0, i), p.slice(i + 1));
  }
  return m;
}

// Reconstitue la session morcelée dp-firebase.0/.1… (null : absente ou
// illisible, le visiteur est traité comme anonyme).
export function lireSessionCookie(req: Request): SessionFirebaseCookie | null {
  const cookies = lireCookies(req);
  if (!cookies.has(`${CLE}.0`)) return null;
  let enc = "";
  for (let i = 0; cookies.has(`${CLE}.${i}`); i++) enc += cookies.get(`${CLE}.${i}`) ?? "";
  try {
    const s = JSON.parse(decodeURIComponent(enc)) as SessionFirebaseCookie;
    return s?.rt ? s : null;
  } catch {
    return null;
  }
}

// Jeton d'identification effectif : l'id token courant s'il est encore
// valable, sinon un id token rafraîchi par l'API REST securetoken (le même
// appel que la session client lib/sessionFirebase.ts). La session rafraîchie
// est renvoyée pour être reposée en cookie : garder l'ancien refresh token
// posé par le navigateur ne serait plus cohérent après rotation.
async function jetonEffectif(s: SessionFirebaseCookie): Promise<{ jeton: string; sessionAPoser: SessionFirebaseCookie | null } | null> {
  if (s.it && s.exp > Date.now() / 1000 + 60) return { jeton: s.it, sessionAPoser: null };
  try {
    const r = await fetch(`https://securetoken.googleapis.com/v1/token?key=${FIREBASE_AUTH_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grantType: "refresh_token", refreshToken: s.rt }),
    });
    if (!r.ok) return null; // refresh refusé : jeton révoqué, compte désactivé…
    // L'API securetoken répond en snake_case (id_token, refresh_token,
    // expires_in) : les clés camelCase n'existent pas.
    const j = (await r.json()) as { id_token?: string; refresh_token?: string; expires_in?: string | number };
    if (!j.id_token || !j.refresh_token) return null;
    const rafraichie: SessionFirebaseCookie = {
      ...s,
      it: j.id_token,
      rt: j.refresh_token,
      exp: Math.floor(Date.now() / 1000 + Number(j.expires_in ?? 3600)),
    };
    return { jeton: j.id_token, sessionAPoser: rafraichie };
  } catch {
    return null; // securetoken injoignable : pas de session exploitable
  }
}

export type DepuisCookie = { user: User | null; sessionAPoser: SessionFirebaseCookie | null };

// Identifie le visiteur depuis le cookie dp-firebase : id token courant ou
// rafraîchi, vérifié par lib/userAuth (réconciliation Postgres, comptes
// suspendus refusés). user null = non connecté (ou jeton révoqué) : renvoyer
// au mur de connexion comme avant.
export async function utilisateurCookie(req: Request): Promise<DepuisCookie> {
  const s = lireSessionCookie(req);
  if (!s) return { user: null, sessionAPoser: null };
  const effectif = await jetonEffectif(s);
  if (!effectif) return { user: null, sessionAPoser: null };
  try {
    const user = await utilisateurFirebase(effectif.jeton);
    return { user, sessionAPoser: user ? effectif.sessionAPoser : null };
  } catch {
    return { user: null, sessionAPoser: null };
  }
}

// Valeurs Set-Cookie pour reposer la session morcelée, réplique de
// cookieStorage.setItem (chunks de 3000 sans couper une séquence %XX) : les
// morceaux surnuméraires de l'ancienne session sont expirés pour ne pas
// polluer la concaténation à la prochaine lecture.
export function entetesSetCookie(session: SessionFirebaseCookie, req: Request): string[] {
  const enc = encodeURIComponent(JSON.stringify(session));
  const hote = req.headers.get("host") ?? "";
  const domaine = domaineCookie(hote);
  const secure = (req.headers.get("x-forwarded-proto") ?? "https") === "https" ? "; Secure" : "";
  const attributs = `; Path=/; Max-Age=${DUREE}; SameSite=Lax${secure}${domaine}`;
  const sortie: string[] = [];
  let debut = 0;
  let i = 0;
  while (debut < enc.length || i === 0) {
    let fin = Math.min(debut + TAILLE, enc.length);
    const p = enc.lastIndexOf("%", fin - 1);
    if (p > fin - 3 && p >= debut && fin < enc.length) fin = p;
    sortie.push(`${CLE}.${i}=${enc.slice(debut, fin)}${attributs}`);
    debut = fin;
    i++;
    if (i > 50) break; // garde-fou : une session ne dépasse jamais 50 morceaux
  }
  // Expiration des morceaux obsolètes (session plus courte qu'avant).
  let nbAnciens = 0;
  for (const nom of lireCookies(req).keys()) {
    if (nom.startsWith(`${CLE}.`)) {
      const n = Number(nom.slice(CLE.length + 1));
      if (Number.isInteger(n) && n >= i && n + 1 > nbAnciens) nbAnciens = n + 1;
    }
  }
  const expire = `; Path=/; Max-Age=0; SameSite=Lax${domaine}`;
  for (let n = i; n < nbAnciens; n++) sortie.push(`${CLE}.${n}=${expire}`);
  return sortie;
}
