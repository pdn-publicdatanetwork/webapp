"use client";
import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { sessionActuelle } from "@/lib/supabaseBrowser";
import StyleCompte from "../style-compte";

// Communications : tout ce qui concerne les e-mails DataParl' au même
// endroit — newsletter, alertes parlementaires par email et suivi
(pixels d'ouverture, liens tracés). Les critères des alertes (chambres,
// types, élus suivis) restent dans Mes alertes ; l'export et la
// suppression du compte restent dans Données et confidentialité.
type Etat = { newsletter: boolean; suivi: boolean };
type Freq = "quotidienne" | "hebdomadaire";
type Alertes = { actives: boolean; frequences: Freq[]; chambres: string[]; types: string[]; groupes: string[]; elus: string[]; partis: string[]; commissions: string[] };
type Compte = { email: string; alertes: Alertes };

export default function Communications() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [etat, setEtat] = useState<Etat | null>(null);
  const [compte, setCompte] = useState<Compte | null>(null);
  const [newsletter, setNewsletter] = useState(false);
  const [suivi, setSuivi] = useState(false);
  const [alertesActives, setAlertesActives] = useState(false);
  const [cgu, setCgu] = useState(false);
  const [consentement, setConsentement] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [enCours, setEnCours] = useState(false);

  const appel = useCallback(async (url: string, init: RequestInit = {}) => {
    // Le jeton est relu à chaque appel : la session en mémoire peut être
    // expirée (onglet en arrière-plan).
    return fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init.headers ?? {}), Authorization: `Bearer ${(await sessionActuelle())?.access_token}` } });
  }, []);

  useEffect(() => {
    sessionActuelle().then(setSession);
  }, []);

  useEffect(() => {
    if (!session) return;
    appel("/api/compte/communications").then(async (r) => {
      if (!r.ok) return;
      const e: Etat = await r.json();
      setEtat(e);
      setNewsletter(e.newsletter);
      setSuivi(e.suivi);
    });
    appel("/api/compte").then(async (r) => {
      if (!r.ok) return;
      const c: Compte = await r.json();
      setCompte(c);
      setAlertesActives(c.alertes.actives);
    });
  }, [session, appel]);

  if (session === undefined) return <p className="meta">Chargement…</p>;
  if (!session) {
    return (
      <div className="card">
        <h1>Communications</h1>
        <p>Connecte-toi pour gérer les e-mails que tu reçois.</p>
        <a className="btn" href="/connexion?suite=/mon-compte/communications">Se connecter</a>
      </div>
    );
  }
  if (!etat || !compte) return <p className="meta">{message?.texte ?? "Chargement…"}</p>;

  async function enregistrer() {
    setEnCours(true);
    setMessage(null);
    const dejaActives = compte!.alertes.actives;
    // Le canal (alertes on/off) et les préférences email sont deux routes
    // distinctes : on ne touche /api/compte/alertes que si l'état change.
    if (alertesActives !== dejaActives) {
      if (alertesActives && !(dejaActives || (cgu && consentement))) {
        setEnCours(false);
        return setMessage({ ok: false, texte: "Coche les conditions d'utilisation et le consentement pour activer les alertes." });
      }
      const a = compte!.alertes;
      const r = await appel("/api/compte/alertes", {
        method: "PUT",
        body: JSON.stringify({
          actives: alertesActives,
          frequences: a.frequences.length ? a.frequences : ["quotidienne"],
          chambres: a.chambres.length ? a.chambres : ["assemblee", "senat"],
          types: a.types.length ? a.types : ["arrivee", "depart", "transfert"],
          groupes: a.groupes,
          elus: a.elus,
          partis: a.partis,
          commissions: a.commissions,
          // Déjà abonné : le consentement initial vaut. Nouvelle activation
          // (arrêt puis réactivation comprise) : il faut les deux cases.
          cgu: dejaActives || cgu,
          consentement: dejaActives || consentement,
        }),
      });
      if (!r.ok) {
        setEnCours(false);
        const b = await r.json().catch(() => ({}));
        return setMessage({ ok: false, texte: (b as { error?: string }).error ?? "Enregistrement impossible, réessaie." });
      }
      setCompte({ ...compte!, alertes: { ...compte!.alertes, actives: alertesActives } });
    }
    const r2 = await appel("/api/compte/communications", {
      method: "PUT",
      body: JSON.stringify({ newsletter, tracking: suivi }),
    });
    setEnCours(false);
    if (!r2.ok) {
      const b = await r2.json().catch(() => ({}));
      return setMessage({ ok: false, texte: (b as { error?: string }).error ?? "Enregistrement impossible, réessaie." });
    }
    setCgu(false);
    setConsentement(false);
    setMessage({ ok: true, texte: "C'est enregistré : les prochains envois suivront ces réglages." });
  }

  return (
    <div className="etroit">
      <StyleCompte />
      <h1><span className="surligne">Communications</span></h1>
      <p className="meta fil-compte"><a className="lien" href="/mon-compte">Compte</a> / Communications</p>
      {message && <p className={message.ok ? "ok" : "erreur"} role="status">{message.texte}</p>}

      <section className="section-compte">
        <h2>Emails DataParl'</h2>
        <label style={{ display: "block", margin: "10px 0" }}>
          <input type="checkbox" checked={newsletter} onChange={(e) => setNewsletter(e.target.checked)} />
          La newsletter DataParl' — les nouveautés du service et les coulisses
        </label>
        <label style={{ display: "block", margin: "6px 0" }}>
          <input type="checkbox" checked={alertesActives} onChange={(e) => setAlertesActives(e.target.checked)} />
          Les alertes parlementaires — Daily et/ou Weekly, selon tes réglages dans <a href="/mon-compte/alertes">Mes alertes</a>
        </label>
        {!compte.alertes.actives && alertesActives && (
          <>
            <label style={{ display: "block", margin: "14px 0 6px" }}><input type="checkbox" checked={cgu} onChange={(e) => setCgu(e.target.checked)} /> J'accepte les <a href="/informations-legales/cgu">conditions d'utilisation</a></label>
            <label style={{ display: "block", margin: "6px 0" }}><input type="checkbox" checked={consentement} onChange={(e) => setConsentement(e.target.checked)} /> Je consens à recevoir les e-mails DataParl'</label>
          </>
        )}
        <label style={{ display: "block", margin: "6px 0" }}>
          <input type="checkbox" checked={suivi} onChange={(e) => setSuivi(e.target.checked)} />
          Le suivi des e-mails — pixels d'ouverture et liens tracés. Décoche pour ne plus être mesuré.
        </label>
        <p style={{ marginTop: 14 }}><button className="btn" onClick={enregistrer} disabled={enCours}>Enregistrer</button></p>
        <p className="meta">
          Les critères des alertes (chambres, types de mouvement, élus suivis) se règlent dans <a href="/mon-compte/alertes">Mes alertes</a>.
        </p>
      </section>
    </div>
  );
}
