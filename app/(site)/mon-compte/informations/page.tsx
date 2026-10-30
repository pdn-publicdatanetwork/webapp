"use client";
import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { sessionActuelle } from "@/lib/supabaseBrowser";

// Informations personnelles : prénom et nom du compte. Les comptes créés
// avec Google ne peuvent pas les modifier ici : ils viennent du compte
// Google, qui reste la source de vérité.
type Compte = { email: string; prenom: string; nom: string; fournisseurs: string[] };

export default function Informations() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [compte, setCompte] = useState<Compte | null>(null);
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
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
    appel("/api/compte").then(async (r) => {
      if (!r.ok) return setMessage({ ok: false, texte: "Impossible de charger tes informations." });
      const c: Compte = await r.json();
      setCompte(c);
      setPrenom(c.prenom);
      setNom(c.nom);
    });
  }, [session, appel]);

  if (session === undefined) return <p className="meta">Chargement…</p>;
  if (!session) {
    return (
      <div className="card">
        <h1>Informations personnelles</h1>
        <p>Connecte-toi pour gérer tes informations.</p>
        <a className="btn" href="/connexion?suite=/mon-compte/informations">Se connecter</a>
      </div>
    );
  }
  if (!compte) return <p className="meta">{message?.texte ?? "Chargement…"}</p>;

  const googleSeul = compte.fournisseurs.length === 1 && compte.fournisseurs[0] === "google";

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setEnCours(true);
    setMessage(null);
    const r = await appel("/api/compte/profil", { method: "PUT", body: JSON.stringify({ prenom, nom }) });
    setEnCours(false);
    if (!r.ok) {
      const b = await r.json().catch(() => ({}));
      return setMessage({ ok: false, texte: (b as { error?: string }).error ?? "Enregistrement impossible, réessaie." });
    }
    setCompte({ ...compte!, prenom: prenom.trim(), nom: nom.trim().toUpperCase() });
    setMessage({ ok: true, texte: "C'est enregistré." });
  }

  return (
    <div className="etroit">
      <h1>Informations <span className="surligne">personnelles</span></h1>
      <p><a className="lien" href="/mon-compte">← Mon compte</a></p>
      {message && <p className={message.ok ? "ok" : "erreur"} role="status">{message.texte}</p>}

      <section className="section-compte">
        <h2>Mon identité</h2>
        <p><strong>{compte.email}</strong><br />
          <span className="meta">Ton adresse email ne peut pas être modifiée ici : écris-nous via le <a href="/contact">formulaire de contact</a> si besoin.</span></p>
        {googleSeul ? (
          <div>
            <div className="grille-2" style={{ textAlign: "left" }}>
              <div><label htmlFor="i-prenom">Prénom</label>
                <input id="i-prenom" type="text" value={compte.prenom} readOnly disabled /></div>
              <div><label htmlFor="i-nom">NOM</label>
                <input id="i-nom" type="text" value={compte.nom} readOnly disabled style={{ textTransform: "uppercase" }} /></div>
            </div>
            <p className="meta">Ton prénom et ton nom viennent de ton compte Google : ils ne sont pas modifiables ici.</p>
          </div>
        ) : (
          <form onSubmit={enregistrer}>
            <div className="grille-2" style={{ textAlign: "left" }}>
              <div><label htmlFor="i-prenom">Prénom</label>
                <input id="i-prenom" type="text" required maxLength={60} value={prenom} onChange={(e) => setPrenom(e.target.value)} autoComplete="given-name" /></div>
              <div><label htmlFor="i-nom">NOM</label>
                <input id="i-nom" type="text" required maxLength={60} value={nom} onChange={(e) => setNom(e.target.value)} autoComplete="family-name" style={{ textTransform: "uppercase" }} /></div>
            </div>
            <p><button className="btn" type="submit" disabled={enCours}>Enregistrer</button></p>
          </form>
        )}
        <p className="meta">Ces informations personnifient tes e-mails DataParl' (Daily, Weekly, accusés de réception).</p>
      </section>
    </div>
  );
}