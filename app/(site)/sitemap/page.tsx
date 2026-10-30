import type { Metadata } from "next";
import { cheminsInactifs } from "@/lib/pagesEtat";
import { estInactif } from "@/lib/pagesRegistre";

export const revalidate = 86400;
export const metadata: Metadata = { title: "Plan du site", alternates: { canonical: "/sitemap" } };

type Lien = { href: string; libelle: string; externe?: boolean };
type Section = { titre: string; liens: Lien[] };

// Plan du site lisible : toutes les pages publiques, groupées par thème.
// Les pages désactivées dans l'admin n'apparaissent pas.
export default async function PlanDuSite() {
  const inactifs = await cheminsInactifs().catch(() => [] as string[]);
  const actif = (href: string) => !estInactif(href, inactifs);

  const sections: Section[] = [
    {
      titre: "Les données",
      liens: [
        { href: "/mouvements", libelle: "Mouvements (parlement, Assemblée, Sénat, Parlement européen)" },
        { href: "/daily", libelle: "DataParl' Daily : jour par jour" },
        { href: "/an", libelle: "Assemblée nationale" },
        { href: "/senat", libelle: "Sénat" },
        { href: "/pe", libelle: "Parlement européen" },
        { href: "/collab", libelle: "Collaborateurs parlementaires" },
        { href: "/collab/liste", libelle: "La liste complète : tous les collaborateurs en poste" },
        { href: "/collab/parti", libelle: "Collaborateurs : par parti politique" },
        { href: "/collab/an/trombinoscope", libelle: "Trombinoscope : collaborateurs de député" },
        { href: "/collab/senat/trombinoscope", libelle: "Trombinoscope : collaborateurs de sénateur" },
        { href: "/collab/pe/trombinoscope", libelle: "Trombinoscope : collaborateurs de député européen" },
        { href: "/collab/pe/tiers-payants", libelle: "Tiers payants : le Parlement européen" },
        { href: "/collab/pe/prestataires", libelle: "Prestataires de services : le Parlement européen" },
        { href: "/collab/pe/reseau", libelle: "Le réseau des collaborateurs : carte du Parlement européen" },
        { href: "/gouv", libelle: "Gouvernements : les ministres et leurs cabinets" },
        { href: "/lexique", libelle: "Lexique des collaborateurs parlementaires" },
        { href: "/parlementaires", libelle: "Parlementaires" },
        { href: "/parlementaires/map", libelle: "Carte des permanences parlementaires" },
        { href: "/groupe", libelle: "Groupes parlementaires" },
        { href: "/departement", libelle: "Départements" },
        { href: "/parti", libelle: "Partis politiques" },
        { href: "/senatoriales2026", libelle: "Sénatoriales 2026" },
      ],
    },
    {
      titre: "Les indicateurs",
      liens: [
        { href: "/vigiparl", libelle: "VigiParl' : renouvellement des équipes" },
        { href: "/vigiparl/methode", libelle: "VigiParl' : méthode" },
        { href: "/vigiparl/timeline", libelle: "VigiParl' : année par année" },
        { href: "/mixiparl", libelle: "MixiParl' : mixité du Parlement" },
        { href: "/mixiparl/methode", libelle: "MixiParl' : méthode" },
        { href: "/mixiparl/timeline", libelle: "MixiParl' : année par année" },
        { href: "/alertes", libelle: "Alertes par email" },
      ],
    },
    {
      titre: "Comprendre DataParl'",
      liens: [
        { href: "/methode", libelle: "Méthode" },
        { href: "/methode/sources", libelle: "Sources" },
        { href: "/a-propos", libelle: "À propos" },
        { href: "/presse", libelle: "Presse & médias" },
        { href: "/presse/communiques", libelle: "Communiqués de presse" },
        { href: "/faq", libelle: "Questions fréquentes" },
        { href: "/contact", libelle: "Contact" },
      ],
    },
    {
      titre: "Votre compte",
      liens: [
        { href: "/connexion", libelle: "Connexion" },
        { href: "/mon-compte", libelle: "Mon compte" },
      ],
    },
    {
      titre: "Informations légales",
      liens: [
        { href: "/informations-legales", libelle: "Informations légales" },
        { href: "/informations-legales/mentions-legales", libelle: "Mentions légales" },
        { href: "/informations-legales/cgu", libelle: "Conditions générales d'utilisation" },
        { href: "/informations-legales/cgu-dataparl-sheets", libelle: "CGU DataParl' Sheets" },
        { href: "/informations-legales/cgu-api", libelle: "CGU API" },
        { href: "/informations-legales/confidentialite", libelle: "Confidentialité" },
        { href: "/informations-legales/cookies", libelle: "Cookies" },
        { href: "/informations-legales/licences", libelle: "Licences des données" },
      ],
    },
    {
      titre: "Autres services DataParl'",
      liens: [
        { href: "https://media.dataparl.fr/sheets", libelle: "DataParl' Sheets : le tableur", externe: true },
        { href: "https://api.dataparl.fr", libelle: "L'API DataParl'", externe: true },
        { href: "/sitemap.xml", libelle: "Plan du site pour les moteurs (XML)" },
      ],
    },
  ];

  return (
    <>
      <h1>Plan du <span className="surligne">site</span></h1>
      <p className="lead">Toutes les pages de DataParl&apos;, sur <strong>un seul écran</strong>.</p>
      <div className="plan-site">
        {sections.map((s) => {
          const liens = s.liens.filter((l) => l.externe || actif(l.href));
          if (liens.length === 0) return null;
          return (
            <section key={s.titre}>
              <h2>{s.titre}</h2>
              <ul>
                {liens.map((l) => {
                  // Le mot-clé de la page en gras, le descriptif à sa suite.
                  const [principal, ...reste] = l.libelle.split(" : ");
                  return (
                    <li key={l.href}>
                      <a href={l.href}>
                        <strong>{principal}</strong>
                        {reste.length > 0 ? ` : ${reste.join(" : ")}` : ""}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
