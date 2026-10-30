"use client";
import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { authBrowser, sessionActuelle } from "@/lib/supabaseBrowser";

// Données et confidentialité : newsletter et suivi (pixels d'ouverture,
// liens tracés), indépendants des alertes ; export et suppression du compte.
type Etat = { newsletter: boolean; suivi: boolean };
type Compte = { email: string; alertes: { actives: boolean } };

export default function DonneesConfidentialite() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [etat, setEtat] = useState<Etat | null>(null);
  const [compte, setCompte] = useState<Compte | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [enCours, setEnCours] = useState(false);

  const appel = useCallback(async (url: string, init: RequestInit = {}) => {
    return fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init.headers ?? {}), Authorization: `Bearer ${(await sessionActuelle())?.access_token}` } });
  }, []);

  useEffect(() => {
    sessionActuelle().then(setSession);
  }, []);

  useEffect(() => {
    if (!session) return;
    appel("/api/compte/communications").then(async (r) => {
      if (r.ok) setEtat(await r.json());
    });
    appel("/api/compte").then(async (r) => {
      if (r.ok) setCompte(await r.json());
    });
  }, [session, appel]);

  if (session === undefined) return <p className="meta">Chargement…</p>;
  if (!session) {
    return (
      <div className="card">
        <h1>Données et confidentialité</h1>
        <p>Connecte-toi pour gérer tes communications et tes données.</p>
        <a className="btn" href="/connexion?suite=/mon-compte/preferences">Se connecter</a>
      </div>
    );
  }

  async function enregistrer() {
    if (!etat) return;
    setEnCours(true);
    setMessage(null);
    const r = await appel("/api/compte/communications", {
      method: "PUT",
      body: JSON.stringify({ newsletter: etat.newsletter, tracking: etat.suivi }),
    });
    setEnCours(false);
    if (!r.ok) {
      const b = await r.json().catch(() => ({}));
      return setMessage({ ok: false, texte: (b as { error?: string }).error ?? "Enregistrement impossible, réessaie." });
    }
    setMessage({ ok: true, texte: "C'est enregistré : les prochains envois suivront ces réglages." });
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
      <h1>Données et <span className="surligne">confidentialité</span></h1>
      <p><a className="lien" href="/mon-compte">← Mon compte</a></p>
      {message && <p className={message.ok ? "ok" : "erreur"} role="status">{message.texte}</p>}

      <section className="section-compte">
        <h2>Mes communications</h2>
        {etat ? (
          <>
            <label style={{ display: "block", margin: "10px 0" }}>
              <input type="checkbox" checked={etat.newsletter} onChange={(e) => setEtat({ ...etat, newsletter: e.target.checked })} />
              La newsletter DataParl' — les nouveautés du service et les coulisses
            </label>
            <label style={{ display: "block", margin: "6px 0" }}>
              <input type="checkbox" checked={etat.suivi} onChange={(e) => setEtat({ ...etat, suivi: e.target.checked })} />
              Le suivi des e-mails (pixels d'ouverture et liens tracés) — décoche pour ne plus être mesuré
            </label>
            <p><button className="btn" onClick={enregistrer} disabled={enCours}>Enregistrer</button></p>
          </>
        ) : (
          <p className="meta">Chargement…</p>
        )}
        <p className="meta">
          Les alertes parlementaires (Daily, Weekly) ont leur propre page : <a href="/mon-compte/alertes">Mes alertes</a>.
        </p>
      </section>

      <section className="section-compte">
        <h2>Mes données</h2>
        <p>Télécharge tout ce que DataParl' conserve sur toi (format JSON), ou supprime ton compte.</p>
        <button className="secondaire" onClick={exporter}>Exporter mes données</button>{" "}
        <button className="danger" onClick={supprimer} disabled={enCours}>Supprimer mon compte</button>
        <p className="meta">
          La suppression efface ton compte, tes alertes et tes clés API. La trace de tes consentements est conservée 3 ans,
          comme prévu par la <a href="/informations-legales/confidentialite">politique de données personnelles</a>.
        </p>
      </section>
    </div>
  );
}