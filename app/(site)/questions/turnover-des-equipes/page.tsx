import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Combien de temps reste-t-on collaborateur parlementaire ?",
  description: "Durée moyenne et taux de renouvellement des équipes parlementaires : départs et arrivées par chambre et par groupe.",
  alternates: { canonical: "/questions/turnover-des-equipes" },
};
export const revalidate = 3600;

export default function Page() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [{
      "@type": "Question",
      name: "Combien de temps reste-t-on collaborateur parlementaire ?",
      acceptedAnswer: { "@type": "Answer", text: "Le renouvellement des équipes parlementaires est suivi en continu par DataParl’ : chaque mois, des collaborateurs arrivent et départent dans les cabinets. Le taux de renouvellement sur 12 mois (départs rapportés à l’effectif moyen) varie fortement selon les chambres et les groupes politiques." },
    }],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <p className="meta"><a href="/questions">&larr; Toutes les questions</a></p>
      <h1>Combien de temps reste-t-on collaborateur parlementaire ?</h1>
      <p className="lead">Le renouvellement des équipes parlementaires est suivi en continu par DataParl’ : chaque mois, des collaborateurs arrivent et départent dans les cabinets. Le taux de renouvellement sur 12 mois (départs rapportés à l’effectif moyen) varie fortement selon les chambres et les groupes politiques.</p>
      <h2>Comment le mesure-t-on ?</h2>\n      <p>Taux de renouvellement sur 12 mois = départs / effectif moyen, établi à partir des dates d’entrée et de sortie publiées dans les listes officielles. <a href="https://www.dataparl.fr/vigiparl/methode">Méthode complète</a>.</p>\n      <h2>Voir le classement</h2>\n      <p>Le renouvellement de chaque équipe, mois par mois, et le classement des élus : <a href="https://www.dataparl.fr/vigiparl">VigiParl’</a>.</p>
      <p className="meta">Source : listes officielles des collaborateurs publièes par l'Assemblée nationale et le Sénat, suivies par <a href="https://www.dataparl.fr">DataParl'</a>.</p>
    </>
  );
}
