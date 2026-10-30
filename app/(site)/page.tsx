import type { Metadata } from "next";
import ListeMouvements from "../_components/ListeMouvements";
import { compteAffectations, derniersMouvements, type Mouvement } from "@/lib/data";

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

// Petites icônes de trait (style Feather), inline pour rester sans dépendance.
function Ic({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: d }} />
  );
}
const IC_UTILISATEURS = '<path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>';
const IC_MOUVEMENTS = '<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>';
const IC_GOUVERNEMENT = '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>';
const IC_SENATORIALES = '<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>';
const IC_ALERTES = '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>';
const IC_ENVELOPPE = '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>';

export default async function Accueil() {
  let mouvements: Mouvement[] = [];
  let comptes: Record<string, number> = {};
  let indisponible = false;
  try {
    [mouvements, comptes] = await Promise.all([derniersMouvements(5), compteAffectations()]);
  } catch {
    indisponible = true;
  }
  const peInconnu = (comptes.europarl ?? 0) === 0; // suivi PE repris le 8 octobre 2026
  const total = (comptes.assemblee ?? 0) + (comptes.senat ?? 0) + (comptes.europarl ?? 0);
  const fr = (n: number) => n.toLocaleString("fr-FR");

  // Chiffres clés : logos officiels des trois institutions (public/logos/),
  // icône simple pour les collaborateurs suivis.
  const chiffres: { icone?: string; logo?: string; alt?: string; valeur: string; libelle: string }[] = [
    { icone: IC_UTILISATEURS, valeur: fr(total), libelle: "collaborateurs suivis" },
    { logo: "/logos/assemblee-nationale.svg", alt: "Assemblée nationale", valeur: fr(comptes.assemblee ?? 0), libelle: "à l'Assemblée nationale" },
    { logo: "/logos/senat.svg", alt: "Sénat", valeur: fr(comptes.senat ?? 0), libelle: "au Sénat" },
    peInconnu
      ? { logo: "/logos/parlement-europeen.svg", alt: "Parlement européen", valeur: "–", libelle: "au Parlement européen (suivi repris le 8 octobre 2026)" }
      : { logo: "/logos/parlement-europeen.svg", alt: "Parlement européen", valeur: fr(comptes.europarl ?? 0), libelle: "au Parlement européen" },
  ];

  const explorer: { href: string; icone?: string; marque?: "vigi" | "mixi"; titre?: string; desc: string }[] = [
    { href: "/mouvements/parlement", icone: IC_MOUVEMENTS, titre: "Mouvements", desc: "Suivez les arrivées et départs en temps réel." },
    { href: "/collab", icone: IC_UTILISATEURS, titre: "Collaborateurs", desc: "Explorez les profils et parcours des collaborateurs." },
    { href: "/parlementaires", icone: IC_UTILISATEURS, titre: "Parlementaires", desc: "Découvrez les équipes et collaborateurs des élu·es." },
    { href: "/gouv", icone: IC_GOUVERNEMENT, titre: "Gouvernement", desc: "Les cabinets ministériels et leurs collaborateurs." },
    { href: "/vigiparl", marque: "vigi", desc: "Le renouvellement des équipes, élu par élu." },
    { href: "/mixiparl", marque: "mixi", desc: "Analysez la mixité et la parité des équipes." },
    { href: "/senatoriales2026", icone: IC_SENATORIALES, titre: "Sénatoriales 2026", desc: "Préparez et suivez le renouvellement du Sénat." },
    { href: "/alertes", icone: IC_ALERTES, titre: "Alertes", desc: "Gérez vos alertes email et notifications." },
  ];

  return (
    <>
      {jsonLd.map((j, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(j).replace(/</g, "\u003c") }} />
      ))}

      <section className="accueil-hero">
        <h1>Qui travaille pour <span className="surligne">vos élus</span> ?</h1>
        <p className="lead">
          Suivi chaque matin des mouvements des collaborateurs parlementaires, en France et en Europe.
        </p>
        <div className="chiffres hero">
          {chiffres.map((c, i) => (
            <div key={i}>
              {c.logo
                ? <img className="logo-org" src={c.logo} alt={c.alt ?? ""} height={30} loading="lazy" />
                : <span className="icone-chiffre"><Ic d={c.icone ?? ""} /></span>}
              <strong>{c.valeur}</strong>
              <span>{c.libelle}</span>
            </div>
          ))}
        </div>
        <p className="meta">
          L&apos;effectif du Sénat tient compte du renouvellement partiel des sénatoriales 2026
          {peInconnu && " ; le suivi quotidien des équipes du Parlement européen a repris le 8 octobre 2026"}.
        </p>
      </section>

      <h2>Derniers mouvements</h2>
      {indisponible && <p className="erreur">Les données sont momentanément indisponibles.</p>}
      {!indisponible && mouvements.length === 0 && (
        <p className="meta">Aucun mouvement détecté depuis le démarrage du suivi quotidien. Les premiers apparaîtront ici dès le prochain passage.</p>
      )}
      <div className="accueil-mouvements">
        <ListeMouvements mouvements={mouvements} />
      </div>
      <div className="actions-accueil">
        <a className="btn" href="/daily">Voir les mouvements du jour</a>
        <a className="btn secondaire" href="/mouvements">Voir l&apos;historique</a>
      </div>

      <div className="card accueil-alerte">
        <span className="icone-chiffre"><Ic d={IC_ENVELOPPE} /></span>
        <div>
          <strong>Recevoir les mouvements par email</strong>
          <p>Les derniers mouvements, chaque matin dans votre boîte. Gratuit, sans engagement et désinscriptible à tout moment.</p>
        </div>
        <a className="btn" href="/alertes">Configurer mon alerte</a>
      </div>

      <h2>Explorer</h2>
      <ul className="explorer">
        {explorer.map((e) => (
          <li key={e.href}>
            <a href={e.href}>
              {e.marque === "vigi" ? (
                <span className="marque-carte">Vigi<span className="surligne-vigi">Parl&apos;</span></span>
              ) : e.marque === "mixi" ? (
                <span className="marque-carte">Mixi<span className="surligne-mixi">Parl&apos;</span></span>
              ) : (
                <span className="icone-chiffre"><Ic d={e.icone ?? ""} /></span>
              )}
              {e.titre && <strong>{e.titre}</strong>}
              <span>{e.desc}</span>
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}
