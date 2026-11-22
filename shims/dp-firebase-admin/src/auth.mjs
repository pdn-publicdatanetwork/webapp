// firebase-admin/auth — shim dp-firebase-admin.
// Surface utilisée par DataParl' : getAuth(app) puis verifyIdToken(token, false)
// et generateSignInWithEmailLink(email, actionCodeSettings). Vérification
// RS256/JWKS en WebCrypto, lien magique via l'API REST identitytoolkit
// (accounts:sendOobCode avec returnOobLink, même contrat que le SDK Node).

import { b64VersBytes, texteClair, verifierRs256, clePubliqueJwk } from "./lowlevel.mjs";
import { jetonAcces, jwksSecuretoken } from "./jetons.mjs";

const SCOPES_AUTH = ["https://www.googleapis.com/auth/cloud-platform", "https://www.googleapis.com/auth/firebase"];

function saDe(app) {
  const c = app?.credential;
  if (!c?.__dpCert || !c.sa) {
    throw new Error("getAuth : app sans credential cert() (compte de service attendu)");
  }
  return c.sa;
}

async function verifierJetonId(app, jeton, tryIndex = 0) {
  const parties = String(jeton ?? "").split(".");
  if (parties.length !== 3) throw new Error("verifyIdToken : jeton malformé");
  let entete, charge;
  try {
    entete = JSON.parse(texteClair(parties[0]));
    charge = JSON.parse(texteClair(parties[1]));
  } catch {
    throw new Error("verifyIdToken : jeton illisible");
  }
  if (entete?.alg !== "RS256" || !entete?.kid) throw new Error("verifyIdToken : entête inattendue");
  const projectId = app.__dpProjectId;
  if (!projectId) throw new Error("verifyIdToken : projectId inconnu");
  const now = Math.floor(Date.now() / 1000);
  if (typeof charge.exp !== "number" || charge.exp < now) throw new Error("verifyIdToken : jeton expiré");
  if (typeof charge.iat !== "number" || charge.iat > now + 300) throw new Error("verifyIdToken : iat invalide");
  if (charge.aud !== projectId) throw new Error("verifyIdToken : audience invalide");
  if (charge.iss !== `https://securetoken.google.com/${projectId}`) throw new Error("verifyIdToken : émetteur invalide");
  if (!charge.sub) throw new Error("verifyIdToken : sub manquant");
  const cles = await jwksSecuretoken(tryIndex > 0);
  const jwk = cles.get(entete.kid);
  if (!jwk) {
    if (tryIndex === 0) return verifierJetonId(app, jeton, 1);
    throw new Error("verifyIdToken : clé de signature inconnue");
  }
  const data = new TextEncoder().encode(`${parties[0]}.${parties[1]}`);
  const sig = b64VersBytes(parties[2]);
  const ok = await verifierRs256(await clePubliqueJwk(jwk), data, sig);
  if (!ok) throw new Error("verifyIdToken : signature invalide");
  return charge;
}

export function getAuth(app) {
  return {
    async verifyIdToken(jeton, checkRevoked = false) {
      if (checkRevoked) {
        throw new Error("verifyIdToken(checkRevoked=true) non supporté par le shim Workers (toujours appelé avec false par DataParl')");
      }
      return verifierJetonId(app, jeton);
    },

    // Lien de connexion e-mail : POST projects/{projectId}/accounts:sendOobCode,
    // body identique au SDK Node (returnOobLink: true) -> réponse { oobLink }.
    async generateSignInWithEmailLink(email, actionCodeSettings) {
      if (!email) throw new Error("generateSignInWithEmailLink : e-mail requis");
      const sa = saDe(app);
      const bearer = await jetonAcces(sa, SCOPES_AUTH);
      const corps = {
        requestType: "EMAIL_SIGNIN",
        email,
        returnOobLink: true,
        continueUrl: actionCodeSettings?.url,
        canHandleCodeInApp: Boolean(actionCodeSettings?.handleCodeInApp),
      };
      if (actionCodeSettings?.dynamicLinkDomain) corps.dynamicLinkDomain = actionCodeSettings.dynamicLinkDomain;
      const r = await fetch(
        `https://identitytoolkit.googleapis.com/v1/projects/${encodeURIComponent(sa.project_id)}/accounts:sendOobCode`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${bearer}`, "Content-Type": "application/json" },
          body: JSON.stringify(corps),
        },
      );
      if (!r.ok) {
        const t = await r.text().catch(() => "");
        throw new Error(`generateSignInWithEmailLink : identitytoolkit ${r.status} ${t.slice(0, 200)}`);
      }
      const j = await r.json();
      if (!j.oobLink) throw new Error("generateSignInWithEmailLink : réponse sans oobLink");
      return j.oobLink;
    },
  };
}
