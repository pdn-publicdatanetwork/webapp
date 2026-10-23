import type { Metadata } from "next";

export const metadata: Metadata = { title: "Informations légales" };

const RUBRIQUES = [
  {
    titre: "Cadre général",
    pages: [
      { href: "/informations-legales/mentions-legales", nom: "Mentions légales", desc: "Éditeur, hébergement, propriété intellectuelle" },
      { href: "/informations-legales/cgu", nom: "Conditions d'utilisation", desc: "Règles générales d'usage du service" },
      { href: "/informations-legales/cgu-api", nom: "Conditions d'utilisation de l'API", desc: "Clé, quotas, réutilisation des données" },
      { href: "/informations-legales/cgu-chat", nom: "CGU DataParl' Chat", desc: "Assistant conversationnel : accès, données, responsabilité" },
      { href: "/informations-legales/cgu-dataparl-sheets", nom: "CGU DataParl' Sheets", desc: "Conditions propres au tableur (media.dataparl.fr/sheets)" },
      { href: "/informations-legales/cgu-jobs", nom: "CGU DataParl' Jobs", desc: "Offres d'emploi parlementaires, candidatures" },
    ],
  },
  {
    titre: "Données et confidentialité",
    pages: [
      { href: "/informations-legales/confidentialite", nom: "Données personnelles", desc: "Données traitées, finalités, droits RGPD" },
      { href: "/informations-legales/cookies", nom: "Cookies", desc: "Ce qui est stocké sur l'appareil, et pourquoi" },
    ],
  },
  {
    titre: "Données et licences",
    pages: [
      { href: "/informations-legales/licences", nom: "Licences et réutilisation", desc: "Sources officielles, open data, conditions de réutilisation" },
    ],
  },
  {
    titre: "Sécurité",
    pages: [
      { href: "/informations-legales/phishing", nom: "Phishing", desc: "Reconnaître un courriel frauduleux, vérifier expéditeur et liens" },
    ],
  },
];

export default function InformationsLegales() {
  return (
    <>
      <h1>Informations <span className="surligne">légales</span></h1>
      <p className="lead">Tout ce qui encadre DataParl&apos; : qui l&apos;édite, comment l&apos;utiliser, ce que nous faisons des données.</p>
      {RUBRIQUES.map((r) => (
        <section key={r.titre}>
          <p className="rubrique">{r.titre}</p>
          <ul className="sommaire">
            {r.pages.map((p) => (
              <li key={p.href}>
                <a href={p.href}><strong>{p.nom}</strong><span>{p.desc} →</span></a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
