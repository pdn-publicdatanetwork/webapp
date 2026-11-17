import type { Metadata } from "next";
import { CONTACT_URL } from "./maj";

export const metadata: Metadata = { title: "Centre légal" };

// Date de la dernière passe d'ensemble sur les textes légaux : à mettre à
// jour quand une page fille évolue de façon notable.
const MAJ = "17 novembre 2026";

const PROMESSES = [
  { texte: "Sans pistage", couleur: "jaune" },
  { texte: "Sources institutionnelles officielles", couleur: "bleu" },
  { texte: "Conformité RGPD", couleur: "corail" },
];

type DocumentLegal = { href: string; nom: string; resume: string };

type Rubrique = {
  titre: string;
  quand: string;
  documents: DocumentLegal[];
  monEspace?: boolean;
};

const RUBRIQUES: Rubrique[] = [
  {
    titre: "Utilisation du service",
    quand:
      "Avant de créer un compte ou d'utiliser le site, prenez connaissance des règles d'usage et des données que nous traitons.",
    monEspace: true,
    documents: [
      {
        href: "/informations-legales/cgu",
        nom: "Conditions d'utilisation",
        resume: "Règles d'accès, droits et devoirs lors de la navigation sur les plateformes DataParl'.",
      },
      {
        href: "/informations-legales/confidentialite",
        nom: "Données personnelles",
        resume: "Données traitées, finalités, durées de conservation et exercice de vos droits.",
      },
      {
        href: "/informations-legales/cookies",
        nom: "Cookies",
        resume: "Stockages techniques strictement nécessaires au fonctionnement du site.",
      },
    ],
  },
  {
    titre: "Emploi et recrutement",
    quand:
      "Vous candidatez ou vous publiez une offre d'emploi parlementaire : lisez les conditions propres à l'espace Jobs.",
    documents: [
      {
        href: "/informations-legales/cgu-jobs",
        nom: "CGU DataParl' Jobs",
        resume: "Publication des offres, gestion des candidatures et engagements des recruteurs partenaires.",
      },
    ],
  },
  {
    titre: "Sources et mentions",
    quand:
      "DataParl' ne produit aucune donnée : il recense des informations publiques et indique comment les réutiliser.",
    documents: [
      {
        href: "/informations-legales/licences",
        nom: "Licences et réutilisation",
        resume: "Origine des données publiques parlementaires et conditions de réutilisation open data.",
      },
      {
        href: "/informations-legales/mentions-legales",
        nom: "Mentions légales",
        resume: "Éditeur, hébergement technique et propriété intellectuelle.",
      },
    ],
  },
  {
    titre: "Sécurité et prévention",
    quand: "Apprenez à reconnaître une communication officielle DataParl' et à signaler une usurpation.",
    documents: [
      {
        href: "/informations-legales/phishing",
        nom: "Alerte phishing",
        resume: "Identifier un courriel frauduleux, vérifier l'expéditeur et les liens.",
      },
    ],
  },
];

export default function CentreLegal() {
  return (
    <>
      <h1>
        Centre <span className="surligne">légal</span>
      </h1>
      <p className="lead">
        Transparence, clarté et protection de vos données sont au cœur de notre service. Retrouvez ici
        l&apos;ensemble des conditions et informations juridiques régissant l&apos;écosystème DataParl&apos;.
      </p>
      <div className="cl-badges">
        {PROMESSES.map((p) => (
          <span key={p.texte} className={`cl-badge ${p.couleur}`}>
            {p.texte}
          </span>
        ))}
      </div>
      <p className="meta">Dernière mise à jour générale des documents : {MAJ}.</p>

      {RUBRIQUES.map((r) => (
        <details key={r.titre} className="cl-rubrique" open={r.titre === "Utilisation du service"}>
          <summary>
            <h2>{r.titre}</h2>
            <span className="cl-plus" aria-hidden="true" />
          </summary>
          <div className="cl-corps">
            <p className="cl-quand">{r.quand}</p>
            <div className="cl-docs">
              {r.documents.map((d) => (
                <a key={d.href} className="cl-doc" href={d.href}>
                  <strong>{d.nom}</strong>
                  <span className="cl-resume">{d.resume}</span>
                  <span className="cl-fleche" aria-hidden="true">
                    →
                  </span>
                </a>
              ))}
            </div>
            {r.monEspace && (
              <p className="cl-acces">
                <strong>Vos données, vos droits :</strong>{" "}
                consultez, corrigez ou supprimez vos informations depuis <a href="/mon-compte">Mon espace →</a>
              </p>
            )}
          </div>
        </details>
      ))}

      <div className="cl-bande">
        <div>
          <h3>Une question juridique ou besoin d&apos;assistance ?</h3>
          <p>
            Pour toute question relative à l&apos;exercice de vos droits informatiques et libertés ou pour
            toute précision sur nos conditions, notre équipe vous répond.
          </p>
        </div>
        <a className="cl-cta" href={CONTACT_URL}>
          Contactez-nous
        </a>
      </div>
    </>
  );
}
