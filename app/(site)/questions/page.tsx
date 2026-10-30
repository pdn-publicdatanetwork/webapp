import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Questions sur les collaborateurs parlementaires",
  description: "Réponses factuelles et chiffrées sur les collaborateurs des députés et sénateurs : rôle, nombre, mixité des équipes, renouvellement.",
  alternates: { canonical: "/questions" },
};
export const revalidate = 3600;

const QUESTIONS: { href: string; titre: string; extrait: string }[] = [
  { href: "/questions/qui-sont-les-collaborateurs-parlementaires", titre: "Qui sont les collaborateurs parlementaires ?", extrait: "Définition, statut, nombre et rôle des collaborateurs des députés et sénateurs." },
  { href: "/questions/combien-de-collaborateurs", titre: "Combien de collaborateurs a un député ou un sénateur ?", extrait: "Effectifs moyens par chambre, plafonds et pratiques réelles." },
  { href: "/questions/mixite-des-equipes", titre: "Quelle est la mixité des équipes parlementaires ?", extrait: "Part de femmes parmi les collaborateurs, par groupe et par chambre." },
  { href: "/questions/turnover-des-equipes", titre: "Combien de temps reste-t-on collaborateur parlementaire ?", extrait: "Taux de renouvellement des équipes sur 12 mois, par chambre et par groupe." },
];

export default function Questions() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: QUESTIONS.map((q) => ({
      "@type": "Question", name: q.titre,
      acceptedAnswer: { "@type": "Answer", text: q.extrait },
    })),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <h1>Questions sur les collaborateurs parlementaires</h1>
      <p className="lead">
        Réponses factuelles aux questions les plus fréquentes sur les équipes des parlementaires français,
        d&apos;après les listes officielles publiées par l&apos;Assemblée nationale, le Sénat et le Parlement européen.
      </p>
      <ul className="organes">
        {QUESTIONS.map((q) => (
          <li key={q.href}><Link href={q.href}>{q.titre}</Link><span className="meta"> ({q.extrait})</span></li>
        ))}
      </ul>
    </>
  );
}
