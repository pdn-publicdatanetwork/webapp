"use client";

import { useEffect } from "react";

// En-tête de DataParl' Jobs : interface propre au module, distincte du site
// www. Pose la classe .js sur <html> : elle active la charte violet / lavande
// du module (bloc :root.jobs de globals.css). Navigation resserrée sur le
// recrutement, bouton d'action « Publier une offre » en violet (CTA principal).

export default function EnTeteJobs() {
  useEffect(() => {
    document.documentElement.classList.add("js");
    return () => document.documentElement.classList.remove("js");
  }, []);

  const liens = [
    { href: "/", label: "Offres" },
    { href: "/old-jobs", label: "Anciennes offres" },
    { href: "https://www.dataparl.fr/", label: "DataParl'" },
  ];
  return (
    <header className="site entete-jobs">
      <div className="wrap">
        <a className="logo" href="/" aria-label="DataParl' Jobs, accueil">
          Data<span className="surligne">Parl&apos;</span>{" "}
          <span style={{ color: "var(--bleu)", fontWeight: 700 }}>Jobs</span>
        </a>
        <nav className="nav-principal" aria-label="Navigation DataParl' Jobs">
          {liens.map((l) => (
            <a key={l.href} href={l.href}>{l.label}</a>
          ))}
        </nav>
        <a
          className="btn"
          href="/proposer"
          style={{ marginTop: 0, padding: "8px 16px", fontSize: ".92rem", whiteSpace: "nowrap" }}
        >
          Publier une offre
        </a>
        <details className="menu-mobile">
          <summary aria-label="Ouvrir le menu de navigation">☰</summary>
          <nav aria-label="Navigation DataParl' Jobs mobile">
            {liens.map((l) => (
              <a key={l.href} href={l.href}>{l.label}</a>
            ))}
            <a href="/proposer">Publier une offre</a>
          </nav>
        </details>
      </div>
    </header>
  );
}
