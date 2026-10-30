"use client";
import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { sessionActuelle } from "@/lib/supabaseBrowser";
import StyleCompte from "../style-compte";

// Mes alertes : le réglage des alertes parlementaires du compte. Réglages
// fins (élus, groupes, commissions) : page /alertes ; newsletter et suivi :
// Données et confidentialité (préférences).
type Freq = "quotidienne" | "hebdomadaire";
type Alertes = { actives: boolean; frequences: Freq[]; chambres: string[]; types: string[]; groupes: string[]; elus: string[]; partis: string[]; commissions: string[] };
type Compte = { email: string; alertes: Alertes };

const CHAMBRES = [
  { v: "assemblee", l: "Assemblée nationale" },
  { v: "senat", l: "Sénat" },
  { v: "europarl", l: "Parlement européen" },
];
const TYPES = [
  { v: "arrivee", l: "Arrivées" },
  { v: "depart", l: "Départs" },
  { v: "transfert", l: "Transferts" },
];

export default function MesAlertes() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [compte, setCompte] = useState<Compte | null>(null);
  const [actives, setActives] = useState(false);
  const [frequences, setFrequences] = useState<Freq[]>(["quotidienne"]);
  const [chambres, setChambres] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
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
    appel("/api/compte").then(async (r) => {
      if (!r.ok) return setMessage({ ok: false, texte: "Impossible de charger tes alertes." });
      const c: Compte = await r.json();
      setCompte(c);
      setActives(c.alertes.actives);
      setFrequences(c.alertes.frequences.length ? c.alertes.frequences : ["quotidienne"]);
      setChambres(c.alertes.chambres);
      setTypes(c.alertes.types);
    });
  }, [session, appel]);

  if (session === undefined) return <p className="meta">Chargement…</p>;
  if (!session) {
    return (
      <div className="card">
        <h1>Mes alertes</h1>
        <p>Connecte-toi pour gérer tes alertes.</p>
        <a className="btn" href="/connexion?suite=/mon-compte/alertes">Se connecter</a>
      </div>
    );
  }
  if (!compte) return <p className="meta">{message?.texte ?? "Chargement…"}</p>;

  const coche = (liste: string[], v: string) => liste.includes(v) ? liste.filter((x) => x !== v) : [...liste, v];
  const cocheFreq = (liste: Freq[], v: Freq) => liste.includes(v) ? liste.filter((x) => x !== v) : [...liste, v];

  async function enregistrer() {
    setEnCours(true);
    setMessage(null);
    const dejaActives = compte!.alertes.actives;
    const r = await appel("/api/compte/alertes", {
      method: "PUT",
      body: JSON.stringify({
        actives,
        frequences: frequences.length ? frequences : ["quotidienne"],
        chambres: chambres.length ? chambres : ["assemblee", "senat"],
        types: types.length ? types : ["arrivee", "depart", "transfert"],
        groupes: compte!.alertes.groupes,
        elus: compte!.alertes.elus,
        partis: compte!.alertes.partis,
        commissions: compte!.alertes.commissions,
        // Déjà abonné : le consentement initial vaut. Nouvelle activation :
        // il faut les deux cases.
        cgu: dejaActives || cgu,
        consentement: dejaActives || consentement,
      }),
    });
    setEnCours(false);
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      return setMessage({ ok: false, texte: (body as { error?: string }).error ?? "Enregistrement impossible, réessaie." });
    }
    setCompte({ ...compte!, alertes: { ...compte!.alertes, actives } });
    setCgu(false);
    setConsentement(false);
    setMessage({ ok: true, texte: "Alertes enregistrées." });
  }

  async function arreter() {
    if (!window.confirm("Ne plus recevoir les alertes parlementaires ? La newsletter et les autres réglages ne sont pas touchés.")) return;
    setEnCours(true);
    const r = await appel("/api/compte/alertes", {
      method: "PUT",
      body: JSON.stringify({
        actives: false,
        frequences: frequences.length ? frequences : ["quotidienne"],
        chambres: chambres.length ? chambres : ["assemblee", "senat"],
        types: types.length ? types : ["arrivee", "depart", "transfert"],
        groupes: compte!.alertes.groupes,
        elus: compte!.alertes.elus,
        partis: compte!.alertes.partis,
        commissions: compte!.alertes.commissions,
      }),
    });
    setEnCours(false);
    if (!r.ok) return setMessage({ ok: false, texte: "Arrêt impossible, réessaie." });
    setActives(false);
    setCompte({ ...compte!, alertes: { ...compte!.alertes, actives: false } });
    setMessage({ ok: true, texte: "C'est noté : tes alertes sont arrêtées." });
  }

  return (
    <div className="etroit">
      <StyleCompte />
      <h1>Mes <span className="surligne">alertes</span></h1>
      <p className="meta fil-compte"><a className="lien" href="/mon-compte">Compte</a> / Mes alertes</p>
      {message && <p className={message.ok ? "ok" : "erreur"} role="status">{message.texte}</p>}

      <section className="section-compte">
        <h2>Alertes parlementaires</h2>
        <label style={{ display: "block", margin: "10px 0" }}><input type="checkbox" checked={actives} onChange={(e) => setActives(e.target.checked)} /> Recevoir les alertes</label>
        {actives && (
          <>
            <p><strong>Fréquence</strong></p>
            <label style={{ display: "block", margin: "6px 0" }}><input type="checkbox" checked={frequences.includes("quotidienne")} onChange={() => setFrequences((f) => cocheFreq(f, "quotidienne"))} /> DataParl' Daily — chaque jour où il y a du mouvement</label>
            <label style={{ display: "block", margin: "6px 0" }}><input type="checkbox" checked={frequences.includes("hebdomadaire")} onChange={() => setFrequences((f) => cocheFreq(f, "hebdomadaire"))} /> DataParl' Weekly — le récapitulatif du lundi</label>
            <p><strong>Chambres suivies</strong></p>
            {CHAMBRES.map((c) => (
              <label key={c.v} style={{ display: "block", margin: "6px 0" }}><input type="checkbox" checked={chambres.includes(c.v)} onChange={() => setChambres((x) => coche(x, c.v))} /> {c.l}</label>
            ))}
            <p><strong>Types de mouvement</strong></p>
            {TYPES.map((t) => (
              <label key={t.v} style={{ display: "block", margin: "6px 0" }}><input type="checkbox" checked={types.includes(t.v)} onChange={() => setTypes((x) => coche(x, t.v))} /> {t.l}</label>
            ))}
            {!compte.alertes.actives && (
              <>
                <label style={{ display: "block", margin: "14px 0 6px" }}><input type="checkbox" checked={cgu} onChange={(e) => setCgu(e.target.checked)} /> J'accepte les <a href="/informations-legales/cgu">conditions d'utilisation</a></label>
                <label style={{ display: "block", margin: "6px 0" }}><input type="checkbox" checked={consentement} onChange={(e) => setConsentement(e.target.checked)} /> Je consens à recevoir les e-mails DataParl'</label>
              </>
            )}
          </>
        )}
        <p style={{ marginTop: 14 }}>
          <button className="btn" onClick={enregistrer} disabled={enCours}>Enregistrer</button>{" "}
          {compte.alertes.actives && <button className="danger" onClick={arreter} disabled={enCours}>Arrêter mes alertes</button>}
        </p>
        <p className="meta">
          <a href="/alertes">Critères avancés (élus suivis, groupes, commissions) →</a>
          <br />
          Newsletter et suivi : <a href="/mon-compte/preferences">Données et confidentialité</a>
        </p>
      </section>
    </div>
  );
}
