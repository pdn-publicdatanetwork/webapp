import type { Metadata } from "next";
import RechercheGlobale from "@/app/_components/RechercheGlobale";
import Equipes from "./Equipes";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Liste des collaborateurs parlementaires (AN, Sénat, Parlement européen)",
  description: "La liste des collaborateurs parlementaires français : qui travaille pour quel député, sénateur ou député européen, aujourd'hui et depuis 2015, fiche par collaborateur, listes complètes par chambre, recherche par élu, parti ou groupe.",
  alternates: { canonical: "/collab" },
};

// FAQ éditoriale : ce sont les questions posées aux moteurs et aux assistants
// IA ; chaque réponse est autosuffisante et citable telle quelle.
const FAQ = [
  {
    q: "Qu'est-ce qu'un collaborateur parlementaire ?",
    r: "Un collaborateur parlementaire est une personne recrutée par un élu (député, sénateur ou député européen) pour l'assister dans son travail de parlementaire : suivi des dossiers, rédaction, rendez-vous et relations avec les citoyens. DataParl' publie la liste de ces collaborateurs, élu par élu, avec la fonction de chacun.",
  },
  {
    q: "Où trouver la liste des collaborateurs d'un élu ?",
    r: "La fiche de chaque élu (député, sénateur ou député européen) présente son équipe de collaborateurs en poste, et les listes complètes par chambre (Assemblée nationale, Sénat, Parlement européen) sont publiées avec l'élu employeur et la fonction de chaque collaborateur.",
  },
  {
    q: "Depuis quand DataParl' suit-il les collaborateurs parlementaires ?",
    r: "Les listes officielles de collaborateurs sont suivies quotidiennement, et l'historique reconstitué remonte à 2015 : arrivées, départs et transferts d'un élu à l'autre sont visibles mois par mois sur les pages « mouvements ».",
  },
];

export default function Collabs() {
  return (
    <>
      <h1>La liste des <span className="surligne">collaborateurs</span> parlementaires</h1>
      <p className="lead">Qui travaille pour quel élu (député de l&apos;Assemblée nationale, sénateur ou député européen), aujourd&apos;hui et depuis 2015. Retrouve la fiche d&apos;une personne, ou cherche par élu, parti, groupe ou chambre et exporte une équipe en un clic.</p>
      <p className="meta">Par chambre : <a href="/collab/an">liste des collaborateurs de l&apos;Assemblée nationale</a>, <a href="/collab/senat">liste des collaborateurs du Sénat</a>, <a href="/collab/pe">liste des collaborateurs du Parlement européen</a>, <a href="/collab/liste">liste complète, toutes chambres</a></p>
      <RechercheGlobale placeholder="Nom d'un collaborateur ou d'un élu" />
      <h2>Les équipes</h2>
      <Equipes />
      <h2 id="faq">Questions fréquentes</h2>
      <dl>
        {FAQ.map((f) => (
          <div key={f.q}>
            <dt><strong>{f.q}</strong></dt>
            <dd>{f.r}</dd>
          </div>
        ))}
      </dl>
      <p className="meta">Définitions détaillées : <a href="/lexique">le lexique des collaborateurs parlementaires</a>.</p>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Dataset",
                name: "Collaborateurs parlementaires français",
                description: "Liste des collaborateurs parlementaires des élus français (Assemblée nationale, Sénat, Parlement européen), en poste et historisée depuis 2015, avec l'élu employeur et la fonction.",
                url: "https://www.dataparl.fr/collab",
                creator: { "@type": "Organization", name: "DataParl'", url: "https://www.dataparl.fr" },
                isAccessibleForFree: true,
              },
              {
                "@type": "FAQPage",
                mainEntity: FAQ.map((f) => ({
                  "@type": "Question",
                  name: f.q,
                  acceptedAnswer: { "@type": "Answer", text: f.r },
                })),
              },
              {
                "@type": "BreadcrumbList",
                itemListElement: [
                  { "@type": "ListItem", position: 1, name: "Accueil", item: "https://www.dataparl.fr/" },
                  { "@type": "ListItem", position: 2, name: "Collaborateurs", item: "https://www.dataparl.fr/collab" },
                ],
              },
            ],
          }),
        }}
      />
    </>
  );
}
