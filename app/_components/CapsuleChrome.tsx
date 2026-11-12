"use client";
import { useEffect, useState } from "react";
import { sessionActuelle, deconnexion as fermerSession } from "@/lib/supabaseBrowser";

// Chrome de la capsule my.dataparl.fr (« Mon espace ») : en-tête et pied de
// page spécifiques, volontairement différents du site public — la capsule
// est un outil privé, pas une page de découverte. Même charte DataParl' que
// le site (Spectral + DM Sans auto-hébergées, surligneur jaune, bleu encre),
// servie par les variables CSS et classes existantes ; seuls les éléments
// propres à la capsule (pastilles de statut, menu avatar, liens des sites)
// ont leurs styles dédiés, préfixés .capsule-.

type EtatCapsule = { connecte: boolean; email: string; prenom: string; cleActive: boolean };
const ETAT_VIDE: EtatCapsule = { connecte: false, email: "", prenom: "", cleActive: false };

// Session + compte + présence d'une clé API : alimente l'avatar, le menu et
// les pastilles de l'en-tête, et la ligne « Connecté en tant que » du pied.
function useEtatCapsule(): EtatCapsule {
  const [etat, setEtat] = useState<EtatCapsule>(ETAT_VIDE);
  useEffect(() => {
    let vivant = true;
    (async () => {
      const s = await sessionActuelle().catch(() => null);
      if (!vivant) return;
      if (!s) { setEtat(ETAT_VIDE); return; }
      let email = ""; let prenom = ""; let cleActive = false;
      try {
        const r = await fetch("/api/compte", { headers: { Authorization: `Bearer ${s.access_token}` } });
        if (r.ok) { const d = await r.json(); email = d.email ?? ""; prenom = d.prenom ?? ""; }
      } catch { /* silencieux : l'en-tête reste utilisable */ }
      try {
        const r = await fetch("/api/cles", { headers: { Authorization: `Bearer ${s.access_token}` } });
        if (r.ok) { const d = await r.json(); cleActive = Array.isArray(d.cles) && d.cles.length > 0; }
      } catch { /* silencieux */ }
      if (vivant) setEtat({ connecte: true, email, prenom, cleActive });
    })();
    return () => { vivant = false; };
  }, []);
  return etat;
}

// Les trois sites DataParl', accessibles depuis la capsule (sous-domaines :
// la session .dataparl.fr est partagée, pas de reconnexion).
const SITES = [
  { href: "https://www.dataparl.fr/", nom: "dataparl.fr", couleur: "var(--bleu)" },
  { href: "https://jobs.dataparl.fr/", nom: "jobs.dataparl.fr", couleur: "#9333EA" },
  { href: "https://api.dataparl.fr/", nom: "api.dataparl.fr", couleur: "#10B981" },
];

export function CapsuleEntete() {
  const etat = useEtatCapsule();
  const initiale = (etat.prenom || etat.email || "D")[0].toUpperCase();
  return (
    <>
      <style>{`
        .capsule-entete { display: flex; align-items: center; justify-content: space-between; gap: 18px; min-height: 64px; }
        .capsule-logo { display: flex; align-items: baseline; gap: 8px; text-decoration: none; color: var(--ink); }
        .capsule-sites { display: flex; align-items: center; gap: 2px; flex: 1; justify-content: center; }
        .capsule-site-lien { display: inline-flex; align-items: center; gap: 7px; text-decoration: none; color: var(--muted); font-size: .84rem; font-weight: 500; padding: 7px 12px; border-radius: 8px; transition: background .15s, color .15s; }
        .capsule-site-lien:hover { background: var(--bg); color: var(--ink); }
        .capsule-point { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .capsule-droite { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
        .capsule-pill { display: inline-flex; align-items: center; gap: 6px; background: #ECFDF5; color: #047857; font-size: .78rem; font-weight: 500; padding: 5px 10px; border-radius: 20px; white-space: nowrap; }
        .capsule-pill::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: #10B981; }
        .capsule-menu { position: relative; }
        .capsule-menu summary { list-style: none; cursor: pointer; display: inline-flex; }
        .capsule-menu summary::-webkit-details-marker { display: none; }
        .capsule-avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--ink); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: .9rem; }
        .capsule-menu-panneau { position: absolute; right: 0; top: calc(100% + 8px); background: var(--card); border: 1px solid var(--line); border-radius: 10px; box-shadow: 0 10px 30px rgba(7,26,65,.15); min-width: 220px; padding: 10px; z-index: 120; }
        .capsule-menu-panneau p { margin: 4px 8px 10px; font-size: .85rem; word-break: break-all; }
        .capsule-menu-panneau a, .capsule-menu-panneau button { display: block; width: 100%; text-align: left; padding: 9px 8px; font: inherit; font-size: .9rem; color: var(--ink); background: transparent; border: 0; border-radius: 7px; cursor: pointer; text-decoration: none; }
        .capsule-menu-panneau a:hover, .capsule-menu-panneau button:hover { background: var(--bg); }
        .capsule-menu-panneau button { color: #C8102E; }
        @media (max-width: 900px) { .capsule-sites { display: none; } }
      `}</style>
      <header className="site" style={{ background: "var(--card)" }}>
        <div className="wrap capsule-entete">
          <a className="capsule-logo" href="/" aria-label="Mon espace DataParl', accueil" style={{ fontFamily: "var(--font-spectral), 'Spectral', Georgia, serif", fontWeight: 700, fontSize: "1.15rem" }}>
            Data<span className="surligne">Parl&apos;</span>
            <span style={{ color: "var(--bleu)", fontSize: ".8rem", fontWeight: 600 }}>Mon espace</span>
          </a>
          <nav className="capsule-sites" aria-label="Les sites DataParl'">
            {SITES.map((s) => (
              <a key={s.href} className="capsule-site-lien" href={s.href}>
                <span className="capsule-point" style={{ background: s.couleur }} aria-hidden="true" />
                {s.nom}
              </a>
            ))}
          </nav>
          <div className="capsule-droite">
            {etat.cleActive && <span className="capsule-pill">Clé API active</span>}
            {etat.connecte ? (
              <details className="capsule-menu">
                <summary aria-label="Menu du compte"><span className="capsule-avatar">{initiale}</span></summary>
                <div className="capsule-menu-panneau">
                  {etat.email && <p className="meta">{etat.email}</p>}
                  <a href="/">Ma capsule</a>
                  <a href="/mon-compte/preferences">Préférences</a>
                  <button type="button" onClick={async () => { await fermerSession(); window.location.replace("/"); }}>Se déconnecter</button>
                </div>
              </details>
            ) : (
              <a className="btn" href="/connexion?suite=/">Se connecter</a>
            )}
          </div>
        </div>
      </header>
    </>
  );
}

export function CapsulePied() {
  const etat = useEtatCapsule();
  return (
    <>
      <style>{`
        .capsule-pied { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; font-size: .8rem; }
        .capsule-pied a { color: var(--muted); text-decoration: none; }
        .capsule-pied a:hover { color: var(--ink); }
        .capsule-pied nav { display: flex; gap: 18px; flex-wrap: wrap; }
      `}</style>
      <footer className="site" style={{ background: "var(--card)" }}>
        <div className="wrap capsule-pied">
          <span className="meta">
            {etat.connecte && etat.email
              ? <>Connecté en tant que <strong>{etat.email}</strong></>
              : <>DataParl&apos; · Mon espace</>}
          </span>
          <nav aria-label="Liens utiles">
            <a href="https://api.dataparl.fr/docs">Documentation API</a>
            <a href="https://status.dataparl.fr">Statut des services</a>
            <a href="https://www.dataparl.fr/informations-legales">Informations légales</a>
            <a href="/mon-compte/preferences">Supprimer mon compte</a>
          </nav>
        </div>
      </footer>
    </>
  );
}
