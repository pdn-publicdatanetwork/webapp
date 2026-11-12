import type { Metadata } from "next";

export const metadata: Metadata = { title: "DataParl' Jobs", robots: { index: false, follow: false } };

// Rubrique Jobs du centre de compte my.dataparl.fr : les fonctions de
// DataParl' Jobs présentées dans la charte du compte ; chaque ligne mène au
// service correspondant sur jobs.dataparl.fr (l'onglet y est présélectionné
// grâce au paramètre ?onglet=, que le middleware jobs laisse passer).

export default function JobsDuCompte() {
  const lignes = [
    { titre: "Suivi des candidatures", resume: "Tes candidatures aux offres de collaborateur parlementaire", href: "https://jobs.dataparl.fr/mon-compte?onglet=candidatures" },
    { titre: "Mes alertes Jobs", resume: "Les nouvelles offres qui t'intéressent, par e-mail", href: "https://jobs.dataparl.fr/mon-compte?onglet=alertes" },
    { titre: "Mon profil et mon CV", resume: "Compétences et matching IA avec les offres", href: "https://jobs.dataparl.fr/mon-compte?onglet=profil" },
    { titre: "Parcourir les offres", resume: "Toutes les offres publiées sur DataParl' Jobs", href: "https://jobs.dataparl.fr/" },
    { titre: "Analyser mon CV avec le matching IA", resume: "Extraire tes compétences et trouver les offres qui correspondent", href: "https://jobs.dataparl.fr/matching" },
  ];
  return (
    <div className="etroit">
      <style>{`
        .compte-item { display: flex; align-items: center; gap: 16px; min-height: 76px; padding: 12px 14px; margin: 0 -14px; text-decoration: none; border-radius: 10px; transition: background 0.15s ease; }
        .compte-item + .compte-item { border-top: 1px solid rgba(15, 23, 42, 0.06); }
        .compte-item:hover, .compte-item:focus-visible { background: rgba(15, 23, 42, 0.05); }
      `}</style>
      <h1>DataParl&apos; <span className="surligne">Jobs</span></h1>
      <p className="meta" style={{ margin: "0 0 20px" }}>
        Tes candidatures, tes alertes et ton profil de collaborateur parlementaire.{" "}
        <a href="/">Retour au compte</a>.
      </p>
      <div style={{ borderTop: "1px solid rgba(15, 23, 42, 0.08)" }}>
        {lignes.map((l) => (
          <a key={l.titre} className="compte-item" href={l.href}>
            <span style={{ flex: 1 }}>
              <span style={{ display: "block", fontSize: 16, fontWeight: 600, color: "#1A1A1A" }}>{l.titre}</span>
              <span style={{ display: "block", fontSize: 14, color: "#5C5C5C", marginTop: 2 }}>{l.resume}</span>
            </span>
            <span aria-hidden="true" style={{ color: "#9A9A9A", fontSize: 20, lineHeight: 1 }}>&#8599;</span>
          </a>
        ))}
      </div>
    </div>
  );
}
