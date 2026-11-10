"use client";
import { useEffect, useRef, useState } from "react";
import Turnstile, { reinitialiserTurnstile } from "./Turnstile";
import { controleEmail } from "@/lib/antiAbus";
import { authBrowser, sessionActuelle } from "@/lib/supabaseBrowser";
import { connexionParLien, connexionPopup, emailLienMemorise, finaliserSession, lienConnexionActif, memoriserEmailLien, oublierEmailLien } from "@/lib/sessionFirebase";

// Porte Firebase (projet dataparl-auth), montée par page.tsx derrière le
// flag NEXT_PUBLIC_AUTH_FIREBASE sur www., api., media. et admin. (l'espace
// équipe garde son bouton Slack, flux GoTrue conservé au double-run).
// Fournisseurs v1 : Google et GitHub en popup, lien magique par e-mail
// (généré serveur, envoyé depuis bienvenue@dataparl.fr). La session est
// posée dans le cookie dp-firebase sur .dataparl.fr : la connexion vaut
// pour tous les sous-domaines. Sur admin., un compte d'équipe déjà dans
// staff passe la porte ; le second facteur (TOTP, clé d'accès) s'applique
// ensuite normalement côté Porte.

const CGU_OK = "dp_cgu_acceptees";
const IDENTITE = "dp_identite";
const EMAIL_EQUIPE = "theo@dataparl.fr";

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
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313a2.527 2.527 0 0 1 2.522 2.52 2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
    </svg>
  );
}

function IconeGitHub() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.27 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}

export default function ConnexionFirebase({ surAdmin = false }: { surAdmin?: boolean }) {
  const [onglet, setOnglet] = useState<"connexion" | "creation">("connexion");
  const [cgu, setCgu] = useState(false);
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [etape, setEtape] = useState<"choix" | "attente" | "lien">("choix");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [jetonCaptcha, setJetonCaptcha] = useState<string | null>(null);
  const redirige = useRef(false);
  const captchaRequis = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITEKEY);

  const creation = onglet === "creation";
  const identite = prenom.trim().length > 0 && nom.trim().length > 0;
  const bloque = creation && (!cgu || !identite);
  const motif = !identite ? "Indique d'abord ton prénom et ton nom." : "Coche d'abord la case d'acceptation.";

  function destination(): string {
    const suite = new URLSearchParams(window.location.search).get("suite");
    if (suite && suite.startsWith("/") && !suite.startsWith("//") && !suite.includes("\\")) return suite;
    return surAdmin ? "/" : "/mon-compte";
  }

  // Après la connexion : cookie de session posé, consentement CGU pour un
  // compte frais, puis redirection (téléchargements protégés de media gérés
  // avec le jeton, comme dans la porte GoTrue).
  async function finaliser(userFb: any) {
    if (redirige.current) return;
    redirige.current = true;
    setMessage("");
    const idToken = await userFb.getIdToken();
    let identiteEnvoyee: { prenom: string; nom: string } | null = null;
    try {
      const id = sessionStorage.getItem(IDENTITE);
      if (id) identiteEnvoyee = JSON.parse(id) as { prenom: string; nom: string };
    } catch {}
    const r = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ idToken, prenom: identiteEnvoyee?.prenom, nom: identiteEnvoyee?.nom }),
    });
    if (!r.ok) {
      redirige.current = false;
      setEnCours(false);
      return setMessage("Connexion impossible pour le moment. Réessaie dans un instant.");
    }
    const { id: uuid } = (await r.json()) as { id: string };
    finaliserSession(userFb, uuid, identiteEnvoyee?.prenom, identiteEnvoyee?.nom);
    try {
      if (sessionStorage.getItem(CGU_OK)) {
        await fetch("/api/compte/consentement", { method: "POST", headers: { Authorization: `Bearer ${idToken}` } });
        sessionStorage.removeItem(CGU_OK);
      }
      sessionStorage.removeItem(IDENTITE);
    } catch {}
    const suite = destination();
    if (/^\/assets\/(collab|parl)\//.test(suite)) {
      try {
        const r2 = await fetch("https://media.dataparl.fr" + suite, { headers: { Authorization: "Bearer " + idToken } });
        if (r2.ok) {
          const blob = await r2.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "dataparl_" + (suite.split("/").pop() ?? "export").replace(/\.csv$/i, "") + ".csv";
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
    (async () => {
      // Arrivée depuis un lien magique : finalisation directe si l'e-mail est
      // mémorisé, sinon on le demande (le lien seul ne suffit pas).
      if (await lienConnexionActif()) {
        const memorise = emailLienMemorise();
        if (memorise) {
          setEnCours(true);
          try {
            const userFb = await connexionParLien(memorise);
            oublierEmailLien();
            await finaliser(userFb);
          } catch {
            setEnCours(false);
            oublierEmailLien();
            setEtape("lien");
            setMessage("Ce lien n'est plus valide. Demande-en un autre.");
          }
          return;
        }
        setEtape("lien");
        return;
      }
      // Déjà connecté (cookie de session .dataparl.fr) : on file droit au
      // compte, comme la porte GoTrue.
      const s = await sessionActuelle();
      if (s) window.location.replace(destination());
    })();
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

  // Espace équipe : Slack reste un flux GoTrue (PKCE). Le retour atterrit
  // sur /connexion?equipe=1&suite=… : la page GoTrue est alors remontée, elle
  // échange le code et redirige vers la destination. On ne peut pas ouvrir
  // Slack dans une popup Firebase : c'est un fournisseur GoTrue.
  async function slack() {
    if (bloque) return setMessage(motif);
    memoriserCgu();
    setEnCours(true);
    try {
      await authBrowser().auth.signInWithOAuth({
        provider: "slack_oidc",
        options: { redirectTo: `${window.location.origin}/connexion?equipe=1&suite=${encodeURIComponent(destination())}` },
      });
    } catch {
      setEnCours(false);
      setMessage("Connexion Slack impossible. Réessaie.");
    }
  }

  async function popup(fournisseur: "google" | "github") {
    if (bloque) return setMessage(motif);
    memoriserCgu();
    setEnCours(true);
    setMessage("");
    try {
      const userFb = await connexionPopup(fournisseur);
      await finaliser(userFb);
    } catch (e) {
      setEnCours(false);
      redirige.current = false;
      // Diagnostic : le code d'erreur Firebase (auth/…) est affiché et
      // journalisé dans la console, les causes sont indiscernables sinon
      // (domaine non autorisé, fournisseur désactivé, réseau bloqué…).
      const code = (e as { code?: string })?.code ?? "erreur-inconnue";
      console.error("Connexion Firebase refusée :", code, e);
      setMessage(code === "auth/popup-closed-by-user" ? "Fenêtre fermée avant la fin. Réessaie." : `Connexion refusée (${code}). Réessaie.`);
    }
  }

  async function envoyerLien(e: React.FormEvent) {
    e.preventDefault();
    if (bloque) return setMessage(motif);
    memoriserCgu();
    const adresse = email.trim().toLowerCase().endsWith("@dataparl.fr") ? EMAIL_EQUIPE : email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(adresse)) return setMessage("Cette adresse ne semble pas valide.");
    if (controleEmail(adresse).suspect) return setMessage("Cette adresse est refusée (boîte jetable).");
    if (captchaRequis && !jetonCaptcha) return setMessage("Valide d'abord la vérification de sécurité ci-dessous.");
    setEnCours(true);
    setMessage("");
    const r = await fetch("/api/auth/lien", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: adresse, suite: destination(), captchaToken: jetonCaptcha ?? undefined }),
    });
    setJetonCaptcha(null);
    reinitialiserTurnstile();
    setEnCours(false);
    if (!r.ok) {
      const j = (await r.json().catch(() => null)) as { error?: string } | null;
      return setMessage(j?.error === "vérification de sécurité manquante" || j?.error === "vérification de sécurité échouée" ? "Valide d'abord la vérification de sécurité." : "Envoi impossible pour cette adresse.");
    }
    memoriserEmailLien(adresse);
    setEtape("attente");
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

        {creation && (
          <>
            <div className="grille-2" style={{ textAlign: "left" }}>
              <div><label htmlFor="c-prenom">Prénom</label>
                <input id="c-prenom" type="text" required maxLength={60} value={prenom} onChange={(e) => setPrenom(e.target.value)} autoComplete="given-name" /></div>
              <div><label htmlFor="c-nom">NOM</label>
                <input id="c-nom" type="text" required maxLength={60} value={nom} onChange={(e) => setNom(e.target.value)} autoComplete="family-name" style={{ textTransform: "uppercase" }} /></div>
            </div>
            <label className="check" style={{ marginTop: 12 }}>
              <input type="checkbox" checked={cgu} onChange={(e) => setCgu(e.target.checked)} />
              <span>
                J&apos;accepte les <a href="/informations-legales/cgu" target="_blank" rel="noopener noreferrer">conditions d&apos;utilisation</a> et la{" "}
                <a href="/informations-legales/confidentialite" target="_blank" rel="noopener noreferrer">politique de données personnelles</a>.
              </span>
            </label>
          </>
        )}

        {etape !== "attente" ? (
          <>
            {surAdmin && (
              <>
                <button className="fournisseur slack" onClick={slack} disabled={enCours || bloque}>
                  <IconeSlack /> Continuer avec Slack
                </button>
                <p className="meta" style={{ margin: "10px 0" }}>
                  L&apos;espace équipe se connecte avec Slack (ou GitHub pour les comptes historiques).
                </p>
              </>
            )}
            <button className="fournisseur" onClick={() => popup("google")} disabled={enCours || bloque}>
              <IconeGoogle /> Continuer avec Google
            </button>
            <button className="fournisseur github" onClick={() => popup("github")} disabled={enCours || bloque}>
              <IconeGitHub /> Continuer avec GitHub
            </button>
            <div className="separateur">ou</div>
            {etape === "choix" && (
              <button className="fournisseur" onClick={() => setEtape("lien")} disabled={enCours || bloque}>
                Continuer avec un email
              </button>
            )}
            {etape === "lien" && (
              <form onSubmit={envoyerLien}>
                <label htmlFor="email">Adresse email</label>
                <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoFocus />
                <Turnstile jetonRecu={setJetonCaptcha} />
                <button type="submit" disabled={enCours || bloque || (captchaRequis && !jetonCaptcha)} style={{ width: "100%" }}>Recevoir un lien de connexion</button>
              </form>
            )}
          </>
        ) : (
          <div>
            <p>Un lien de connexion vient d&apos;être envoyé à <strong>{email}</strong>.</p>
            <p className="meta" style={{ marginTop: 12 }}>
              <button type="button" className="lien" onClick={() => { setEtape("lien"); }}>Utiliser une autre adresse</button>
            </p>
          </div>
        )}

        {message && <p className="erreur">{message}</p>}
      </div>

      <p className="meta" style={{ marginTop: 20 }}><a href="/">← Retour au site</a></p>
    </div>
  );
}
