import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Questions fréquentes sur les collaborateurs parlementaires",
  description: "Qui sont les collaborateurs des députés et sénateurs, combien sont-ils, comment retrouver une équipe : les réponses, avec les chiffres officiels.",
  alternates: { canonical: "/faq" },
};

const QUESTIONS: { q: string; a: string; href: string }[] = [
  {
    q: "Qui sont les collaborateurs parlementaires ?",
    a: "Les collaborateurs parlementaires sont les personnes employées par chaque député, sénateur ou eurodéputé français pour l’aider dans son travail : suivi des dossiers, rédaction, relations avec les électeurs et les administrations. Leurs noms figurent sur les listes officielles publiées par l’Assemblée nationale, le Sénat et le Parlement européen.",
    href: "/questions/qui-sont-les-collaborateurs-parlementaires",
  },
  {
    q: "Combien de collaborateurs a un député ou un sénateur ?",
    a: "En général entre un et cinq collaborateurs par parlementaire, répartis entre Paris et la circonscription, selon l’enveloppe de crédits dont dispose chaque élu. Les effectifs exacts, équipe par équipe, sont suivis en continu par DataParl’.",
    href: "/questions/combien-de-collaborateurs",
  },
  {
    q: "Quelle est la mixité des équipes parlementaires ?",
    a: "La part de femmes parmi les collaborateurs varie nettement selon les groupes politiques et les chambres. DataParl’ mesure ce taux pour chaque équipe et chaque groupe : le seul suivi public et continu de la mixité des cabinets parlementaires.",
    href: "/questions/mixite-des-equipes",
  },
  {
    q: "Combien de temps reste-t-on collaborateur parlementaire ?",
    a: "Le renouvellement des équipes est suivi mois par mois : chaque mois des collaborateurs arrivent et départent. Le taux de renouvellement sur 12 mois varie fortement selon les chambres et les groupes politiques.",
    href: "/questions/turnover-des-equipes",
  },
  {
    q: "Où trouver la liste complète des collaborateurs en poste ?",
    a: "Sur la page liste de référence de DataParl’ : tous les collaborateurs en poste, toutes chambres confondues, avec l’élu employeur et la fonction, d’après les listes officielles mises à jour quotidiennement.",
    href: "/collab/liste",
  },
  {
    q: "Comment retrouver l’équipe d’un élu en particulier ?",
    a: "Chaque fiche de parlementaire de DataParl’ affiche son équipe actuelle, l’historique complet de ses collaborateurs et les mouvements de son cabinet.",
    href: "/parlementaires",
  },
];

export default function FAQ() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: QUESTIONS.map((x) => ({
      "@type": "Question", name: x.q,
      acceptedAnswer: { "@type": "Answer", text: x.a },
    })),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <h1>Questions <span className="surligne">fréquentes</span></h1>
      <p className="lead">
        Les réponses courtes aux questions les plus posées sur les collaborateurs parlementaires, avec pour chacune la page de détail et les chiffres officiels.
      </p>
      <ul className="organes">
        {QUESTIONS.map((x) => (
          <li key={x.href}>
            <a href={x.href}>{x.q}</a>
            <span className="meta"> {x.a}</span>
          </li>
        ))}
      </ul>
      <p className="meta">Une autre question&nbsp;? Consultez le <a href="/contact">formulaire de contact</a> ou <a href="/questions">toutes les questions détaillées</a>.</p>
    </>
  );
}
