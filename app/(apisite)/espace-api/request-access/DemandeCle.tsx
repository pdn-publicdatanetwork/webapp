"use client";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { sessionActuelle } from "@/lib/supabaseBrowser";

const CGU = "https://www.dataparl.fr/informations-legales/cgu-api";

export default function DemandeCle() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [aDejaCle, setADejaCle] = useState(false);
  const [lu, setLu] = useState(false);
  const [accepte, setAccepte] = useState(false);
  const [usage, setUsage] = useState("");
  const [cle, setCle] = useState<string | null>(null);
  const [erreur, setErreur] = useState("");

  useEffect(() => { sessionActuelle().then(setSession); }, []);
  useEffect(() => {
    if (!session) return;
    fetch("/api/cles", { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then((r) => (r.ok ? r.json() : null)).then((d) => d && setADejaCle(d.cles.length > 0));
  }, [session]);

  if (session === undefined) return <p className="meta">Chargement…</p>;
  if (!session) return <a className="btn" href="/connexion?suite=/request-access">Se connecter ou créer un compte</a>;
  if (cle) {
    return (
      <div className="card" style={{ maxWidth: "none" }}>
        <p style={{ marginTop: 0 }}><strong>Voici ta clé.</strong> Copie-la maintenant : pour ta sécurité, elle ne sera plus jamais affichée.</p>
        <pre>{cle}</pre>
        <button className="secondaire" onClick={() => navigator.clipboard?.writeText(cle)}>Copier</button>{" "}
        <a className="btn" href="/mon-espace-api">Aller à mon espace API</a>
      </div>
    );
  }
  if (aDejaCle) {
    return <p>Tu as déjà une clé. Tu peux la consulter ou la remplacer depuis <a href="/mon-espace-api">ton espace API</a>.</p>;
  }

  async function demander(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setErreur("");
    const r = await fetch("/api/cles", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ nom: usage, cgu: accepte }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return setErreur(d.error ?? "Création impossible, réessaie.");
    setCle(d.cle);
  }

  return (
    <form className="card" onSubmit={demander}>
      <p style={{ marginTop: 0 }}>
        1. Lis les <a href={CGU} target="_blank" rel="noopener noreferrer" onClick={() => setLu(true)}>conditions d&apos;utilisation de l&apos;API</a> (clé personnelle, quota, licence ODbL, usages interdits).
      </p>
      <label className="check">
        <input type="checkbox" disabled={!lu} checked={accepte} onChange={(e) => setAccepte(e.target.checked)} />
        <span>2. J&apos;ai lu et j&apos;accepte les conditions d&apos;utilisation de l&apos;API{!lu && <span className="meta"> (ouvre-les d&apos;abord)</span>}.</span>
      </label>
      <label htmlFor="usage">3. Usage prévu</label>
      <input id="usage" type="text" required maxLength={60} value={usage} onChange={(e) => setUsage(e.target.value)} placeholder="ex. veille pour mon cabinet, article, thèse…" />
      <button type="submit" disabled={!accepte || !usage.trim()}>Obtenir ma clé</button>
      {erreur && <p className="erreur">{erreur}</p>}
    </form>
  );
}
