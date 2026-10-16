import type { Metadata } from "next";
import ListeMouvements from "../_components/ListeMouvements";
import RechercheGlobale from "../_components/RechercheGlobale";
import { compteAffectations, dataQuery, derniersMouvements, type Mouvement } from "@/lib/data";

async function compteFiches(): Promise<number> {
  const { total } = await dataQuery<unknown>("collaborateurs", new URLSearchParams({ select: "collab_id", limit: "1" }), 3600);
  return total ?? 0;
}

export const revalidate = 300;
export const metadata: Metadata = { alternates: { canonical: "/" } };

// Données structurées schema.org (SEO et réponses des assistants IA) :
// le site avec sa recherche interne, et l'organisation éditrice.
// Un objet par balise ld+json, jamais de tableau en racine : certains lecteurs
// tiers font r["@context"].toLowerCase() sur le premier script parsé et plantent
// sur un tableau (alerte TypeError, Safari 26.6).
const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "DataParl'",
    url: "https://www.dataparl.fr",
    description: "Collaborateurs parlementaires, mouvements d'équipes et indicateurs pour l'Assemblée nationale, le Sénat et le Parlement européen.",
    inLanguage: "fr-FR",
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: "https://www.dataparl.fr/search?q={search_term_string}" },
      "query-input": "required name=search_term_string",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "DataParl'",
    url: "https://www.dataparl.fr",
    logo: "https://www.dataparl.fr/icon.svg",
    description: "Projet civique de suivi des collaborateurs parlementaires français, d'après les publications officielles.",
    contactPoint: { "@type": "ContactPoint", contactType: "customer support", url: "https://www.dataparl.fr/contact" },
  },
];

export default async function Accueil() {
  let mouvements: Mouvement[] = [];
  let comptes: Record<string, number> = {};
  let fiches = 0;
  let indisponible = false;
  try {
    [mouvements, comptes, fiches] = await Promise.all([derniersMouvements(10), compteAffectations(), compteFiches().catch(() => 0)]);
  } ca
tch {
    indisponible = true;
  }
  const peInconnu = (comptes.europarl ?? 0) === 0; // suivi PE repris le 8 octobre 2026

  return (
    <>
{jsonLd.map((j, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(j).replace(/</g, "\u003c") }} />
      ))}
      <h1>Qui travaille pour <span className="surligne">vos élus</span> ?</h1>
      <p className="lead">
        Chaque matin, DataParl&apos; relit les listes officielles des collaborateurs parlementaires et signale
        les arrivées, les départs et les transferts. Parce que les mouvements des équipes en disent
        souvent plus long que les déclarations.
      </p>

      <RechercheGlobale placeholder="Rechercher un élu ou un collaborateur" />

      <div className="chiffres">
        <div className="principal"><strong>{((comptes.assemblee ?? 0) + (comptes.senat ?? 0) + (comptes.europarl ?? 0)).toLocaleString("fr-FR")}</strong><span>collaborateurs parlementaires aujourd&apos;hui</span></div>
        <div><strong>{(comptes.assemblee ?? 0).toLocaleString("fr-FR")}</strong><span>à l&apos;Assemblée</span></div>
        <div><strong>{(comptes.senat ?? 0).toLocaleString("fr-FR")}</strong><span>au Sénat</span></div>
        {peInconnu ? (
          <div><strong>–</strong><span>au Parlement européen (suivi repris le 8 octobre 2026)</span></div>
        ) : (
          <div><strong>{(comptes.europarl ?? 0).toLocaleString("fr-FR")}</strong><span>au Parlement européen</span></div>
        )}
        {fiches > 0 && <div><strong>{fiches.toLocaleString("fr-FR")}</strong><span>parcours reconstitués depuis 2015</span></div>}
      </div>
      <p className="meta" style={{ marginTop: -8 }}>
        L&apos;effectif du Sénat tient compte du renouvellement partiel des sénatoriales 2026
        {peInconnu && " ; le suivi quotidien des équipes du Parlement européen a repris le 8 octobre 2026"}.
      </p>

      <h2>Les derniers mouvements</h2>
      {indisponible && <p className="erreur">Les données sont momentan
ément indisponibles.</p>}
      {!indisponible && mouvements.length === 0 && (
        <p className="meta">Aucun mouvement détecté depuis le démarrage du suivi quotidien. Les premiers apparaîtront ici dès le prochain passage.</p>
      )}
      <ListeMouvements mouvements={mouvements} />

      <div className="card" style={{ maxWidth: "none", marginTop: 28 }}>
        <p style={{ marginTop: 0 }}>
          <strong>Tout l&apos;historique depuis 2015</strong>, la recherche par collaborateur, élu, groupe ou date, et les
          alertes personnalisées : c&apos;est gratuit, il suffit d&apos;un compte.
        </p>
        <a className="btn" href="/mouvements">Voir plus</a>{" "}
        <a className="btn secondaire" href="/daily">Les mouvements du jour en une page →</a>
      </div>

      <h2>Explorer</h2>
      <ul className="sommaire">
        <li><a href="/mouvements/parlement"><strong>Mouvements</strong><span>Rechercher dans les trois chambres →</span></a></li>
        <li><a href="/collab"><strong>Collaborateurs</strong><span>Qui travaille pour quel élu, et comment le joindre →</span></a></li>
        <li><a href="/parlementaires"><strong>Parlementaires</strong><span>Chaque élu à l&apos;Assemblée, au Sénat ou au Parlement européen, son équipe, ses mandats et ses commissions →</span></a></li>
        <li><a href="/gouv"><strong>Gouvernement</strong><span>Qui gouverne, et les cabinets ministériels, d&apos;après le JORF →</span></a></li>
        <li><a href="/senatoriales2026"><strong>Sénatoriales 2026</strong><span>Les nouveaux sénateurs, département par département →</span></a></li>
        <li><a href="/vigiparl"><strong>Vigi<span className="surligne-vigi">Parl&apos;</span></strong><span>Le renouvellement des équipes, élu par élu →</span></a></li>
        <li><a href="/mixiparl"><strong>Mixi<span className="surligne-mixi">Parl&apos;</span></strong><span>La mixité femmes-hommes des équipes →</span></a></li>
        <li><a href="/alertes"><strong>Alertes</strong><sp
an>Être prévenu(e) des mouvements qui vous intéressent →</span></a></li>
      </ul>
    </>
  );
}
