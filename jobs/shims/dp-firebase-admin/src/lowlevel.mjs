// Helpers crypto/encodage pour le shim dp-firebase-admin (workerd + Node 18+).

// --- Base64 / Base64URL ------------------------------------------------

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export function bytesVersB64(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export function b64VersBytes(b64) {
  const s = b64.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(s + "=".repeat((4 - (s.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function b64u(bytes) {
  return bytesVersB64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function jsonB64u(obj) {
  return b64u(new TextEncoder().encode(JSON.stringify(obj)));
}

export function texteClair(base64url) {
  return new TextDecoder().decode(b64VersBytes(base64url));
}

// --- RSA (WebCrypto) ----------------------------------------------------

// PEM PKCS#8 ("-----BEGIN PRIVATE KEY-----") -> CryptoKey signable RS256.
let cachePkcs8 = new Map();
export function clePrivee(pem) {
  const cle = pem.trim();
  if (cachePkcs8.has(cle)) return cachePkcs8.get(cle);
  const corps = cle.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, "").replace(/\s+/g, "");
  const promise = crypto.subtle
    .importKey("pkcs8", b64VersBytes(corps), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"])
    .then((k) => {
      cachePkcs8.set(cle, Promise.resolve(k));
      return k;
    });
  cachePkcs8.set(cle, promise);
  return promise;
}

export async function signerRs256(pem, data) {
  const key = await clePrivee(pem);
  return new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, data));
}

export async function verifierRs256(key, data, sigBytes) {
  return crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, sigBytes, data);
}

// JWK (clés publiques Google) -> CryptoKey vérifiable.
const cacheJwk = new Map();
export function clePubliqueJwk(jwk) {
  if (cacheJwk.has(jwk.kid)) return cacheJwk.get(jwk.kid);
  const j = {
    kty: jwk.kty,
    n: jwk.n,
    e: jwk.e,
    alg: "RS256",
    ext: true,
  };
  const promise = crypto.subtle
    .importKey("jwk", j, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"])
    .then((k) => {
      cacheJwk.set(jwk.kid, Promise.resolve(k));
      return k;
    });
  cacheJwk.set(jwk.kid, promise);
  return promise;
}

// --- JWT ---------------------------------------------------------------

export async function jwtSigner(priveePem, header, payload) {
  const entete = jsonB64u(header);
  const corps = jsonB64u(payload);
  const sig = await signerRs256(priveePem, new TextEncoder().encode(`${entete}.${corps}`));
  return `${entete}.${corps}.${b64u(sig)}`;
}

// --- Divers -------------------------------------------------------------

export function maintenant() {
  return Math.floor(Date.now() / 1000);
}
