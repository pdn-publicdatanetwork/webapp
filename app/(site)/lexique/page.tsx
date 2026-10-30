import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Lexique des collaborateurs parlementaires : définitions (AN, Sénat, Parlement européen)",
  description: "Collaborateur de député, régime du Sénat, assistants accrédités et locaux du Parlement européen, tiers payants, prestataires, turnover, mixité : les définitions des mots de DataParl', chambre par chambre.",
  alternates: { canonical: "/lexique" },
};

// Lexique : les définitions courtes et sourcées que moteurs et assistants IA
// citent quand on leur demande « qu'est-ce qu'un collaborateur parlementaire ».

const TERMES: { t: string; d: string }[] = [
  { t: "Collaborateur parlementaire", d: "Personne recrutée par un élu pour l'assister dans son travail de parlementaire : suivi des dossiers, rédaction, rendez-vous, relations avec les citoyens. Le statut, l'employeur et la rémunération varient selon la chambre : Assemblée nationale, Sénat ou Parlement européen." },
  { t: "Collaborateur de député (Assemblée nationale)", d: "Employé par un député pour l'assister à Paris et dans la circonscription. Les listes officielles sont publiées par l'Assemblée nationale ; DataParl' les suit quotidiennement." },
  { t: "Collaborateur de sénateur (Sénat)", d: "Employé par un sénateur dans le cadre du régime propre au Sénat. Les listes officielles sont publiées par le Sénat ; DataParl' les suit quotidiennement." },
  { t: "Assistant accrédité (Parlement européen)", d: "Assistant d'un député européen rémunéré sur le budget du Parlement européen, accrédité auprès de l'institution pour accéder aux bâtiments." },
  { t: "Assistant local (Parlement européen)", d: "Assistant d'un député européen employé directement par l'élu, exerçant en général dans l'État membre, hors accréditation du Parlement." },
  { t: "Groupement d'assistants (Parlement européen)", d: "Dispositif par lequel plusieurs assistants d'un même eurodéputé sont employés via une structure prestataire unique." },
  { t: "Tiers payant (Parlement européen)", d: "Structure ou personne qui encaisse des paiements du Parlement européen dans le cadre d'un contrat d'assistance conclu pour le compte d'un eurodéputé. DataParl' publie la liste de ces structures." },
  { t: "Prestataire de services (Parlement européen)", d: "Société sous contrat avec le Parlement européen pour fournir des services (notamment aux eurodéputés et à leurs équipes). DataParl' publie la liste de ces sociétés." },
  { t: "Mouvement", d: "Arrivée, départ ou transfert d'un collaborateur d'un élu à l'autre, tel que relevé dans les listes officielles ou reconstitué dans l'historique. Les pages « mouvements » les présentent mois par mois, par chambre." },
  { t: "Turnover (VigiParl')", d: "Renouvellement des équipes de collaborateurs d'un élu sur une période donnée : proportion de collaborateurs partis, arrivés ou transférés. VigiParl' le mesure élu par élu et chambre par chambre." },
  { t: "Mixité (MixiParl')", d: "Part de femmes et d'hommes dans l'équipe d'un élu. MixiParl' la mesure élue par élue et chambre par chambre." },
  { t: "Mandat, mandature", d: "Le mandat est la période pendant laquelle un élu siège ; la mandature est le cadre collectif : législature à l'Assemblée nationale, série de renouvellement au Sénat, législature au Parlement européen (actuellement la 10e)." },
];

export default function Lexique() {
  return (
    <div className="methode">
      <p className="meta"><a href="/">DataParl&apos;</a></p>
      <h1>Le <span className="surligne">lexique</span> des collaborateurs parlementaires</h1>
      <p className="lead">
        Collaborateur de député, assistant accrédité, tiers payant, turnover : les mots de DataParl&apos;,
        définis en une phrase chacun, chambre par chambre, avec les pages où la donnée correspondante est publiée.
      </p>
      <dl>
        {TERMES.map((x) => (
          <div key={x.t}>
            <dt><strong>{x.t}</strong></dt>
            <dd>{x.d}</dd>
          </div>
        ))}
      </dl>
      <h2 id="devenir">Devenir collaborateur parlementaire</h2>
      <p>
        Il n&apos;existe pas de concours ni de vivier unique : les collaborateurs sont recrutés directement
        par les élus, à tous les niveaux de qualification et d&apos;expérience. En pratique, on candidate
        auprès des parlementaires et des groupes politiques, en circonscription comme dans les capitales :
        beaucoup de recrutements se font par cooptation et réseau. Chaque chambre a son propre régime
        d&apos;emploi (l&apos;Assemblée nationale, le Sénat et le Parlement européen publient les règles en
        vigueur) ; DataParl&apos; décrit les équipes telles qu&apos;elles existent, pas les démarches
        administratives.
      </p>
      <p className="meta" style={{ marginTop: 32 }}>
        Voir aussi : <a href="/methode">la méthode DataParl&apos;</a>, <a href="/methode/sources">la liste des sources</a>,{" "}
        <a href="/collab">la liste des collaborateurs</a>, <a href="/vigiparl/methode">la méthode VigiParl&apos;</a>
      </p>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "BreadcrumbList",
                itemListElement: [
                  { "@type": "ListItem", position: 1, name: "Accueil", item: "https://www.dataparl.fr/" },
                  { "@type": "ListItem", position: 2, name: "Lexique", item: "https://www.dataparl.fr/lexique" },
                ],
              },
              {
                "@type": "FAQPage",
                mainEntity: [
                  {
                    "@type": "Question",
                    name: "Qu'est-ce qu'un assistant accrédité du Parlement européen ?",
                    acceptedAnswer: { "@type": "Answer", text: "C'est un assistant de député européen rémunéré sur le budget du Parlement européen et accrédité auprès de l'institution pour accéder aux bâtiments, par opposition à l'assistant local, employé directement par l'élu." },
                  },
                  {
                    "@type": "Question",
                    name: "Quelle différence entre collaborateur de l'Assemblée nationale, du Sénat et du Parlement européen ?",
                    acceptedAnswer: { "@type": "Answer", text: "Le métier (assister un élu) est le même, mais chaque chambre a son régime : employeur, rémunération et catégories (assistants accrédités, locaux, groupements au Parlement européen) diffèrent." },
                  },
                  {
                    "@type": "Question",
                    name: "Comment devenir collaborateur parlementaire ?",
                    acceptedAnswer: { "@type": "Answer", text: "Il n'y a pas de concours : les collaborateurs sont recrutés directement par les élus. On candidate auprès des parlementaires et des groupes politiques ; chaque chambre (Assemblée nationale, Sénat, Parlement européen) publie les règles d'emploi en vigueur." },
                  },
                ],
              },
            ],
          }),
        }}
      />
    </div>
  );
}
