import type { Metadata } from "next";
import { compteAffectations, derniersMouvements } from "@/lib/data";
import type { MouvementAffiche } from "@/lib/format";
import LigneMouvement from "../_components/LigneMouvement";
import { Ic, IC_ALERTES, IC_ENVELOPPE, IC_GOUVERNEMENT, IC_MOUVEMENTS, IC_PARLEMENTAIRES, IC_SENATORIALES, IC_UTILISATEURS } from "../_components/icones";

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
    description: "Projet civique de suivi des collaborateurs parlementaires français, d'après les publicatiexport default async function Accueil() {
  let mouvements: MouvementAffiche[] = [];
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
  // Les cartes des trois institutions pointent vers leurs pages chambre (routes
  // canoniques /an, /senat, /pe : les autres graphies sont des redirections).
  const chiffres: { icone?: string; logo?: string; alt?: string; href?: string; valeur: string; libelle: string }[] = [
    { icone: IC_UTILISATEURS, valeur: fr(total), libelle: "collaborateurs suivis" },
    { href: "/an", logo: "/logos/assemblee-nationale.svg", alt: "Assemblée nationale", valeur: fr(comptes.assemblee ?? 0), libelle: "à l'Assemblée nationale" },
    { href: "/senat", logo: "/logos/senat.svg", alt: "Sénat", valeur: fr(comptes.senat ?? 0), libelle: "au Sénat" },
    peInconnu
      ? { href: "/pe", logo: "/logos/parlement-europeen.svg", alt: "Parlement européen", valeur: "–", libelle: "au Parlement européen (suivi repris le 8 octobre 2026)" }
      : { href: "/pe", logo: "/logos/parlement-europeen.svg", alt: "Parlement européen", valeur: fr(comptes.europarl ?? 0), libelle: "au Parlement européen" },
  ];

  // Descriptions courtes et de longueur homogène (une ligne chacune).
  const explorer: { href: string; icone?: string; marque?: "vigi" | "mixi"; titre?: string; desc: string }[] = [
    { href: "/mouvements/parlement", icone: IC_MOUVEMENTS, titre: "Mouvements", desc: "Les arrivées et départs en temps réel." },
    { href: "/collab", icone: IC_UTILISATEURS, titre: "Collaborateurs", desc: "Les profils et parcours des collaborateurs." },
    { href: "/parlementaires", icone: IC_PARLEMENTAIRES, titre: "Parlementaires", desc: "Les équipes et collaborateurs des élu(e)s." },
    { href: "/gouv", icone: IC_GOUVERNEMENT, titre: "Gouvernement", desc: "Les cabinets ministériels et leurs collaborateurs." },
    { href: "/vigiparl", marque: "vigi", desc: "Le renouvellement des équipes, élu par élu." },
    { href: "/mixiparl", marque: "mixi", desc: "La mixité et la parité des équipes." },
    { href: "/senatoriales2026", icone: IC_SENATORIALES, titre: "Sénatoriales 2026", desc: "Suivez le renouvellement du Sénat 2026." },
    { href: "/alertes", icone: IC_ALERTES, titre: "Alertes", desc: "Vos alertes email et notifications." },
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
          {chiffres.map((c, i) => {
            const corps = (
              <>
                {c.logo
                  ? <img className="logo-org" src={c.logo} alt={c.alt ?? ""} height={32} loading="lazy" />
                  : <span className="icone-chiffre"><Ic d={c.icone ?? ""} /></span>}
                <strong>{c.valeur}</strong>
                <span>{c.libelle}</span>
              </>
            );
            return c.href
              ? <a key={i} className="chiffre-carte" href={c.href}>{corps}</a>
              : <div key={i} className="chiffre-carte">{corps}</div>;
          })}
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
      <ul className="mouvements-list">
        {mouvements.map((m) => <LigneMouvement key={m.id} m={m} />)}
      </ul>
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
