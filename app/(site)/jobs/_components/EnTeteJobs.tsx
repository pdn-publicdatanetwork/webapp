"use client";

// En-tête de jobs.dataparl.fr : interface propre au module Jobs, distincte du
// site www. Logo DataParl' Jobs, navigation resserrée sur le recrutement et
// bouton d'action rouge « Publier une offre ». Les liens vers le site www
// restent absolus : ce sont d'autres sous-domaines.

export default function EnTeteJobs() {
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
          className="btn btn-jobs-publier"
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
      <style jsx>{`
        .entete-jobs .btn-jobs-publier { background: #C8102E; border-color: #C8102E; }
        .entete-jobs .btn-jobs-publier:hover { background: #A50D27; border-color: #A50D27; }
      `}</style>
    </header>
  );
}
