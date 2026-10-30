"use client";
import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { authBrowser, sessionActuelle } from "@/lib/supabaseBrowser";
import StyleCompte from "../style-compte";

// Données et confidentialité : export et suppression du compte. Les
// e-mails reçus (newsletter, alertes, suivi) se gèrent dans
// Communications ; les critères des alertes dans Mes alertes.
export default function DonneesConfidentialite() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [enCours, setEnCours] = useState(false);

  const appel = useCallback(async (url: string, init: RequestInit = {}) => {
    return fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init.headers ?? {}), Authorization: `Bearer ${(await sessionActuelle())?.access_token}` } });
  }, []);

  useEffect(() => {
    sessionActuelle().then(setSession);
  }, []);

  if (session === undefined) return <p className="meta">Chargement…</p>;
  if (!session) {
    return (
      <div className="card">
        <h1>Données et confidentialité</h1>
        <p>Connecte-toi pour gérer tes données.</p>
        <a className="btn" href="/connexion?suite=/mon-compte/preferences">Se connecter</a>
      </div>
    );
  }

  async function exporter() {
    const r = await appel("/api/compte/export");
    if (!r.ok) return setMessage({ ok: false, texte: "Export impossible, réessaie." });
    const url = URL.createObjectURL(await r.blob());
    const a = document.createElement("a");
    a.href = url;
    a.download = "dataparl-mes-donnees.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function supprimer() {
    if (!window.confirm("Supprimer définitivement ton compte, tes alertes et tes clés API ? Cette action est irréversible.")) return;
    setEnCours(true);
    const r = await appel("/api/compte", { method: "DELETE" });
    setEnCours(false);
    if (!r.ok) return setMessage({ ok: false, texte: "Suppression impossible, réessaie plus tard." });
    await authBrowser().auth.signOut();
    window.location.replace("/?compte=supprime");
  }

  return (
    <div className="etroit">
      <StyleCompte />
      <h1>Données et <span className="surligne">confidentialité</span></h1>
      <p className="meta fil-compte"><a className="lien" href="/mon-compte">Compte</a> / Données et confidentialité</p>
      {message && <p className={message.ok ? "ok" : "erreur"} role="status">{message.texte}</p>}

      <section className="section-compte">
        <h2>Mes données</h2>
        <p>Télécharge tout ce que DataParl' conserve sur toi (format JSON), ou supprime ton compte.</p>
        <button className="secondaire" onClick={exporter}>Exporter mes données</button>{" "}
        <button className="danger" onClick={supprimer} disabled={enCours}>Supprimer mon compte</button>
        <p className="meta">
          La suppression efface ton compte, tes alertes et tes clés API. La trace de tes consentements est conservée 3 ans,
          comme prévu par la <a href="/informations-legales/confidentialite">politique de données personnelles</a>.
        </p>
        <p className="meta">
          Pour gérer les e-mails reçus, voir <a href="/mon-compte/communications">Communications</a>.
        </p>
      </section>
    </div>
  );
}
