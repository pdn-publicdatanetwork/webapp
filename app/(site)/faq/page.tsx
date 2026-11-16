import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Questions fréquentes sur les collaborateurs parlementaires",
  description: "Qui sont les collaborateurs des députés et sénateurs, combien sont-ils, comment retrouver une équipe : les réponses, avec les chiffres officiels.",
  alternates: { canonical: "/faq" },
};

const QUESTIONS: { q: string; a: string; href: string }[] = [
  {
    q: "Qui sont les collaborateurs parlementaires ?",
    a: "Les collaborateurs parlementaires sont les personnes employ\u00e9es par chaque d\u00e9put\u00e9, s\u00e9nateur ou eurod\u00e9put\u00e9 fran\u00e7ais pour l\u2019aider dans son travail : suivi des dossiers, r\u00e9daction, relations avec les \u00e9lecteurs et les administrations. Leurs noms figurent sur les listes officielles publi\u00e9es par l\u2019Assembl\u00e9e nationale, le S\u00e9nat et le Parlement europ\u00e9en.",
    href: "/questions/qui-sont-les-collaborateurs-parlementaires",
  },
  {
    q: "Combien de collaborateurs a un d\u00e9put\u00e9 ou un s\u00e9nateur ?",
    a: "En g\u00e9n\u00e9ral entre un et cinq collaborateurs par parlementaire, r\u00e9partis entre Paris et la circonscription, selon l\u2019enveloppe de cr\u00e9dits dont dispose chaque \u00e9lu. Les effectifs exacts, \u00e9quipe par \u00e9quipe, sont suivis en continu par DataParl\u2019.",
    href: "/questions/combien-de-collaborateurs",
  },
  {
    q: "Quelle est la mixit\u00e9 des \u00e9quipes parlementaires ?",
    a: "La part de femmes parmi les collaborateurs varie nettement selon les groupes politiques et les chambres. DataParl\u2019 mesure ce taux pour chaque \u00e9quipe et chaque groupe : le seul suivi public et continu de la mixit\u00e9 des cabinets parlementaires.",
    href: "/questions/mixite-des-equipes",
  },
  {
    q: "Combien de temps reste-t-on collaborateur parlementaire ?",
    a: "Le renouvellement des \u00e9quipes est suivi mois par mois : chaque mois des collaborateurs arrivent et d\u00e9partent. Le taux de renouvellement sur 12 mois varie fortement selon les chambres et les groupes politiques.",
    href: "/questions/turnover-des-equipes",
  },
  {
    q: "O\u00f9 trouver la liste compl\u00e8te des collaborateurs en poste ?",
    a: "Sur la page liste de r\u00e9f\u00e9rence de DataParl\u2019 : tous les collaborateurs en poste, toutes chambres confondues, avec l\u2019\u00e9lu employeur et la fonction, d\u2019apr\u00e8s les listes officielles mises \u00e0 jour quotidiennement.",
    href: "/collab/liste",
  },
  {
    q: "Comment retrouver l\u2019\u00e9quipe d\u2019un \u00e9lu en particulier ?",
    a: "Chaque fiche de parlementaire de DataParl\u2019 affiche son \u00e9quipe actuelle, l\u2019historique complet de ses collaborateurs et les mouvements de son cabinet.",
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\u003c") }} />
      <h1>Questions <span className="surligne">fr\u00e9quentes</span></h1>
      <p className="lead">
        Les r\u00e9ponses courtes aux questions les plus pos\u00e9es sur les collaborateurs parlementaires, avec pour chacune la page de d\u00e9tail et les chiffres officiels.
      </p>
      <ul className="organes">
        {QUESTIONS.map((x) => (
          <li key={x.href}>
            <a href={x.href}>{x.q}</a>
            <span className="meta"> \u2014 {x.a}</span>
          </li>
        ))}
      </ul>
      <p className="meta">Une autre question&nbsp;? <a href="/contact">Formulaire de contact</a> \u00b7 <a href="/questions">Toutes les questions d\u00e9taill\u00e9es</a></p>
    </>
  );
}
