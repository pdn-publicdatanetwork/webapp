// Jetons d'accès OAuth2 Google depuis un compte de service (JWT bearer),
// et récupération des JWK publiques des id tokens Firebase.

import { maintenant, jwtSigner } from "./lowlevel.mjs";

const URL_TOKEN = "https://oauth2.googleapis.com/token";
const URL_JWKS = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

// cache : "client_email|scopes" -> { jeton, expire }
const cacheJetons = new Map();

export async function jetonAcces(sa, scopes) {
  const cle = `${sa.client_email}|${scopes.join(" ")}`;
  const now = maintenant();
  const present = cacheJetons.get(cle);
  if (present && present.expire - 60 > now) return present.jeton;
  const assertion = await jwtSigner(
    sa.private_key,
    { alg: "RS256", typ: "JWT" },
    {
      iss: sa.client_email,
      sub: sa.client_email,
      aud: URL_TOKEN,
      iat: now,
      exp: now + 3600,
      scope: scopes.join(" "),
    },
  );
  const r = await fetch(URL_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }).toString(),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`jetonAcces : oauth2 ${r.status} ${t.slice(0, 200)}`);
  }
  const j = await r.json();
  const item = { jeton: j.access_token, expire: now + Number(j.expires_in ?? 3600) };
  cacheJetons.set(cle, item);
  return item.jeton;
}

// JWK des id tokens Firebase : cache 6 h, re-tentative si kid inconnu.
let cacheJwks = { cles: null, vu: 0 };

export async function jwksSecuretoken(force = false) {
  const now = Date.now();
  if (!force && cacheJwks.cles && now - cacheJwks.vu < 6 * 3600 * 1000) return cacheJwks.cles;
  const r = await fetch(URL_JWKS, { headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`jwksSecuretoken : ${r.status}`);
  const j = await r.json();
  const cles = new Map();
  for (const k of j.keys ?? []) if (k.kid && k.kty === "RSA") cles.set(k.kid, k);
  cacheJwks = { cles, vu: now };
  return cles;
}
