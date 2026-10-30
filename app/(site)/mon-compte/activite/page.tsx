"use client";
import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { authBrowser, sessionActuelle } from "@/lib/supabaseBrowser";

// Mon activité : les traces récentes sur les pages du compte (appareil et
// adresse IP), conservées 90 jours. Chaque visite de cette page est notée.
type Ligne = { cree_le: string; ip: string | null; agent: string | null };

function appareil(agent: string | null): string {
  if (!agent) return "Appareil inconnu";
  const sys = /Windows/.test(agent) ? "Windows" : /Macintosh|Mac OS/.test(agent) ? "Mac" : /iPhone|iPad/.test(agent) ? "iPhone/iPad" : /Android/.test(agent) ? "Android" : /Linux/.test(agent) ? "Linux" : "Appareil inconnu";
  const nav = /Edg\//.test(agent) ? "Edge" : /OPR|Opera/.test(agent) ? "Opera" : /Firefox/.test(agent) ? "Firefox" : /Chrome/.test(agent) ? "Chrome" : /Safari/.test(agent) ? "Safari" : "navigateur inconnu";
  return sys + " · " + nav;
}

export default function MonActivite() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [lignes, setLignes] = useState<Ligne[] | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);

  const appel = useCallback(async (url: string, init: RequestInit = {}) => {
    return fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init.headers ?? {}), Authorization: `Bearer ${(await sessionActuelle())?.access_token}` } });
  }, []);

  useEffect(() => {
    sessionActuelle().then(setSession);
  }, []);

  useEffect(() => {
    if (!session) return;
    appel("/api/compte/activite").then(async (r) => {
      if (!r.ok) {
        setMessage({ ok: false, texte: "Impossible de charger ton activité." });
        setLignes([]);
        return;
      }
      const b = (await r.json()) as { activite: Ligne[] };
      setLignes(b.activite ?? []);
    });
  }, [session, appel]);

  if (session === undefined) return <p className="meta">Chargement…</p>;
  if (!session) {
    return (
      <div className="card">
        <h1>Mon activité</h1>
        <p>Connecte-toi pour voir ton activité.</p>
        <a className="btn" href="/connexion?suite=/mon-compte/activite">Se connecter</a>
      </div>
    );
  }

  async function deconnecterPartout() {
    if (!window.confirm("Se déconnecter de tous les appareils ? Tu devras te reconnecter partout.")) return;
    await authBrowser().auth.signOut({ scope: "global" });
    window.location.replace("/");
  }

  const fmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="etroit">
      <h1>Mon <span className="surligne">activité</span></h1>
      <p className="meta"><a className="lien" href="/mon-compte">Compte</a> / Mon activité</p>
      {message && <p className={message.ok ? "ok" : "erreur"} role="status">{message.texte}</p>}

      <section className="section-compte">
        <h2>Traces récentes</h2>
        {lignes === null ? (
          <p className="meta">Chargement…</p>
        ) : lignes.length === 0 ? (
          <p className="meta">Aucune trace pour l'instant.</p>
        ) : (
          <ul style={{ paddingLeft: 18, margin: 0 }}>
            {lignes.map((l, i) => (
              <li key={l.cree_le + i} style={{ margin: "8px 0" }}>
                <strong>{fmt.format(new Date(l.cree_le))}</strong> — {appareil(l.agent)}
                {l.ip ? <span className="meta"> · {l.ip}</span> : null}
                {i === 0 ? <span className="meta"> · cet appareil, maintenant</span> : null}
              </li>
            ))}
          </ul>
        )}
        <p style={{ marginTop: 14 }}>
          <button className="danger" onClick={deconnecterPartout}>Se déconnecter de tous les appareils</button>
        </p>
        <p className="meta">
          Traces conservées 90 jours. Pour l'instant, seules tes visites sur les pages de ton compte sont notées ;
          les connexions elles-mêmes seront tracées à la prochaine mise à jour.
        </p>
      </section>
    </div>
  );
}