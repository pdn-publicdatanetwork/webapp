"use client";
import { useEffect, useState } from "react";
import { authBrowser, sessionActuelle } from "@/lib/supabaseBrowser";

// DataParl' Auth : connexion ou création de compte. Servie sur www., api. et
// admin. pour que le flux OAuth (PKCE) reste sur l'origine qui l'a lancé.
// Les fournisseurs dépendent du sous-domaine : Slack réservé à l'espace
// équipe (admin.dataparl.fr) ; Google, GitHub et X pour les comptes du site
// (www et media).

const CGU_OK = "dp_cgu_acceptees";
const IDENTITE = "dp_identite"; // prénom et nom saisis à la création, enregistrés une fois connecté
let redirige = false;

function IconeGitHub() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.27 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}

function IconeGoogle() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.08 3.57-5.15 3.57-8.81Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.87-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.3v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.29 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l3.99-3.1Z" />
      <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.61 4.59 1.8l3.43-3.43A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.3 6.6l3.99 3.1C6.23 6.86 8.88 4.75 12 4.75Z" />
    </svg>
  );
}

function IconeSlack() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="#611f69">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
    </svg>
  );
}

function IconeX() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z" />
    </svg>
  );
}

export default function Connexion() {
  const [onglet, setOnglet] = useState<"connexion" | "creation">("connexion");
  const [cgu, setCgu] = useState(false);
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [etape, setEtape] = useState<"choix" | "email" | "code" | "mdp">("choix");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [mdp, setMdp] = useState("");
  const [message, setMessage] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [surAdmin, setSurAdmin] = useState(false);

  useEffect(() => {
    setSurAdmin(window.location.hostname.startsWith("admin."));
  }, []);

  const creation = onglet === "creation";
  const identite = prenom.trim().length > 0 && nom.trim().length > 0;
  const bloque = creation && (!cgu || !identite);
  const motif = !identite ? "Indique d'abord ton prénom et ton nom." : "Coche d'abord la case d'acceptation.";

  function destination(): string {
    const suite = new URLSearchParams(window.location.search).get("suite");
    if (suite && suite.startsWith("/") && !suite.startsWith("//") && !suite.includes("\\")) return suite;
    return window.location.hostname.startsWith("admin.") ? "/" : "/mon-compte";
  }

  async function apresConnexion(token: string) {
    if (redirige) return;
    redirige = true;
    try {
      const id = sessionStorage.getItem(IDENTITE);
      if (id) {
        const { prenom: p, nom: n } = JSON.parse(id) as { prenom: string; nom: string };
        await authBrowser().auth.updateUser({ data: { prenom: p, nom: n } });
        sessionStorage.removeItem(IDENTITE);
      }
      if (sessionStorage.getItem(CGU_OK)) {
        await fetch("/api/compte/consentement", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
        sessionStorage.removeItem(CGU_OK);
      }
    } catch {}
    const suite = destination();
    // Téléchargement protégé : les CSV de media.dataparl.fr exigent un jeton de
    // session ; la navigation simple serait rejetée (boucle de redirection).
    // On les récupère avec le jeton, on déclenche le téléchargement, puis on
    // rejoint le menu des feuilles téléchargeables (media.dataparl.fr/sheets).
    if (/^\/assets\/(collab|parl)\//.test(suite)) {
      try {
        const r = await fetch("https://media.dataparl.fr" + suite, { headers: { Authorization: "Bearer " + token } });
        if (r.ok) {
          const blob = await r.blob();
          const nomFichier = "dataparl_" + (suite.split("/").pop() ?? "export").replace(/\.csv$/i, "") + ".csv";
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = nomFichier;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 60000);
        }
      } catch {}
      window.location.replace("https://media.dataparl.fr/sheets");
      return;
    }
    window.location.replace(suite);
  }

  useEffect(() => {
    const sb = authBrowser();
    sessionActuelle().then((s) => {
      if (s) apresConnexion(s.access_token);
    });
    const { data: sub } = sb.auth.onAuthStateChange((evt, session) => {
      if (evt === "SIGNED_IN" && session) apresConnexion(session.access_token);
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function memoriserCgu() {
    try {
      if (creation && cgu) {
        sessionStorage.setItem(CGU_OK, "1");
        sessionStorage.setItem(IDENTITE, JSON.stringify({ prenom: prenom.trim().slice(0, 60), nom: nom.trim().toUpperCase().slice(0, 60) }));
      }
    } catch {}
  }

  async function oauth(provider: "github" | "google" | "slack_oidc" | "twitter") {
    if (bloque) return setMessage(motif);
    memoriserCgu();
    const suite = encodeURIComponent(destination());
    await authBrowser().auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/connexion?suite=${suite}` },
    });
  }

  async function envoyerCode(e: React.FormEvent) {
    e.preventDefault();
    if (bloque) return setMessage(motif);
    setEnCours(true);
    setMessage("");
    const { error } = await authBrowser().auth.signInWithOtp({ email, options: { shouldCreateUser: creation } });
    setEnCours(false);
    if (error) {
      return setMessage(
        creation
          ? "Impossible d'envoyer le code. Réessaie dans quelques minutes."
          : "Aucun compte avec cette adresse, ou envoi impossible. Tu peux créer un compte avec l'onglet d'à côté.",
      );
    }
    memoriserCgu();
    setEtape("code");
  }

  async function verifier(e: React.FormEvent) {
    e.preventDefault();
    setEnCours(true);
    const { error } = await authBrowser().auth.verifyOtp({ email, token: code.trim(), type: "email" });
    setEnCours(false);
    if (error) setMessage("Code incorrect ou expiré.");
  }

  // Connexion par mot de passe : disponible pour les comptes qui en ont
  // défini un (Sécurité et connexion, mon compte).
  async function connexionMotDePasse(e: React.FormEvent) {
    e.preventDefault();
    if (bloque) return setMessage(motif);
    setEnCours(true);
    setMessage("");
    const { error } = await authBrowser().auth.signInWithPassword({ email, password: mdp });
    setEnCours(false);
    if (error) setMessage("Adresse ou mot de passe incorrect. Si tu n'as pas encore de mot de passe, demande un code par email.");
  }

  return (
    <div className="auth">
      <div className="marque">Data<span className="surligne">Parl&apos;</span> <span className="auth-mot">Auth</span></div>
      <p className="lead" style={{ margin: "8px auto 0" }}>Accède à ton espace personnel</p>

      <div className="card">
        <div className="onglets" role="tablist">
          <button role="tab" aria-selected={!creation} onClick={() => { setOnglet("connexion"); setMessage(""); }}>Se connecter</button>
          <button role="tab" aria-selected={creation} onClick={() => { setOnglet("creation"); setMessage(""); }}>Créer un compte</button>
        </div>

        {creation && etape !== "code" && (
          <div className="grille-2" style={{ textAlign: "left" }}>
            <div><label htmlFor="c-prenom">Prénom</label>
              <input id="c-prenom" type="text" required maxLength={60} value={prenom} onChange={(e) => setPrenom(e.target.value)} autoComplete="given-name" /></div>
            <div><label htmlFor="c-nom">NOM</label>
              <input id="c-nom" type="text" required maxLength={60} value={nom} onChange={(e) => setNom(e.target.value)} autoComplete="family-name" style={{ textTransform: "uppercase" }} /></div>
          </div>
        )}
        {creation && (
          <label className="check" style={{ marginTop: 12 }}>
            <input type="checkbox" checked={cgu} onChange={(e) => setCgu(e.target.checked)} />
            <span>
              J&apos;accepte les <a href="/informations-legales/cgu" target="_blank">conditions d&apos;utilisation</a> et la{" "}
              <a href="/informations-legales/confidentialite" target="_blank">politique de données personnelles</a>.
            </span>
          </label>
        )}

        {etape !== "code" && etape !== "mdp" && (
          <>
            {surAdmin ? (
              <>
                <button className="fournisseur slack" onClick={() => oauth("slack_oidc")} disabled={bloque}>
                  <IconeSlack /> Continuer avec Slack
                </button>
                <p className="meta" style={{ margin: "10px 0" }}>
                  L&apos;espace équipe se connecte avec Slack (ou GitHub pour les comptes historiques).
                </p>
                <button className="fournisseur github" onClick={() => oauth("github")} disabled={bloque}>
                  <IconeGitHub /> Continuer avec GitHub
                </button>
              </>
            ) : (
              <>
                <button className="fournisseur" onClick={() => oauth("google")} disabled={bloque}>
                  <IconeGoogle /> Continuer avec Google
                </button>
                <button className="fournisseur github" onClick={() => oauth("github")} disabled={bloque}>
                  <IconeGitHub /> Continuer avec GitHub
                </button>
                <button className="fournisseur" onClick={() => oauth("twitter")} disabled={bloque}>
                  <IconeX /> Continuer avec X
                </button>
              </>
            )}
            <div className="separateur">ou</div>
          </>
        )}

        {etape === "choix" && (
          <>
            <button className="fournisseur" onClick={() => setEtape("email")} disabled={bloque}>
              Continuer avec un email
            </button>
            {!surAdmin && (
              <button className="fournisseur" onClick={() => setEtape("mdp")} disabled={bloque}>
                Continuer avec un mot de passe
              </button>
            )}
          </>
        )}

        {etape === "email" && (
          <form onSubmit={envoyerCode}>
            <label htmlFor="email">Adresse email</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoFocus />
            <button type="submit" disabled={enCours || bloque} style={{ width: "100%" }}>Recevoir un code</button>
          </form>
        )}

        {etape === "code" && (
          <form onSubmit={verifier}>
            <p>Un code à 6 chiffres vient d&apos;être envoyé à <strong>{email}</strong>.</p>
            <label htmlFor="code">Code</label>
            <input id="code" type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={code}
              onChange={(e) => setCode(e.target.value)} autoComplete="one-time-code" autoFocus />
            <button type="submit" disabled={enCours} style={{ width: "100%" }}>Valider</button>
            <p className="meta" style={{ marginTop: 12 }}>
              <button type="button" className="lien" onClick={() => { setEtape("email"); setCode(""); }}>Changer d&apos;adresse</button>
            </p>
          </form>
        )}

        {etape === "mdp" && (
          <form onSubmit={connexionMotDePasse}>
            <label htmlFor="email">Adresse email</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoFocus />
            <label htmlFor="mdp">Mot de passe</label>
            <input id="mdp" type="password" required value={mdp} onChange={(e) => setMdp(e.target.value)} autoComplete="current-password" />
            <button type="submit" disabled={enCours || bloque} style={{ width: "100%" }}>Se connecter</button>
            <p className="meta" style={{ marginTop: 12 }}>
              <button type="button" className="lien" onClick={() => { setEtape("email"); setMdp(""); }}>Recevoir un code plutôt</button>
            </p>
          </form>
        )}

        {message && <p className="erreur">{message}</p>}
      </div>

      <p className="meta" style={{ marginTop: 20 }}><a href="/">← Retour au site</a></p>
    </div>
  );
}